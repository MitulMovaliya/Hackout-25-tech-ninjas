import path from "path";
import pythonService from "../src/services/pythonService.js";

(async () => {
  try {
    // Resolve a sample image from the repo (frontend public image)
    const sampleImage = path.resolve(
      process.cwd(),
      "..",
      "frontend",
      "public",
      "image.png"
    );

    console.log("Using sample image:", sampleImage);

    // Test 1: Check if FastAPI service is available
    console.log("\n=== Testing FastAPI Service Health ===");
    const isHealthy = await pythonService.checkAIServiceHealth();
    console.log("FastAPI service healthy:", isHealthy);

    // Test 2: Run image classification
    console.log("\n=== Testing Image Classification ===");
    const result = await pythonService.runPythonWorker(
      {
        action: "classify_images",
        image_paths: [sampleImage],
      },
      20000
    );

    console.log("Classification result:", JSON.stringify(result, null, 2));

    // Test 3: Test anomaly detection if FastAPI is available
    if (isHealthy) {
      console.log("\n=== Testing Anomaly Detection ===");
      try {
        const anomalyResult = await pythonService.callAIService("/anomaly", {
          reporter_id: "test_user_123",
          coordinates: [77.5946, 12.9716], // Bangalore coordinates
          options: { simulate: ["high_frequency"] },
        });

        console.log(
          "Anomaly detection result:",
          JSON.stringify(anomalyResult, null, 2)
        );
      } catch (err) {
        console.error("Anomaly detection failed:", err.message);
      }
    }

    console.log("\n=== All tests completed ===");
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
})();
