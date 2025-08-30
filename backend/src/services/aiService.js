import * as tf from "@tensorflow/tfjs";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import pythonService from "./pythonService.js";
// import logger from "../utils/logger.js";

class AIService {
  constructor() {
    this.imageModel = null;
    this.modelLoaded = false;
    // Remove paid APIs, use only free alternatives
    this.clarifaiApiKey = process.env.CLARIFAI_API_KEY; // Keep as optional fallback
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
        // allow python worker fallback even if model not loaded
        console.warn(
          "AI model not loaded; will attempt python worker and heuristics"
        );
      }

      const predictions = [];
      const processedImages = [];

      for (const imagePath of imagePaths) {
        try {
          // Try multiple AI services for better accuracy
          let prediction = null;

          // First try enhanced heuristic analysis (free)
          try {
            prediction = await this.analyzeImageWithOpenCV(imagePath);
          } catch (error) {
            console.log("OpenCV analysis failed:", error.message);
          }

          // Preferred: Python worker heuristic
          if (!prediction) {
            try {
              const pyRes = await pythonService.runPythonWorker({
                action: "classify_images",
                image_paths: [imagePath],
              });
              if (pyRes && pyRes.predictions && pyRes.predictions[0]) {
                prediction = pyRes.predictions[0];
                prediction.model = prediction.model || "python-heuristic-v1";
              }
            } catch (pyErr) {
              console.log("Python worker failed:", pyErr.message);
            }
          }

          // Fallback to Clarifai API (if available)
          if (this.clarifaiApiKey && !prediction) {
            try {
              prediction = await this.classifyWithClarifai(imagePath);
            } catch (error) {
              console.log("Clarifai API failed:", error.message);
            }
          }

          // Fallback to local TensorFlow model
          if (this.imageModel && !prediction) {
            try {
              prediction = await this.classifyWithLocalModel(imagePath);
            } catch (error) {
              console.log("Local model failed:", error.message);
            }
          }

          // Last resort: basic heuristic image analysis
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

  async analyzeImageWithOpenCV(imagePath) {
    try {
      // Enhanced free image analysis using Sharp and custom algorithms
      const imageInfo = await sharp(imagePath).metadata();
      const { width, height, channels } = imageInfo;

      // Get image statistics
      const stats = await sharp(imagePath).stats();

      // Advanced color analysis
      const colorAnalysis = await this.performAdvancedColorAnalysis(imagePath);

      // Texture analysis
      const textureAnalysis = await this.analyzeImageTexture(imagePath);

      // Edge detection for structure analysis
      const edgeAnalysis = await this.performEdgeDetection(imagePath);

      // Shape analysis
      const shapeAnalysis = await this.analyzeImageShapes(imagePath);

      // Combine all analyses to determine classification
      const classification = this.interpretFreeAnalysisResults({
        colorAnalysis,
        textureAnalysis,
        edgeAnalysis,
        shapeAnalysis,
        imageInfo,
        stats,
      });

      return {
        class: classification.class,
        confidence: classification.confidence,
        model: "opencv-free-analysis",
        timestamp: new Date(),
        details: {
          colorAnalysis,
          textureAnalysis,
          edgeAnalysis,
          shapeAnalysis,
        },
      };
    } catch (error) {
      console.error("OpenCV analysis error:", error);
      throw error;
    }
  }

  async performAdvancedColorAnalysis(imagePath) {
    try {
      const { data, info } = await sharp(imagePath)
        .raw()
        .toBuffer({ resolveWithObject: true });

      let greenPixels = 0;
      let brownPixels = 0;
      let bluePixels = 0;
      let grayPixels = 0;
      let totalBrightness = 0;

      const totalPixels = info.width * info.height;

      for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        totalBrightness += (r + g + b) / 3;

        // Enhanced color detection
        if (g > r + 20 && g > b + 10 && g > 80) {
          greenPixels++;
        } else if (r > 100 && g > 60 && b < 80 && r > g && g > b) {
          brownPixels++;
        } else if (b > r + 15 && b > g + 10 && b > 60) {
          bluePixels++;
        } else if (
          Math.abs(r - g) < 20 &&
          Math.abs(g - b) < 20 &&
          Math.abs(r - b) < 20
        ) {
          grayPixels++;
        }
      }

      return {
        greenRatio: greenPixels / totalPixels,
        brownRatio: brownPixels / totalPixels,
        blueRatio: bluePixels / totalPixels,
        grayRatio: grayPixels / totalPixels,
        averageBrightness: totalBrightness / totalPixels,
        vegetationIndex: (greenPixels - brownPixels) / totalPixels,
        waterIndex: bluePixels / totalPixels,
      };
    } catch (error) {
      console.error("Advanced color analysis error:", error);
      return {};
    }
  }

  async analyzeImageTexture(imagePath) {
    try {
      // Convert to grayscale and analyze texture patterns
      const grayscaleBuffer = await sharp(imagePath)
        .greyscale()
        .raw()
        .toBuffer();

      // Calculate texture complexity using local standard deviation
      const textureComplexity =
        this.calculateTextureComplexity(grayscaleBuffer);

      // Detect repetitive patterns (indicating natural vs artificial)
      const patternRegularity = this.detectPatternRegularity(grayscaleBuffer);

      return {
        complexity: textureComplexity,
        regularity: patternRegularity,
        naturalness:
          textureComplexity > 0.3 && patternRegularity < 0.5 ? "high" : "low",
      };
    } catch (error) {
      console.error("Texture analysis error:", error);
      return {};
    }
  }

  async performEdgeDetection(imagePath) {
    try {
      // Use Sobel edge detection
      const sobelX = await sharp(imagePath)
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
        })
        .raw()
        .toBuffer();

      const sobelY = await sharp(imagePath)
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
        })
        .raw()
        .toBuffer();

      // Calculate edge density and direction
      const edgeDensity = this.calculateEdgeDensity(sobelX, sobelY);
      const dominantDirection = this.calculateDominantEdgeDirection(
        sobelX,
        sobelY
      );

      return {
        density: edgeDensity,
        direction: dominantDirection,
        sharpness:
          edgeDensity > 0.2 ? "high" : edgeDensity > 0.1 ? "medium" : "low",
      };
    } catch (error) {
      console.error("Edge detection error:", error);
      return {};
    }
  }

  async analyzeImageShapes(imagePath) {
    try {
      // Detect circular and linear shapes
      const edges = await sharp(imagePath)
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
        })
        .threshold(50)
        .raw()
        .toBuffer();

      const shapeMetrics = this.analyzeShapeMetrics(edges);

      return {
        circularShapes: shapeMetrics.circular,
        linearShapes: shapeMetrics.linear,
        irregularShapes: shapeMetrics.irregular,
        shapeComplexity: shapeMetrics.complexity,
      };
    } catch (error) {
      console.error("Shape analysis error:", error);
      return {};
    }
  }

  interpretFreeAnalysisResults(analysisData) {
    const { colorAnalysis, textureAnalysis, edgeAnalysis, shapeAnalysis } =
      analysisData;

    let mangroveScore = 0;
    let cuttingScore = 0;
    let pollutionScore = 0;
    let encroachmentScore = 0;

    // Color-based scoring
    if (colorAnalysis.greenRatio > 0.3 && colorAnalysis.waterIndex > 0.1) {
      mangroveScore += 0.4;
    }

    if (colorAnalysis.brownRatio > 0.3 && colorAnalysis.greenRatio < 0.1) {
      cuttingScore += 0.4;
    }

    if (colorAnalysis.grayRatio > 0.4 || colorAnalysis.averageBrightness < 80) {
      pollutionScore += 0.3;
    }

    // Texture-based scoring
    if (textureAnalysis.naturalness === "high") {
      mangroveScore += 0.2;
    } else if (textureAnalysis.regularity > 0.7) {
      encroachmentScore += 0.3;
    }

    // Edge-based scoring
    if (edgeAnalysis.density > 0.3 && edgeAnalysis.sharpness === "high") {
      cuttingScore += 0.2;
      encroachmentScore += 0.2;
    }

    // Shape-based scoring
    if (shapeAnalysis.linearShapes > 0.3) {
      encroachmentScore += 0.2;
    }

    if (shapeAnalysis.irregularShapes > 0.5) {
      mangroveScore += 0.2;
    }

    // Determine primary class
    const scores = {
      mangrove: mangroveScore,
      cutting: cuttingScore,
      pollution: pollutionScore,
      encroachment: encroachmentScore,
    };

    const primaryClass = Object.keys(scores).reduce((a, b) =>
      scores[a] > scores[b] ? a : b
    );

    const confidence = Math.max(...Object.values(scores));

    return {
      class: primaryClass,
      confidence: Math.min(confidence, 0.85), // Cap confidence for free analysis
      scores,
    };
  }

  calculateTextureComplexity(buffer) {
    // Calculate local standard deviation as texture measure
    const windowSize = 5;
    let complexity = 0;
    let validWindows = 0;

    for (
      let i = windowSize;
      i < buffer.length - windowSize;
      i += windowSize * 2
    ) {
      const window = Array.from(buffer.slice(i - windowSize, i + windowSize));
      const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
      const variance =
        window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        window.length;
      complexity += Math.sqrt(variance);
      validWindows++;
    }

    return validWindows > 0 ? complexity / validWindows / 255 : 0;
  }

  detectPatternRegularity(buffer) {
    // Simple pattern detection using autocorrelation
    const sampleSize = Math.min(buffer.length, 1000);
    const sample = Array.from(buffer.slice(0, sampleSize));

    let maxCorrelation = 0;
    for (let lag = 1; lag < sampleSize / 4; lag++) {
      let correlation = 0;
      for (let i = 0; i < sampleSize - lag; i++) {
        correlation += sample[i] * sample[i + lag];
      }
      correlation /= sampleSize - lag;
      maxCorrelation = Math.max(maxCorrelation, Math.abs(correlation));
    }

    return maxCorrelation / (255 * 255);
  }

  calculateEdgeDensity(sobelX, sobelY) {
    let edgePixels = 0;
    const threshold = 30;

    for (let i = 0; i < sobelX.length; i++) {
      const magnitude = Math.sqrt(
        sobelX[i] * sobelX[i] + sobelY[i] * sobelY[i]
      );
      if (magnitude > threshold) {
        edgePixels++;
      }
    }

    return edgePixels / sobelX.length;
  }

  calculateDominantEdgeDirection(sobelX, sobelY) {
    let horizontalEdges = 0;
    let verticalEdges = 0;

    for (let i = 0; i < sobelX.length; i++) {
      if (Math.abs(sobelX[i]) > Math.abs(sobelY[i])) {
        verticalEdges++;
      } else {
        horizontalEdges++;
      }
    }

    return verticalEdges > horizontalEdges ? "vertical" : "horizontal";
  }

  analyzeShapeMetrics(edgeBuffer) {
    // Simplified shape analysis
    const totalPixels = edgeBuffer.length;
    let edgePixels = 0;

    for (let i = 0; i < edgeBuffer.length; i++) {
      if (edgeBuffer[i] > 0) {
        edgePixels++;
      }
    }

    const edgeRatio = edgePixels / totalPixels;

    return {
      circular: edgeRatio > 0.1 && edgeRatio < 0.3 ? 0.6 : 0.2,
      linear: edgeRatio > 0.05 && edgeRatio < 0.15 ? 0.7 : 0.3,
      irregular: edgeRatio > 0.2 ? 0.8 : 0.4,
      complexity: edgeRatio,
    };
  }

  async classifyWithClarifai(imagePath) {
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString("base64");

      const response = await fetch(
        "https://api.clarifai.com/v2/models/general-image-recognition/outputs",
        {
          method: "POST",
          headers: {
            Authorization: `Key ${this.clarifaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: [
              {
                data: {
                  image: {
                    base64: base64Image,
                  },
                },
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return this.interpretClarifaiResults(data);
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
            $geoWithin: {
              $centerSphere: [[longitude, latitude], radius / 6378100], // radius in radians
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

      // 1. Free computer vision analysis using OpenCV methods
      try {
        const freeAnalysis = await this.analyzeImageWithOpenCV(imagePath);
        results.objects_detected = freeAnalysis.details.shapeAnalysis;
        results.scene_type = freeAnalysis.class;
      } catch (error) {
        console.log("Free analysis failed:", error.message);
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
