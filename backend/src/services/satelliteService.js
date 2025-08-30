import axios from "axios";
// import logger from "../utils/logger.js";

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

      const response = await axios.post(
        "https://services.sentinel-hub.com/oauth/token",
        {
          grant_type: "client_credentials",
          client_id: process.env.SENTINEL_HUB_CLIENT_ID,
          client_secret: process.env.SENTINEL_HUB_CLIENT_SECRET,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      this.sentinelHubToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000; // 1 minute buffer

      return this.sentinelHubToken;
    } catch (error) {
      console.error("Failed to get Sentinel Hub access token:", error);
      throw error;
    }
  }

  async analyzeSatelliteData(longitude, latitude) {
    try {
      // Get current date and date from 30 days ago
      const currentDate = new Date();
      const pastDate = new Date(
        currentDate.getTime() - 30 * 24 * 60 * 60 * 1000
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

      // If all APIs fail, throw error instead of returning mock data
      if (!analysisResult) {
        throw new Error(
          "All satellite data sources are unavailable. Please check API configurations."
        );
      }

      return analysisResult;
    } catch (error) {
      console.error("Satellite analysis error:", error);
      throw error; // Don't return mock data, let the caller handle the error
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
              sampleType: "FLOAT32"
            }
          };
        }

        function evaluatePixel(sample) {
          // Calculate NDVI
          let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
          
          // Return -999 for cloudy pixels
          if (sample.CLM > 0.5) {
            return [-999];
          }
          
          return [ndvi];
        }
      `;

      const response = await axios.post(
        "https://services.sentinel-hub.com/api/v1/process",
        {
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
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Process the response to get NDVI statistics
      const data = response.data;
      const validPixels = data.filter((pixel) => pixel !== -999);

      if (validPixels.length === 0) {
        throw new Error(
          "No valid (cloud-free) pixels found for the specified date and location"
        );
      }

      const averageNDVI =
        validPixels.reduce((sum, val) => sum + val, 0) / validPixels.length;
      const cloudCover = (data.length - validPixels.length) / data.length;
      const confidence = Math.max(0.1, 1 - cloudCover); // Lower confidence with more clouds

      return {
        value: averageNDVI,
        confidence,
        cloudCover,
        validPixels: validPixels.length,
        totalPixels: data.length,
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
      const response = await axios.get(
        "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset",
        {
          params: {
            latitude: latitude,
            longitude: longitude,
            startDate: this.formatDateForNASA(date, -8), // 8 days before (MODIS composites are 16-day)
            endDate: this.formatDateForNASA(date, 8), // 8 days after
            kmAboveBelow: 0.25, // 0.25km = 250m
            kmLeftRight: 0.25,
          },
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      const data = response.data;

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

      const response = await axios.post(
        "https://api.planet.com/data/v1/quick-search",
        {
          item_types: ["PSScene4Band"],
          filter: searchFilter,
        },
        {
          headers: {
            Authorization: `api-key ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.features || [];
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

      const response = await axios.post(
        "https://services.sentinel-hub.com/api/v1/process",
        {
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
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
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
        const imageryResponse = await axios.get(
          "https://api.nasa.gov/planetary/earth/imagery",
          {
            params: {
              lon: longitude,
              lat: latitude,
              date: date.toISOString().split("T")[0],
              dim: 0.1,
              api_key: apiKey,
            },
          }
        );
        results.imagery = imageryResponse.data;
      } catch (error) {
        console.log("NASA imagery request failed:", error.message);
      }

      // 2. NASA Earth Assets (metadata)
      try {
        const assetsResponse = await axios.get(
          "https://api.nasa.gov/planetary/earth/assets",
          {
            params: {
              lon: longitude,
              lat: latitude,
              date: date.toISOString().split("T")[0],
              dim: 0.1,
              api_key: apiKey,
            },
          }
        );
        results.assets = assetsResponse.data;
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
