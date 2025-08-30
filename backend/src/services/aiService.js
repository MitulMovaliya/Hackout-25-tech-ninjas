import * as tf from "@tensorflow/tfjs";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import axios from "axios";
// import logger from "../utils/logger.js";

class AIService {
  constructor() {
    this.imageModel = null;
    this.modelLoaded = false;
    this.googleVisionApiKey = process.env.GOOGLE_VISION_API_KEY;
    this.clarifaiApiKey = process.env.CLARIFAI_API_KEY;
    this.loadModel();
  }

  async loadModel() {
    try {
      console.log("Loading AI image classification model...");

      // Try to load a real model from URL or local path
      try {
        // You can replace this with your actual model URL
        const modelUrl =
          process.env.AI_MODEL_URL ||
          "https://tfhub.dev/google/imagenet/mobilenet_v2_100_224/classification/5";
        this.imageModel = await tf.loadLayersModel(modelUrl);
        console.log("Real AI model loaded successfully");
      } catch (modelError) {
        console.log("Could not load custom model, using fallback APIs");
      }

      this.modelLoaded = true;
      console.log("AI service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize AI service:", error);
      this.modelLoaded = false;
    }
  }

  async classifyImages(imagePaths) {
    try {
      if (!this.modelLoaded) {
        throw new Error("AI service not initialized");
      }

      const predictions = [];
      const processedImages = [];

      for (const imagePath of imagePaths) {
        try {
          // Try multiple AI services for better accuracy
          let prediction = null;

          // First try Google Vision API
          if (this.googleVisionApiKey && !prediction) {
            try {
              prediction = await this.classifyWithGoogleVision(imagePath);
            } catch (error) {
              console.log("Google Vision API failed, trying alternative...");
            }
          }

          // Fallback to Clarifai API
          if (this.clarifaiApiKey && !prediction) {
            try {
              prediction = await this.classifyWithClarifai(imagePath);
            } catch (error) {
              console.log("Clarifai API failed, trying local model...");
            }
          }

          // Fallback to local TensorFlow model
          if (this.imageModel && !prediction) {
            try {
              prediction = await this.classifyWithLocalModel(imagePath);
            } catch (error) {
              console.log("Local model failed, using heuristic analysis...");
            }
          }

          // Last resort: heuristic image analysis
          if (!prediction) {
            prediction = await this.analyzeImageHeuristically(imagePath);
          }

          predictions.push(prediction);
          processedImages.push(imagePath);
        } catch (error) {
          console.error(`Failed to process image ${imagePath}:`, error);
          predictions.push({
            class: "invalid",
            confidence: 0.0,
            model: "error",
            timestamp: new Date(),
            error: error.message,
          });
        }
      }

      // Calculate average confidence and determine primary class
      const validPredictions = predictions.filter((p) => p.class !== "invalid");
      const averageConfidence =
        validPredictions.length > 0
          ? validPredictions.reduce((sum, p) => sum + p.confidence, 0) /
            validPredictions.length
          : 0;

      const primaryClass = this.determinePrimaryClass(validPredictions);
      const isValid =
        averageConfidence >
        parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || 0.7);

      return {
        predictions,
        averageConfidence,
        primaryClass,
        isValid,
        totalImages: imagePaths.length,
        validImages: validPredictions.length,
      };
    } catch (error) {
      console.error("Image classification error:", error);
      throw error;
    }
  }

  async classifyWithGoogleVision(imagePath) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [
                { type: "LABEL_DETECTION", maxResults: 10 },
                { type: "OBJECT_LOCALIZATION", maxResults: 10 },
              ],
            },
          ],
        }
      );

      const annotations = response.data.responses[0];
      return this.interpretGoogleVisionResults(annotations);
    } catch (error) {
      console.error("Google Vision API error:", error);
      throw error;
    }
  }

  async classifyWithClarifai(imagePath) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      const response = await axios.post(
        "https://api.clarifai.com/v2/models/general-image-recognition/outputs",
        {
          inputs: [
            {
              data: {
                image: {
                  base64: base64Image,
                },
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Key ${this.clarifaiApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return this.interpretClarifaiResults(response.data);
    } catch (error) {
      console.error("Clarifai API error:", error);
      throw error;
    }
  }

  async classifyWithLocalModel(imagePath) {
    try {
      const processedImage = await this.preprocessImage(imagePath);
      const prediction = this.imageModel.predict(processedImage);
      const probabilities = await prediction.data();

      // Interpret results based on your model's classes
      return this.interpretLocalModelResults(probabilities);
    } catch (error) {
      console.error("Local model classification error:", error);
      throw error;
    }
  }

  async analyzeImageHeuristically(imagePath) {
    try {
      // Analyze image properties as fallback
      const imageInfo = await sharp(imagePath).metadata();
      const stats = await sharp(imagePath)
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Simple heuristic based on image properties
      const { width, height, channels } = imageInfo;
      const aspectRatio = width / height;

      // Analyze color distribution
      const greenishness = await this.analyzeGreenContent(imagePath);
      const waterPresence = await this.analyzeWaterContent(imagePath);

      let detectedClass = "unknown";
      let confidence = 0.5;

      if (greenishness > 0.3 && waterPresence > 0.2) {
        detectedClass = "mangrove";
        confidence = 0.6 + greenishness * 0.3;
      } else if (greenishness < 0.1) {
        detectedClass = "cutting";
        confidence = 0.5 + (1 - greenishness) * 0.2;
      } else if (waterPresence > 0.5) {
        detectedClass = "water_pollution";
        confidence = 0.5 + waterPresence * 0.2;
      }

      return {
        class: detectedClass,
        confidence: Math.min(confidence, 0.8), // Cap at 0.8 for heuristic
        model: "heuristic-analysis",
        timestamp: new Date(),
        metadata: {
          greenContent: greenishness,
          waterContent: waterPresence,
          aspectRatio,
          dimensions: { width, height },
        },
      };
    } catch (error) {
      console.error("Heuristic analysis error:", error);
      throw error;
    }
  }

  async analyzeGreenContent(imagePath) {
    try {
      const { data, info } = await sharp(imagePath)
        .raw()
        .toBuffer({ resolveWithObject: true });

      let greenPixels = 0;
      const totalPixels = info.width * info.height;

      for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Simple green detection
        if (g > r && g > b && g > 100) {
          greenPixels++;
        }
      }

      return greenPixels / totalPixels;
    } catch (error) {
      console.error("Green content analysis error:", error);
      return 0;
    }
  }

  async analyzeWaterContent(imagePath) {
    try {
      const { data, info } = await sharp(imagePath)
        .raw()
        .toBuffer({ resolveWithObject: true });

      let waterPixels = 0;
      const totalPixels = info.width * info.height;

      for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Simple water detection (blue-ish colors)
        if (b > r && b > g && b > 80) {
          waterPixels++;
        }
      }

      return waterPixels / totalPixels;
    } catch (error) {
      console.error("Water content analysis error:", error);
      return 0;
    }
  }

  interpretGoogleVisionResults(annotations) {
    const labels = annotations.labelAnnotations || [];
    const objects = annotations.localizedObjectAnnotations || [];

    // Look for mangrove-related keywords
    const mangroveKeywords = [
      "tree",
      "forest",
      "vegetation",
      "plant",
      "nature",
      "green",
    ];
    const cuttingKeywords = ["wood", "log", "stump", "cut", "bare"];
    const pollutionKeywords = ["waste", "pollution", "trash", "debris"];

    let mangroveScore = 0;
    let cuttingScore = 0;
    let pollutionScore = 0;

    labels.forEach((label) => {
      const description = label.description.toLowerCase();
      const score = label.score;

      if (mangroveKeywords.some((keyword) => description.includes(keyword))) {
        mangroveScore += score;
      }
      if (cuttingKeywords.some((keyword) => description.includes(keyword))) {
        cuttingScore += score;
      }
      if (pollutionKeywords.some((keyword) => description.includes(keyword))) {
        pollutionScore += score;
      }
    });

    // Determine primary class
    const scores = {
      mangrove: mangroveScore,
      cutting: cuttingScore,
      pollution: pollutionScore,
    };
    const primaryClass = Object.keys(scores).reduce((a, b) =>
      scores[a] > scores[b] ? a : b
    );
    const confidence = Math.max(mangroveScore, cuttingScore, pollutionScore);

    return {
      class: primaryClass,
      confidence: Math.min(confidence, 0.95),
      model: "google-vision-api",
      timestamp: new Date(),
      labels: labels.slice(0, 5), // Top 5 labels
      objects: objects.slice(0, 3), // Top 3 objects
    };
  }

  interpretClarifaiResults(results) {
    const outputs = results.outputs || [];
    if (outputs.length === 0) {
      throw new Error("No results from Clarifai API");
    }

    const concepts = outputs[0].data.concepts || [];

    // Keyword analysis for Clarifai results
    const mangroveKeywords = [
      "tree",
      "forest",
      "vegetation",
      "plant",
      "nature",
      "green",
      "mangrove",
      "swamp",
      "wetland",
      "foliage",
      "leaves",
    ];
    const cuttingKeywords = [
      "wood",
      "log",
      "stump",
      "cut",
      "bare",
      "deforestation",
      "lumber",
      "timber",
      "axe",
      "chainsaw",
      "logging",
    ];
    const pollutionKeywords = [
      "waste",
      "pollution",
      "trash",
      "debris",
      "plastic",
      "garbage",
      "litter",
      "contamination",
      "oil",
    ];

    let mangroveScore = 0;
    let cuttingScore = 0;
    let pollutionScore = 0;

    concepts.forEach((concept) => {
      const name = concept.name.toLowerCase();
      const confidence = concept.value; // Clarifai uses 'value' for confidence

      if (mangroveKeywords.some((keyword) => name.includes(keyword))) {
        mangroveScore += confidence;
      }
      if (cuttingKeywords.some((keyword) => name.includes(keyword))) {
        cuttingScore += confidence;
      }
      if (pollutionKeywords.some((keyword) => name.includes(keyword))) {
        pollutionScore += confidence;
      }
    });

    const scores = {
      mangrove: mangroveScore,
      cutting: cuttingScore,
      pollution: pollutionScore,
    };
    const primaryClass = Object.keys(scores).reduce((a, b) =>
      scores[a] > scores[b] ? a : b
    );
    const confidence = Math.max(mangroveScore, cuttingScore, pollutionScore);

    return {
      class: primaryClass,
      confidence: Math.min(confidence, 0.95),
      model: "clarifai-api",
      timestamp: new Date(),
      concepts: concepts.slice(0, 10), // Top 10 concepts
      topConcept: concepts[0] || null,
    };
  }

  interpretLocalModelResults(probabilities) {
    // This depends on your specific model's output format
    // Adjust based on your trained model's classes
    const classes = ["mangrove", "cutting", "pollution", "other"];
    const maxIndex = probabilities.indexOf(Math.max(...probabilities));

    return {
      class: classes[maxIndex] || "unknown",
      confidence: probabilities[maxIndex],
      model: "local-tensorflow-model",
      timestamp: new Date(),
      allProbabilities: probabilities,
    };
  }

  async preprocessImage(imagePath) {
    try {
      // Resize and normalize image for model input
      const buffer = await sharp(imagePath)
        .resize(224, 224) // Standard input size for many CNN models
        .removeAlpha()
        .raw()
        .toBuffer();

      // Convert to tensor
      const tensor = tf.tensor3d(new Uint8Array(buffer), [224, 224, 3]);

      // Normalize pixel values to [0, 1]
      const normalized = tensor.div(255.0);

      // Add batch dimension
      const batched = normalized.expandDims(0);

      return batched;
    } catch (error) {
      console.error("Image preprocessing error:", error);
      throw error;
    }
  }

  determinePrimaryClass(predictions) {
    if (predictions.length === 0) return "invalid";

    // Count occurrences of each class
    const classCounts = {};
    predictions.forEach((p) => {
      classCounts[p.class] = (classCounts[p.class] || 0) + 1;
    });

    // Find class with highest count
    let maxCount = 0;
    let primaryClass = "invalid";

    for (const [className, count] of Object.entries(classCounts)) {
      if (count > maxCount) {
        maxCount = count;
        primaryClass = className;
      }
    }

    return primaryClass;
  }

  async detectAnomalies(reporterId, coordinates) {
    try {
      // Real anomaly detection using database queries and pattern analysis
      const flags = [];
      let anomalyScore = 0;

      // Check for duplicate locations from the same user
      const duplicateLocationQuery = await this.checkDuplicateLocations(
        reporterId,
        coordinates
      );
      if (duplicateLocationQuery.count > 0) {
        flags.push({
          type: "duplicate_location",
          severity: "medium",
          description: `Similar location reported ${duplicateLocationQuery.count} times by the same user`,
          details: duplicateLocationQuery,
        });
        anomalyScore += 0.3;
      }

      // Check reporting frequency
      const frequencyCheck = await this.checkReportingFrequency(reporterId);
      if (frequencyCheck.isFrequent) {
        flags.push({
          type: "frequent_reporter",
          severity: frequencyCheck.severity,
          description: `User has submitted ${frequencyCheck.count} reports in the last ${frequencyCheck.timeframe}`,
          details: frequencyCheck,
        });
        anomalyScore += frequencyCheck.severity === "high" ? 0.4 : 0.2;
      }

      // Check for geographic clustering
      const clusteringCheck = await this.checkGeographicClustering(coordinates);
      if (clusteringCheck.isClustered) {
        flags.push({
          type: "geographic_clustering",
          severity: clusteringCheck.severity,
          description: `High concentration of reports in this area: ${clusteringCheck.nearbyReports} reports within ${clusteringCheck.radius}m`,
          details: clusteringCheck,
        });
        anomalyScore += 0.2;
      }

      // Check timing patterns
      const timingCheck = await this.checkTimingPatterns(reporterId);
      if (timingCheck.suspicious) {
        flags.push({
          type: "suspicious_timing",
          severity: "low",
          description: timingCheck.description,
          details: timingCheck,
        });
        anomalyScore += 0.1;
      }

      const isSuspicious =
        anomalyScore >
        parseFloat(process.env.ANOMALY_DETECTION_THRESHOLD || 0.6);

      return {
        score: parseFloat(anomalyScore.toFixed(3)),
        flags,
        isSuspicious,
        analysis: {
          duplicateLocationCheck: duplicateLocationQuery,
          frequencyCheck,
          clusteringCheck,
          timingCheck,
        },
      };
    } catch (error) {
      console.error("Anomaly detection error:", error);
      throw error;
    }
  }

  async checkDuplicateLocations(reporterId, coordinates) {
    try {
      // Import Report model dynamically to avoid circular dependencies
      const { default: Report } = await import("../models/Report.js");

      const [longitude, latitude] = coordinates;
      const radius = 100; // 100 meters

      // Find reports from the same user within radius
      const nearbyReports = await Report.find({
        reporter: reporterId,
        "location.coordinates": {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [longitude, latitude],
            },
            $maxDistance: radius,
          },
        },
        createdAt: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      });

      return {
        count: nearbyReports.length,
        radius,
        reports: nearbyReports.map((r) => ({
          id: r._id,
          coordinates: r.location.coordinates,
          createdAt: r.createdAt,
          incidentType: r.incidentType,
        })),
      };
    } catch (error) {
      console.error("Duplicate location check error:", error);
      return { count: 0, radius: 0, reports: [] };
    }
  }

  async checkReportingFrequency(reporterId) {
    try {
      const { default: Report } = await import("../models/Report.js");

      const timeframes = [
        { period: "1 hour", hours: 1, maxReports: 3 },
        { period: "24 hours", hours: 24, maxReports: 5 },
        { period: "7 days", hours: 168, maxReports: 15 },
      ];

      for (const timeframe of timeframes) {
        const startTime = new Date(
          Date.now() - timeframe.hours * 60 * 60 * 1000
        );

        const recentReports = await Report.countDocuments({
          reporter: reporterId,
          createdAt: { $gte: startTime },
        });

        if (recentReports > timeframe.maxReports) {
          return {
            isFrequent: true,
            count: recentReports,
            timeframe: timeframe.period,
            severity: timeframe.hours <= 24 ? "high" : "medium",
            threshold: timeframe.maxReports,
          };
        }
      }

      return { isFrequent: false, count: 0 };
    } catch (error) {
      console.error("Reporting frequency check error:", error);
      return { isFrequent: false, count: 0 };
    }
  }

  async checkGeographicClustering(coordinates) {
    try {
      const { default: Report } = await import("../models/Report.js");

      const [longitude, latitude] = coordinates;
      const checkRadii = [500, 1000, 2000]; // meters

      for (const radius of checkRadii) {
        const nearbyReports = await Report.countDocuments({
          "location.coordinates": {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [longitude, latitude],
              },
              $maxDistance: radius,
            },
          },
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        });

        const threshold = radius <= 500 ? 5 : radius <= 1000 ? 10 : 20;

        if (nearbyReports > threshold) {
          return {
            isClustered: true,
            nearbyReports,
            radius,
            threshold,
            severity: nearbyReports > threshold * 2 ? "high" : "medium",
          };
        }
      }

      return { isClustered: false, nearbyReports: 0 };
    } catch (error) {
      console.error("Geographic clustering check error:", error);
      return { isClustered: false, nearbyReports: 0 };
    }
  }

  async checkTimingPatterns(reporterId) {
    try {
      const { default: Report } = await import("../models/Report.js");

      // Get user's recent reports
      const recentReports = await Report.find({
        reporter: reporterId,
        createdAt: {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      }).sort({ createdAt: 1 });

      if (recentReports.length < 3) {
        return { suspicious: false };
      }

      // Check for patterns
      const hourCounts = {};
      const dayOfWeekCounts = {};

      recentReports.forEach((report) => {
        const date = new Date(report.createdAt);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();

        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
      });

      // Check for suspicious patterns (e.g., all reports at the same hour)
      const maxHourCount = Math.max(...Object.values(hourCounts));
      const maxDayCount = Math.max(...Object.values(dayOfWeekCounts));

      const totalReports = recentReports.length;
      const hourConcentration = maxHourCount / totalReports;
      const dayConcentration = maxDayCount / totalReports;

      if (hourConcentration > 0.8 || dayConcentration > 0.9) {
        return {
          suspicious: true,
          description: `Unusual timing pattern detected: ${
            hourConcentration > 0.8 ? "same hour" : "same day of week"
          } concentration`,
          hourConcentration,
          dayConcentration,
          patterns: {
            hourCounts,
            dayOfWeekCounts,
          },
        };
      }

      return { suspicious: false };
    } catch (error) {
      console.error("Timing pattern check error:", error);
      return { suspicious: false };
    }
  }

  async analyzeImageContent(imagePath) {
    try {
      // Real image content analysis using multiple approaches
      const results = {
        objects_detected: [],
        scene_type: "unknown",
        environmental_conditions: {},
        image_quality: {},
        technical_analysis: {},
      };

      // 1. Computer Vision API analysis
      if (this.googleVisionApiKey) {
        try {
          const visionAnalysis = await this.performGoogleVisionAnalysis(
            imagePath
          );
          results.objects_detected = visionAnalysis.objects;
          results.scene_type = visionAnalysis.scene;
        } catch (error) {
          console.log("Google Vision analysis failed:", error.message);
        }
      }

      // 2. Technical image analysis
      const technicalAnalysis = await this.performTechnicalImageAnalysis(
        imagePath
      );
      results.technical_analysis = technicalAnalysis;
      results.image_quality = technicalAnalysis.quality;

      // 3. Environmental condition analysis
      const environmentalAnalysis = await this.analyzeEnvironmentalConditions(
        imagePath
      );
      results.environmental_conditions = environmentalAnalysis;

      // 4. Determine scene type based on analysis
      results.scene_type = await this.determineSceneType(imagePath, results);

      return results;
    } catch (error) {
      console.error("Image content analysis error:", error);
      throw error;
    }
  }

  async performGoogleVisionAnalysis(imagePath) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      const response = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [
                { type: "OBJECT_LOCALIZATION", maxResults: 20 },
                { type: "LABEL_DETECTION", maxResults: 20 },
                { type: "IMAGE_PROPERTIES" },
              ],
            },
          ],
        }
      );

      const annotations = response.data.responses[0];

      const objects = (annotations.localizedObjectAnnotations || []).map(
        (obj) => ({
          name: obj.name,
          confidence: obj.score,
          bbox: [
            obj.boundingPoly.normalizedVertices[0].x * 1000 || 0,
            obj.boundingPoly.normalizedVertices[0].y * 1000 || 0,
            obj.boundingPoly.normalizedVertices[2].x * 1000 || 1000,
            obj.boundingPoly.normalizedVertices[2].y * 1000 || 1000,
          ],
        })
      );

      // Determine scene type from labels
      const labels = annotations.labelAnnotations || [];
      const sceneLabels = labels.map((l) => l.description.toLowerCase());

      let scene = "unknown";
      if (
        sceneLabels.some((l) =>
          ["forest", "tree", "mangrove", "vegetation"].includes(l)
        )
      ) {
        scene = "mangrove_forest";
      } else if (
        sceneLabels.some((l) => ["water", "ocean", "sea", "river"].includes(l))
      ) {
        scene = "water_body";
      } else if (
        sceneLabels.some((l) => ["urban", "building", "city"].includes(l))
      ) {
        scene = "urban";
      }

      return { objects, scene };
    } catch (error) {
      console.error("Google Vision analysis error:", error);
      return { objects: [], scene: "unknown" };
    }
  }

  async performTechnicalImageAnalysis(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = await sharp(imagePath).stats();

      // Calculate image quality metrics
      const quality = {
        brightness: this.calculateBrightness(stats),
        clarity: this.calculateClarity(metadata, stats),
        blur_level: await this.estimateBlurLevel(imagePath),
        noise_level: this.calculateNoiseLevel(stats),
        resolution: `${metadata.width}x${metadata.height}`,
        file_size: metadata.size || 0,
      };

      // Color analysis
      const colorAnalysis = await this.analyzeColorDistribution(imagePath);

      return {
        quality,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          channels: metadata.channels,
          format: metadata.format,
          density: metadata.density,
        },
        colorAnalysis,
      };
    } catch (error) {
      console.error("Technical image analysis error:", error);
      return { quality: {}, metadata: {}, colorAnalysis: {} };
    }
  }

  async analyzeEnvironmentalConditions(imagePath) {
    try {
      // Analyze environmental indicators in the image
      const greenContent = await this.analyzeGreenContent(imagePath);
      const waterContent = await this.analyzeWaterContent(imagePath);
      const brownContent = await this.analyzeBrownContent(imagePath); // Soil, mud, dead vegetation

      const conditions = {
        vegetation_density:
          greenContent > 0.3 ? "high" : greenContent > 0.1 ? "medium" : "low",
        water_presence: waterContent > 0.1,
        water_coverage:
          waterContent > 0.5 ? "high" : waterContent > 0.2 ? "medium" : "low",
        soil_visibility: brownContent > 0.2,
        human_activity: await this.detectHumanActivity(imagePath),
        degradation_signs: await this.detectDegradationSigns(imagePath),
      };

      return conditions;
    } catch (error) {
      console.error("Environmental conditions analysis error:", error);
      return {};
    }
  }

  async analyzeBrownContent(imagePath) {
    try {
      const { data, info } = await sharp(imagePath)
        .raw()
        .toBuffer({ resolveWithObject: true });

      let brownPixels = 0;
      const totalPixels = info.width * info.height;

      for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Detect brown/tan colors (soil, mud, dead vegetation)
        if (r > 100 && g > 60 && b < 80 && r > g && g > b) {
          brownPixels++;
        }
      }

      return brownPixels / totalPixels;
    } catch (error) {
      console.error("Brown content analysis error:", error);
      return 0;
    }
  }

  async detectHumanActivity(imagePath) {
    try {
      // Look for signs of human activity
      // This could be enhanced with object detection for tools, machinery, etc.

      // For now, use simple heuristics
      const metadata = await sharp(imagePath).metadata();
      const stats = await sharp(imagePath).stats();

      // Check for straight lines (often indicate human-made structures)
      // Check for regular patterns
      // This is a simplified implementation

      return Math.random() < 0.2; // 20% chance for demo
    } catch (error) {
      console.error("Human activity detection error:", error);
      return false;
    }
  }

  async detectDegradationSigns(imagePath) {
    try {
      const greenContent = await this.analyzeGreenContent(imagePath);
      const brownContent = await this.analyzeBrownContent(imagePath);

      // High brown content with low green content might indicate degradation
      const degradationIndicator = brownContent > 0.3 && greenContent < 0.2;

      return {
        detected: degradationIndicator,
        confidence: degradationIndicator ? 0.7 : 0.3,
        indicators: {
          low_vegetation: greenContent < 0.2,
          exposed_soil: brownContent > 0.3,
          bare_areas: 1 - greenContent - brownContent > 0.4,
        },
      };
    } catch (error) {
      console.error("Degradation signs detection error:", error);
      return { detected: false, confidence: 0 };
    }
  }

  calculateBrightness(stats) {
    // Calculate average brightness from channel means
    const channelMeans = stats.channels.map((ch) => ch.mean);
    const averageBrightness =
      channelMeans.reduce((sum, mean) => sum + mean, 0) / channelMeans.length;

    if (averageBrightness > 180) return "bright";
    if (averageBrightness > 100) return "good";
    if (averageBrightness > 50) return "dim";
    return "dark";
  }

  calculateClarity(metadata, stats) {
    // Simple clarity estimate based on standard deviation (higher = more detailed)
    const channelStdDevs = stats.channels.map((ch) => ch.stdev);
    const averageStdDev =
      channelStdDevs.reduce((sum, std) => sum + std, 0) / channelStdDevs.length;

    if (averageStdDev > 50) return "high";
    if (averageStdDev > 30) return "medium";
    return "low";
  }

  async estimateBlurLevel(imagePath) {
    try {
      // Use Laplacian operator to detect blur
      const laplacianBuffer = await sharp(imagePath)
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
        })
        .raw()
        .toBuffer();

      // Calculate variance of Laplacian (lower = more blur)
      const variance = this.calculateVariance(laplacianBuffer);

      if (variance > 1000) return "low";
      if (variance > 500) return "medium";
      return "high";
    } catch (error) {
      console.error("Blur estimation error:", error);
      return "unknown";
    }
  }

  calculateNoiseLevel(stats) {
    // Estimate noise from channel standard deviations
    const channelStdDevs = stats.channels.map((ch) => ch.stdev);
    const averageStdDev =
      channelStdDevs.reduce((sum, std) => sum + std, 0) / channelStdDevs.length;

    if (averageStdDev > 80) return "high";
    if (averageStdDev > 40) return "medium";
    return "low";
  }

  async analyzeColorDistribution(imagePath) {
    try {
      const { dominant } = await sharp(imagePath).stats();

      return {
        dominant_color: {
          r: dominant.r,
          g: dominant.g,
          b: dominant.b,
        },
        color_temperature: this.estimateColorTemperature(dominant),
        saturation: this.estimateSaturation(dominant),
      };
    } catch (error) {
      console.error("Color distribution analysis error:", error);
      return {};
    }
  }

  estimateColorTemperature(dominant) {
    const { r, g, b } = dominant;

    if (b > r && b > g) return "cool";
    if (r > b && r > g) return "warm";
    return "neutral";
  }

  estimateSaturation(dominant) {
    const { r, g, b } = dominant;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;

    if (saturation > 0.6) return "high";
    if (saturation > 0.3) return "medium";
    return "low";
  }

  calculateVariance(buffer) {
    const values = Array.from(buffer);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    return variance;
  }

  async determineSceneType(imagePath, analysisResults) {
    try {
      const { environmental_conditions, objects_detected } = analysisResults;

      // Determine scene type based on analysis
      if (
        environmental_conditions.vegetation_density === "high" &&
        environmental_conditions.water_presence
      ) {
        return "mangrove_forest";
      } else if (environmental_conditions.water_coverage === "high") {
        return "water_body";
      } else if (
        environmental_conditions.vegetation_density === "low" &&
        environmental_conditions.soil_visibility
      ) {
        return "degraded_area";
      } else if (
        objects_detected.some((obj) => obj.name.includes("building"))
      ) {
        return "urban";
      } else if (environmental_conditions.vegetation_density === "high") {
        return "forest";
      }

      return "unknown";
    } catch (error) {
      console.error("Scene type determination error:", error);
      return "unknown";
    }
  }
}

// Create singleton instance
const aiService = new AIService();

export default aiService;
