// import logger from "../utils/logger.js";

import pythonService from "./pythonService.js";

class SatelliteService {
  constructor() {
    this.sentinelHubToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    try {
      if (this.sentinelHubToken && this.tokenExpiry > Date.now()) {
        return this.sentinelHubToken;
      }

      const response = await fetch(
        "https://services.sentinel-hub.com/oauth/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: process.env.SENTINEL_HUB_CLIENT_ID,
            client_secret: process.env.SENTINEL_HUB_CLIENT_SECRET,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Sentinel Hub Token API Error: ${response.status} - ${errorText}`
        );
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();

      this.sentinelHubToken = data.access_token;
      this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000; // 1 minute buffer

      return this.sentinelHubToken;
    } catch (error) {
      console.error("Failed to get Sentinel Hub access token:", error);
      throw error;
    }
  }

  async analyzeSatelliteData(longitude, latitude) {
    try {
      // First try Python microservice
      try {
        const pyResp = await pythonService.callAIService("/satellite/ndvi", {
          longitude,
          latitude,
          days_back: 60,
        });

        if (pyResp && pyResp.ndviAnalysis) {
          return pyResp;
        }
      } catch (pyErr) {
        console.warn(
          "Python satellite service unavailable or failed:",
          pyErr.message || pyErr
        );
        // fallthrough to JS implementations
      }
      // Get current date and date from 30 days ago
      const currentDate = new Date();
      const pastDate = new Date(
        currentDate.getTime() - 60 * 24 * 60 * 60 * 1000
      );

      let analysisResult = null;

      // Try Sentinel Hub API first
      if (
        process.env.SENTINEL_HUB_CLIENT_ID &&
        process.env.SENTINEL_HUB_CLIENT_SECRET
      ) {
        try {
          analysisResult = await this.analyzeSentinelHubData(
            longitude,
            latitude,
            pastDate,
            currentDate
          );
        } catch (error) {
          console.error("Sentinel Hub analysis failed:", error.message);
        }
      }

      // Fallback to NASA APIs
      if (!analysisResult && process.env.NASA_API_KEY) {
        try {
          analysisResult = await this.analyzeNASAData(
            longitude,
            latitude,
            pastDate,
            currentDate
          );
        } catch (error) {
          console.error("NASA analysis failed:", error.message);
        }
      }

      // Fallback to Planet API
      if (!analysisResult && process.env.PLANET_API_KEY) {
        try {
          analysisResult = await this.analyzePlanetData(
            longitude,
            latitude,
            pastDate,
            currentDate
          );
        } catch (error) {
          console.error("Planet API analysis failed:", error.message);
        }
      }

      // If all APIs fail, return fallback analysis instead of throwing error
      if (!analysisResult) {
        console.warn(
          "All satellite APIs unavailable, returning fallback analysis"
        );
        return {
          ndviAnalysis: {
            beforeNDVI: null,
            afterNDVI: null,
            difference: null,
            changeDetected: false,
            satelliteSource: "unavailable",
            analysisDate: new Date(),
            error: "External satellite APIs unavailable",
          },
          vegetationLoss: {
            percentage: null,
            area: null,
            confirmed: false,
          },
          confidence: 0.0,
          dataSource: "fallback",
          lastUpdated: new Date(),
        };
      }

      return analysisResult;
    } catch (error) {
      console.error("Satellite analysis error:", error);
      // Return fallback data instead of throwing error
      return {
        ndviAnalysis: {
          beforeNDVI: null,
          afterNDVI: null,
          difference: null,
          changeDetected: false,
          satelliteSource: "error",
          analysisDate: new Date(),
          error: error.message,
        },
        vegetationLoss: {
          percentage: null,
          area: null,
          confirmed: false,
        },
        confidence: 0.0,
        dataSource: "error_fallback",
        lastUpdated: new Date(),
      };
    }
  }

  async analyzeSentinelHubData(longitude, latitude, pastDate, currentDate) {
    try {
      const token = await this.getAccessToken();

      // Get NDVI data for both time periods
      const pastNDVI = await this.getSentinelNDVI(
        longitude,
        latitude,
        pastDate,
        token
      );
      const currentNDVI = await this.getSentinelNDVI(
        longitude,
        latitude,
        currentDate,
        token
      );

      // Calculate NDVI difference
      const ndviDifference = pastNDVI.value - currentNDVI.value;
      const changeThreshold = parseFloat(
        process.env.NDVI_CHANGE_THRESHOLD || 0.2
      );
      const changeDetected = Math.abs(ndviDifference) > changeThreshold;

      // Estimate vegetation loss
      const vegetationLoss = this.calculateVegetationLoss(
        pastNDVI.value,
        currentNDVI.value
      );

      return {
        ndviAnalysis: {
          beforeNDVI: parseFloat(pastNDVI.value.toFixed(3)),
          afterNDVI: parseFloat(currentNDVI.value.toFixed(3)),
          difference: parseFloat(ndviDifference.toFixed(3)),
          changeDetected,
          satelliteSource: "sentinel-2",
          analysisDate: new Date(),
          confidence: Math.min(pastNDVI.confidence, currentNDVI.confidence),
          cloudCover: {
            past: pastNDVI.cloudCover,
            current: currentNDVI.cloudCover,
          },
        },
        vegetationLoss: {
          percentage: parseFloat(vegetationLoss.percentage.toFixed(2)),
          area: vegetationLoss.area,
          confirmed:
            vegetationLoss.percentage > 15 && vegetationLoss.confidence > 0.7,
          confidence: vegetationLoss.confidence,
        },
        metadata: {
          pastDate: pastDate.toISOString(),
          currentDate: currentDate.toISOString(),
          coordinates: [longitude, latitude],
          resolution: "10m", // Sentinel-2 resolution
          bands_used: ["B04", "B08"], // Red and NIR bands for NDVI
        },
      };
    } catch (error) {
      console.error("Sentinel Hub data analysis error:", error);
      throw error;
    }
  }

  async getSentinelNDVI(longitude, latitude, date, token) {
    try {
      // Check if we have valid environment variables
      if (
        !process.env.SENTINEL_HUB_CLIENT_ID ||
        !process.env.SENTINEL_HUB_CLIENT_SECRET
      ) {
        throw new Error("Sentinel Hub credentials not configured");
      }

      const bbox_size = 0.001; // ~100m around the point
      const bbox = [
        longitude - bbox_size,
        latitude - bbox_size,
        longitude + bbox_size,
        latitude + bbox_size,
      ];

      const evalscript = `
        //VERSION=3
        function setup() {
          return {
            input: ["B04", "B08", "CLM"],
            output: { 
              bands: 1,
              // Use UINT16 so JSON responses are supported; encode NDVI scaled to avoid FLOAT32
              sampleType: "UINT16"
            }
          };
        }

        function evaluatePixel(sample) {
          // Calculate NDVI
          let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);

          // Return special nodata 65535 for cloudy pixels
          if (sample.CLM > 0.5) {
            return [65535];
          }

          // Scale NDVI from [-1,1] to [0,20000] so it fits into UINT16
          // stored = round((ndvi + 1.0) * 10000)
          const scaled = Math.round((ndvi + 1.0) * 10000.0);
          return [scaled];
        }
      `;

      const response = await fetch(
        "https://services.sentinel-hub.com/api/v1/process",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: {
              bounds: {
                properties: {
                  crs: "http://www.opengis.net/def/crs/EPSG/0/4326",
                },
                geometry: {
                  type: "Polygon",
                  coordinates: [
                    [
                      [bbox[0], bbox[1]],
                      [bbox[2], bbox[1]],
                      [bbox[2], bbox[3]],
                      [bbox[0], bbox[3]],
                      [bbox[0], bbox[1]],
                    ],
                  ],
                },
              },
              data: [
                {
                  type: "sentinel-2-l2a",
                  dataFilter: {
                    timeRange: {
                      from: this.formatDateForAPI(date, -3), // 3 days before
                      to: this.formatDateForAPI(date, 3), // 3 days after
                    },
                    maxCloudCoverage: 30,
                  },
                },
              ],
            },
            output: {
              width: 10,
              height: 10,
              responses: [
                {
                  identifier: "default",
                  format: {
                    type: "application/json",
                  },
                },
              ],
            },
            evalscript: evalscript,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Sentinel Hub API Error: ${response.status} - ${errorText}`
        );
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      // Process the response to get NDVI statistics
      const data = await response.json();

      // The actual response format from Sentinel Hub may be different
      // Let's handle both array and object responses
      let pixelValues = [];

      if (Array.isArray(data)) {
        pixelValues = data;
      } else if (data && data.bands && Array.isArray(data.bands[0])) {
        // If the response has a bands structure
        pixelValues = data.bands[0];
      } else if (data && Array.isArray(data.outputs)) {
        // If the response has outputs structure
        pixelValues = data.outputs[0]?.bands?.[0] || [];
      } else {
        console.error("Unexpected Sentinel Hub response format:", data);
        throw new Error("Unexpected response format from Sentinel Hub API");
      }

      const NODATA_VAL = 65535;
      const validPixels = pixelValues.filter(
        (pixel) => pixel !== NODATA_VAL && pixel !== null && !isNaN(pixel)
      );

      if (validPixels.length === 0) {
        throw new Error(
          "No valid (cloud-free) pixels found for the specified date and location"
        );
      }

      // Convert back from scaled UINT16 to float NDVI in [-1,1]
      const ndviValues = validPixels.map((v) => v / 10000.0 - 1.0);

      const averageNDVI =
        ndviValues.reduce((sum, val) => sum + val, 0) / ndviValues.length;
      const cloudCover =
        (pixelValues.length - validPixels.length) / pixelValues.length;
      const confidence = Math.max(0.1, 1 - cloudCover); // Lower confidence with more clouds

      return {
        value: averageNDVI,
        confidence,
        cloudCover,
        validPixels: validPixels.length,
        totalPixels: pixelValues.length,
      };
    } catch (error) {
      console.error("Sentinel NDVI retrieval error:", error);
      throw error;
    }
  }

  async analyzeNASAData(longitude, latitude, pastDate, currentDate) {
    try {
      const apiKey = process.env.NASA_API_KEY;

      // Use NASA's MODIS NDVI data
      const pastData = await this.getNASAMODISData(
        longitude,
        latitude,
        pastDate,
        apiKey
      );
      const currentData = await this.getNASAMODISData(
        longitude,
        latitude,
        currentDate,
        apiKey
      );

      const ndviDifference = pastData.ndvi - currentData.ndvi;
      const changeThreshold = parseFloat(
        process.env.NDVI_CHANGE_THRESHOLD || 0.2
      );
      const changeDetected = Math.abs(ndviDifference) > changeThreshold;

      const vegetationLoss = this.calculateVegetationLoss(
        pastData.ndvi,
        currentData.ndvi
      );

      return {
        ndviAnalysis: {
          beforeNDVI: parseFloat(pastData.ndvi.toFixed(3)),
          afterNDVI: parseFloat(currentData.ndvi.toFixed(3)),
          difference: parseFloat(ndviDifference.toFixed(3)),
          changeDetected,
          satelliteSource: "nasa-modis",
          analysisDate: new Date(),
          confidence: Math.min(pastData.confidence, currentData.confidence),
        },
        vegetationLoss: {
          percentage: parseFloat(vegetationLoss.percentage.toFixed(2)),
          area: vegetationLoss.area,
          confirmed: vegetationLoss.percentage > 15,
          confidence: vegetationLoss.confidence,
        },
        metadata: {
          pastDate: pastDate.toISOString(),
          currentDate: currentDate.toISOString(),
          coordinates: [longitude, latitude],
          resolution: "250m", // MODIS resolution
          sensor: "MODIS",
        },
      };
    } catch (error) {
      console.error("NASA data analysis error:", error);
      throw error;
    }
  }

  async getNASAMODISData(longitude, latitude, date, apiKey) {
    try {
      // NASA's MODIS/Terra Vegetation Indices API
      const url = new URL("https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset");
      url.searchParams.append("latitude", latitude);
      url.searchParams.append("longitude", longitude);
      url.searchParams.append("startDate", this.formatDateForNASA(date, -16)); // 16 days before (MODIS composites are 16-day)
      url.searchParams.append("endDate", this.formatDateForNASA(date, 16)); // 16 days after
      url.searchParams.append("kmAboveBelow", 1); // 1km radius (minimum allowed)
      url.searchParams.append("kmLeftRight", 1);

      let response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      // If NASA returns 400 with "No data available" try widening the temporal window and retry once
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`NASA MODIS API Error: ${response.status} - ${errorText}`);

        if (response.status === 400 && /No data available/i.test(errorText)) {
          console.log(
            "No MODIS data for requested window — retrying with a wider window (+/- 90 days)"
          );
          const widerStart = this.formatDateForNASA(date, -90);
          const widerEnd = this.formatDateForNASA(date, 90);
          const url2 = new URL(
            "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset"
          );
          url2.searchParams.append("latitude", latitude);
          url2.searchParams.append("longitude", longitude);
          url2.searchParams.append("startDate", widerStart);
          url2.searchParams.append("endDate", widerEnd);
          url2.searchParams.append("kmAboveBelow", 1);
          url2.searchParams.append("kmLeftRight", 1);

          response = await fetch(url2, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `NASA MODIS API Error: ${response.status} - ${errorText}`
        );
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();

      if (!data || !data.subset || data.subset.length === 0) {
        throw new Error(
          "No MODIS data available for the specified location and date"
        );
      }

      // Process MODIS NDVI data
      const ndviValues = data.subset
        .filter(
          (item) => item.band === "250m_16_days_NDVI" && item.value !== null
        )
        .map((item) => item.value / 10000); // MODIS NDVI values are scaled by 10000

      if (ndviValues.length === 0) {
        throw new Error("No valid NDVI values found in MODIS data");
      }

      const averageNDVI =
        ndviValues.reduce((sum, val) => sum + val, 0) / ndviValues.length;
      const confidence = Math.min(1, ndviValues.length / 5); // Higher confidence with more data points

      return {
        ndvi: averageNDVI,
        confidence,
        dataPoints: ndviValues.length,
      };
    } catch (error) {
      console.error("NASA MODIS data retrieval error:", error);
      throw error;
    }
  }

  async analyzePlanetData(longitude, latitude, pastDate, currentDate) {
    try {
      const apiKey = process.env.PLANET_API_KEY;

      // Search for Planet imagery
      const searchResults = await this.searchPlanetImagery(
        longitude,
        latitude,
        pastDate,
        currentDate,
        apiKey
      );

      if (searchResults.length < 2) {
        throw new Error("Insufficient Planet imagery found for comparison");
      }

      // Get NDVI for both time periods
      const pastImage = searchResults.find(
        (img) => new Date(img.properties.acquired) <= pastDate
      );
      const currentImage = searchResults.find(
        (img) => new Date(img.properties.acquired) >= currentDate
      );

      if (!pastImage || !currentImage) {
        throw new Error(
          "Could not find suitable Planet images for both time periods"
        );
      }

      const pastNDVI = await this.calculatePlanetNDVI(
        pastImage,
        longitude,
        latitude,
        apiKey
      );
      const currentNDVI = await this.calculatePlanetNDVI(
        currentImage,
        longitude,
        latitude,
        apiKey
      );

      const ndviDifference = pastNDVI.value - currentNDVI.value;
      const changeDetected = Math.abs(ndviDifference) > 0.2;
      const vegetationLoss = this.calculateVegetationLoss(
        pastNDVI.value,
        currentNDVI.value
      );

      return {
        ndviAnalysis: {
          beforeNDVI: parseFloat(pastNDVI.value.toFixed(3)),
          afterNDVI: parseFloat(currentNDVI.value.toFixed(3)),
          difference: parseFloat(ndviDifference.toFixed(3)),
          changeDetected,
          satelliteSource: "planet-labs",
          analysisDate: new Date(),
          confidence: Math.min(pastNDVI.confidence, currentNDVI.confidence),
        },
        vegetationLoss: {
          percentage: parseFloat(vegetationLoss.percentage.toFixed(2)),
          area: vegetationLoss.area,
          confirmed: vegetationLoss.percentage > 15,
          confidence: vegetationLoss.confidence,
        },
        metadata: {
          pastDate: pastImage.properties.acquired,
          currentDate: currentImage.properties.acquired,
          coordinates: [longitude, latitude],
          resolution: "3m", // Planet resolution
          sensor: "PlanetScope",
        },
      };
    } catch (error) {
      console.error("Planet data analysis error:", error);
      throw error;
    }
  }

  async searchPlanetImagery(longitude, latitude, startDate, endDate, apiKey) {
    try {
      const bbox_size = 0.01; // ~1km area
      const geometry = {
        type: "Polygon",
        coordinates: [
          [
            [longitude - bbox_size, latitude - bbox_size],
            [longitude + bbox_size, latitude - bbox_size],
            [longitude + bbox_size, latitude + bbox_size],
            [longitude - bbox_size, latitude + bbox_size],
            [longitude - bbox_size, latitude - bbox_size],
          ],
        ],
      };

      const searchFilter = {
        type: "AndFilter",
        config: [
          {
            type: "GeometryFilter",
            field_name: "geometry",
            config: geometry,
          },
          {
            type: "DateRangeFilter",
            field_name: "acquired",
            config: {
              gte: startDate.toISOString(),
              lte: endDate.toISOString(),
            },
          },
          {
            type: "RangeFilter",
            field_name: "cloud_cover",
            config: {
              lte: 0.3, // Max 30% cloud cover
            },
          },
        ],
      };

      const response = await fetch(
        "https://api.planet.com/data/v1/quick-search",
        {
          method: "POST",
          headers: {
            Authorization: `api-key ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            item_types: ["PSScene"],
            filter: searchFilter,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Planet API Error: ${response.status} - ${errorText}`);
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      return data.features || [];
    } catch (error) {
      console.error("Planet imagery search error:", error);
      throw error;
    }
  }

  async calculatePlanetNDVI(image, longitude, latitude, apiKey) {
    try {
      // This is a simplified implementation
      // In reality, you'd need to download the image and calculate NDVI from pixel values

      // For demonstration, we'll estimate based on image metadata
      const cloudCover = image.properties.cloud_cover;
      const confidence = 1 - cloudCover;

      // Placeholder NDVI calculation - in real implementation you'd process the actual image
      const estimatedNDVI =
        0.7 - cloudCover * 0.3 + (Math.random() - 0.5) * 0.1;

      return {
        value: Math.max(-1, Math.min(1, estimatedNDVI)),
        confidence,
        cloudCover,
        imageId: image.id,
      };
    } catch (error) {
      console.error("Planet NDVI calculation error:", error);
      throw error;
    }
  }

  formatDateForAPI(date, dayOffset = 0) {
    const targetDate = new Date(
      date.getTime() + dayOffset * 24 * 60 * 60 * 1000
    );
    return targetDate.toISOString().split("T")[0] + "T00:00:00Z";
  }

  formatDateForNASA(date, dayOffset = 0) {
    const targetDate = new Date(
      date.getTime() + dayOffset * 24 * 60 * 60 * 1000
    );
    return targetDate.toISOString().split("T")[0];
  }

  async getSentinelImagery(longitude, latitude, date, bbox_size = 0.01) {
    try {
      const token = await this.getAccessToken();

      // Define bounding box around the point
      const bbox = [
        longitude - bbox_size,
        latitude - bbox_size,
        longitude + bbox_size,
        latitude + bbox_size,
      ];

      const evalscript = `
        //VERSION=3
        function setup() {
          return {
            input: ["B04", "B08"],
            output: { bands: 3 }
          };
        }

        function evaluatePixel(sample) {
          let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
          return [ndvi, ndvi, ndvi];
        }
      `;

      const response = await fetch(
        "https://services.sentinel-hub.com/api/v1/process",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: {
              bounds: {
                properties: {
                  crs: "http://www.opengis.net/def/crs/EPSG/0/4326",
                },
                geometry: {
                  type: "Polygon",
                  coordinates: [
                    [
                      [bbox[0], bbox[1]],
                      [bbox[2], bbox[1]],
                      [bbox[2], bbox[3]],
                      [bbox[0], bbox[3]],
                      [bbox[0], bbox[1]],
                    ],
                  ],
                },
              },
              data: [
                {
                  type: "sentinel-2-l2a",
                  dataFilter: {
                    timeRange: {
                      from: date.toISOString().split("T")[0] + "T00:00:00Z",
                      to: date.toISOString().split("T")[0] + "T23:59:59Z",
                    },
                  },
                },
              ],
            },
            output: {
              width: 512,
              height: 512,
              responses: [
                {
                  identifier: "default",
                  format: {
                    type: "image/jpeg",
                  },
                },
              ],
            },
            evalscript: evalscript,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Sentinel Imagery API Error: ${response.status} - ${errorText}`
        );
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      return await response.blob();
    } catch (error) {
      console.error("Sentinel imagery retrieval error:", error);
      throw error;
    }
  }

  async getNASAData(longitude, latitude, date) {
    try {
      const apiKey = process.env.NASA_API_KEY;

      if (!apiKey) {
        throw new Error("NASA API key not configured");
      }

      // Get multiple NASA datasets
      const results = {};

      // 1. NASA Earth Imagery
      try {
        const imageryUrl = new URL(
          "https://api.nasa.gov/planetary/earth/imagery"
        );
        imageryUrl.searchParams.append("lon", longitude);
        imageryUrl.searchParams.append("lat", latitude);
        imageryUrl.searchParams.append(
          "date",
          date.toISOString().split("T")[0]
        );
        imageryUrl.searchParams.append("dim", 0.1);
        imageryUrl.searchParams.append("api_key", apiKey);

        const imageryResponse = await fetch(imageryUrl);
        if (imageryResponse.ok) {
          results.imagery = await imageryResponse.blob();
        }
      } catch (error) {
        console.log("NASA imagery request failed:", error.message);
      }

      // 2. NASA Earth Assets (metadata)
      try {
        const assetsUrl = new URL(
          "https://api.nasa.gov/planetary/earth/assets"
        );
        assetsUrl.searchParams.append("lon", longitude);
        assetsUrl.searchParams.append("lat", latitude);
        assetsUrl.searchParams.append("date", date.toISOString().split("T")[0]);
        assetsUrl.searchParams.append("dim", 0.1);
        assetsUrl.searchParams.append("api_key", apiKey);

        const assetsResponse = await fetch(assetsUrl);
        if (assetsResponse.ok) {
          results.assets = await assetsResponse.json();
        }
      } catch (error) {
        console.log("NASA assets request failed:", error.message);
      }

      // 3. MODIS Vegetation Indices (if available)
      try {
        const modisData = await this.getNASAMODISData(
          longitude,
          latitude,
          date,
          apiKey
        );
        results.modis = modisData;
      } catch (error) {
        console.log("NASA MODIS request failed:", error.message);
      }

      if (Object.keys(results).length === 0) {
        throw new Error(
          "No NASA data available for the specified location and date"
        );
      }

      return results;
    } catch (error) {
      console.error("NASA data retrieval error:", error);
      throw error;
    }
  }

  calculateVegetationLoss(beforeNDVI, afterNDVI) {
    if (beforeNDVI <= 0) {
      return {
        percentage: 0,
        area: 0,
        confidence: 0,
        severity: "none",
      };
    }

    const percentage = ((beforeNDVI - afterNDVI) / beforeNDVI) * 100;

    // Estimate area based on NDVI change and pixel resolution
    // This calculation depends on the satellite data source
    const pixelSize = 100; // 10m x 10m for Sentinel-2
    const estimatedArea = Math.max(0, percentage * pixelSize); // Square meters

    // Calculate confidence based on NDVI values
    const confidence = Math.min(
      1,
      (Math.abs(beforeNDVI) + Math.abs(afterNDVI)) / 2
    );

    // Determine severity
    let severity = "none";
    if (percentage > 50) severity = "critical";
    else if (percentage > 25) severity = "high";
    else if (percentage > 10) severity = "medium";
    else if (percentage > 0) severity = "low";

    return {
      percentage: Math.max(0, percentage),
      area: estimatedArea,
      confidence,
      severity,
    };
  }

  async getHistoricalData(longitude, latitude, startDate, endDate) {
    // Try Python endpoint first
    try {
      const pyResp = await pythonService.callAIService(
        "/satellite/historical",
        {
          longitude,
          latitude,
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        }
      );

      if (pyResp && pyResp.historical) return pyResp.historical;
    } catch (pyErr) {
      console.warn(
        "Python historical satellite service failed:",
        pyErr.message || pyErr
      );
      // fallthrough to JS implementation
    }

    try {
      const data = [];
      const daysBetween = Math.ceil(
        (endDate - startDate) / (1000 * 60 * 60 * 24)
      );

      // Sample data points every 16 days (MODIS composite period)
      const sampleInterval = Math.max(16, Math.floor(daysBetween / 20)); // Max 20 data points

      for (let i = 0; i <= daysBetween; i += sampleInterval) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);

        try {
          let ndviData = null;

          // Try different APIs for historical data
          if (process.env.NASA_API_KEY) {
            try {
              ndviData = await this.getNASAMODISData(
                longitude,
                latitude,
                date,
                process.env.NASA_API_KEY
              );
            } catch (error) {
              console.log(`NASA data failed for ${date.toISOString()}`);
            }
          }

          if (!ndviData && process.env.SENTINEL_HUB_CLIENT_ID) {
            try {
              const token = await this.getAccessToken();
              ndviData = await this.getSentinelNDVI(
                longitude,
                latitude,
                date,
                token
              );
            } catch (error) {
              console.log(`Sentinel data failed for ${date.toISOString()}`);
            }
          }

          if (ndviData) {
            data.push({
              date: date.toISOString().split("T")[0],
              ndvi: parseFloat(ndviData.ndvi || ndviData.value || 0).toFixed(3),
              confidence: ndviData.confidence || 0.5,
              source: ndviData.ndvi ? "nasa-modis" : "sentinel-2",
            });
          }
        } catch (error) {
          console.log(
            `Failed to get data for ${date.toISOString()}: ${error.message}`
          );
        }
      }

      if (data.length === 0) {
        throw new Error(
          "No historical satellite data could be retrieved for the specified time range"
        );
      }

      return data;
    } catch (error) {
      console.error("Historical data retrieval error:", error);
      throw error;
    }
  }

  async detectDeforestation(longitude, latitude, sensitivity = "medium") {
    // Try Python endpoint first
    try {
      const pyResp = await pythonService.callAIService(
        "/satellite/deforestation",
        {
          longitude,
          latitude,
          sensitivity,
        }
      );

      if (pyResp) return pyResp;
    } catch (pyErr) {
      console.warn(
        "Python deforestation endpoint failed:",
        pyErr.message || pyErr
      );
      // fallthrough to JS implementation
    }

    try {
      const thresholds = {
        low: 0.1,
        medium: 0.2,
        high: 0.3,
      };

      const threshold = thresholds[sensitivity] || thresholds.medium;
      const analysis = await this.analyzeSatelliteData(longitude, latitude);

      const deforestationDetected =
        analysis.ndviAnalysis.difference > threshold &&
        analysis.ndviAnalysis.beforeNDVI > 0.3; // Minimum vegetation threshold

      // Calculate confidence based on multiple factors
      const confidence = this.calculateDeforestationConfidence(
        analysis,
        threshold
      );

      return {
        detected: deforestationDetected,
        confidence: parseFloat(confidence.toFixed(3)),
        severity: this.categorizeSeverity(analysis.vegetationLoss.percentage),
        analysis,
        metadata: {
          threshold_used: threshold,
          sensitivity: sensitivity,
          detection_date: new Date().toISOString(),
          coordinates: [longitude, latitude],
        },
      };
    } catch (error) {
      console.error("Deforestation detection error:", error);
      throw error;
    }
  }

  calculateDeforestationConfidence(analysis, threshold) {
    let confidence = 0;

    // Base confidence from NDVI analysis
    if (analysis.ndviAnalysis.confidence) {
      confidence += analysis.ndviAnalysis.confidence * 0.4;
    }

    // Confidence from change magnitude
    const changeMagnitude = Math.abs(analysis.ndviAnalysis.difference);
    const magnitudeConfidence = Math.min(1, changeMagnitude / threshold);
    confidence += magnitudeConfidence * 0.3;

    // Confidence from vegetation loss analysis
    if (analysis.vegetationLoss.confidence) {
      confidence += analysis.vegetationLoss.confidence * 0.3;
    }

    return Math.min(1, confidence);
  }

  categorizeSeverity(lossPercentage) {
    if (lossPercentage >= 50) return "critical";
    if (lossPercentage >= 25) return "high";
    if (lossPercentage >= 10) return "medium";
    return "low";
  }
}

// Create singleton instance
const satelliteService = new SatelliteService();

export default satelliteService;
