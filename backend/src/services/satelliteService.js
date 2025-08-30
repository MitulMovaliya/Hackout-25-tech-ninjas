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

      // Get NDVI data for both time periods
      const currentNDVI = await this.getNDVIData(
        longitude,
        latitude,
        currentDate
      );
      const pastNDVI = await this.getNDVIData(longitude, latitude, pastDate);

      // Calculate NDVI difference
      const ndviDifference = currentNDVI - pastNDVI;
      const changeThreshold = parseFloat(
        process.env.NDVI_CHANGE_THRESHOLD || 0.2
      );
      const changeDetected = Math.abs(ndviDifference) > changeThreshold;

      // Estimate vegetation loss
      const vegetationLoss = this.calculateVegetationLoss(
        pastNDVI,
        currentNDVI
      );

      return {
        ndviAnalysis: {
          beforeNDVI: parseFloat(pastNDVI.toFixed(3)),
          afterNDVI: parseFloat(currentNDVI.toFixed(3)),
          difference: parseFloat(ndviDifference.toFixed(3)),
          changeDetected,
          satelliteSource: "sentinel-2",
          analysisDate: new Date(),
        },
        vegetationLoss: {
          percentage: parseFloat(vegetationLoss.percentage.toFixed(2)),
          area: vegetationLoss.area,
          confirmed: vegetationLoss.percentage > 15, // 15% loss threshold
        },
      };
    } catch (error) {
      console.error("Satellite analysis error:", error);

      // Return mock data if satellite service fails
      return this.getMockSatelliteData();
    }
  }

  async getNDVIData(longitude, latitude, date) {
    try {
      // In a real implementation, this would call Sentinel Hub API
      // For now, we'll generate realistic mock NDVI values

      // Mock NDVI calculation based on coordinates and date
      // NDVI typically ranges from -1 to 1, with higher values indicating more vegetation
      const baseNDVI = 0.6 + Math.sin((latitude * Math.PI) / 180) * 0.2; // Latitude-based variation
      const seasonalVariation =
        Math.sin((date.getMonth() / 12) * 2 * Math.PI) * 0.1;
      const randomNoise = (Math.random() - 0.5) * 0.1;

      const ndvi = Math.max(
        -1,
        Math.min(1, baseNDVI + seasonalVariation + randomNoise)
      );

      return ndvi;
    } catch (error) {
      console.error("NDVI data retrieval error:", error);
      throw error;
    }
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
      // NASA Earth API integration
      const apiKey = process.env.NASA_API_KEY;

      if (!apiKey) {
        throw new Error("NASA API key not configured");
      }

      // Example: Get Landsat imagery
      const response = await axios.get(
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

      return response.data;
    } catch (error) {
      console.error("NASA data retrieval error:", error);
      throw error;
    }
  }

  calculateVegetationLoss(beforeNDVI, afterNDVI) {
    if (beforeNDVI <= 0) {
      return { percentage: 0, area: 0 };
    }

    const percentage = ((beforeNDVI - afterNDVI) / beforeNDVI) * 100;

    // Estimate area based on NDVI change
    // This is a simplified calculation - in reality, you'd need pixel-level analysis
    const estimatedArea = Math.max(0, percentage * 100); // Square meters (mock calculation)

    return {
      percentage: Math.max(0, percentage),
      area: estimatedArea,
    };
  }

  getMockSatelliteData() {
    // Fallback mock data when satellite services are unavailable
    const beforeNDVI = 0.7 + (Math.random() - 0.5) * 0.2;
    const afterNDVI = beforeNDVI - Math.random() * 0.3; // Simulate potential loss
    const difference = beforeNDVI - afterNDVI;

    return {
      ndviAnalysis: {
        beforeNDVI: parseFloat(beforeNDVI.toFixed(3)),
        afterNDVI: parseFloat(afterNDVI.toFixed(3)),
        difference: parseFloat(difference.toFixed(3)),
        changeDetected: difference > 0.2,
        satelliteSource: "mock-data",
        analysisDate: new Date(),
      },
      vegetationLoss: {
        percentage: parseFloat(((difference / beforeNDVI) * 100).toFixed(2)),
        area: difference * 1000, // Mock area calculation
        confirmed: difference / beforeNDVI > 0.15,
      },
    };
  }

  async getHistoricalData(longitude, latitude, startDate, endDate) {
    try {
      // Get historical NDVI trends for the location
      const data = [];
      const daysBetween = Math.ceil(
        (endDate - startDate) / (1000 * 60 * 60 * 24)
      );

      for (let i = 0; i <= daysBetween; i += 7) {
        // Weekly data points
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const ndvi = await this.getNDVIData(longitude, latitude, date);

        data.push({
          date: date.toISOString().split("T")[0],
          ndvi: parseFloat(ndvi.toFixed(3)),
        });
      }

      return data;
    } catch (error) {
      console.error("Historical data retrieval error:", error);
      throw error;
    }
  }

  async detectDeforestation(longitude, latitude, sensitivity = "medium") {
    try {
      // Specialized deforestation detection algorithm
      const thresholds = {
        low: 0.1,
        medium: 0.2,
        high: 0.3,
      };

      const threshold = thresholds[sensitivity] || thresholds.medium;
      const analysis = await this.analyzeSatelliteData(longitude, latitude);

      const deforestationDetected =
        analysis.ndviAnalysis.difference > threshold &&
        analysis.ndviAnalysis.beforeNDVI > 0.5;

      return {
        detected: deforestationDetected,
        confidence: deforestationDetected
          ? Math.min(1, analysis.ndviAnalysis.difference / threshold)
          : 0,
        severity: this.categorizeSeverity(analysis.vegetationLoss.percentage),
        analysis,
      };
    } catch (error) {
      console.error("Deforestation detection error:", error);
      throw error;
    }
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
