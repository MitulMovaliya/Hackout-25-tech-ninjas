import { spawn } from "child_process";
import path from "path";
import fs from "fs";

// Resolve python worker path robustly: support running from repo root or backend dir
const candidate1 = path.resolve(process.cwd(), "python", "ai_worker.py");
const candidate2 = path.resolve(
  process.cwd(),
  "backend",
  "python",
  "ai_worker.py"
);
let PY_WORKER = candidate1;
if (!fs.existsSync(PY_WORKER) && fs.existsSync(candidate2)) {
  PY_WORKER = candidate2;
}

// FastAPI service configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";
const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT || "30000");
const SAT_SERVICE_URL =
  process.env.SATELLITE_SERVICE_URL || "http://localhost:8002";

// Health check for FastAPI service
async function checkAIServiceHealth() {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = await response.json();
      return data.status === "healthy" && data.models_loaded;
    }
    return false;
  } catch (error) {
    return false;
  }
}

// Call FastAPI service via HTTP
async function callAIService(endpoint, payload) {
  try {
    const response = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(AI_SERVICE_TIMEOUT),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI service error ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new Error("AI service timeout");
    }
    throw error;
  }
}

// Lightweight satellite service health check: returns true if the service is reachable
async function checkSatelliteServiceHealth() {
  try {
    const resp = await fetch(`${SAT_SERVICE_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    return data && data.status === "healthy";
  } catch (err) {
    return false;
  }
}

async function callSatelliteService(endpoint, payload, timeout = 30000) {
  try {
    const response = await fetch(`${SAT_SERVICE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Satellite service error ${response.status}: ${errorText}`
      );
    }

    return await response.json();
  } catch (err) {
    if (err.name === "TimeoutError")
      throw new Error("Satellite service timeout");
    throw err;
  }
}

function runPythonWorker(payload, timeout = 30000) {
  return new Promise(async (resolve, reject) => {
    try {
      // First try FastAPI service if available
      if (await checkAIServiceHealth()) {
        console.log("Using FastAPI AI service");

        if (payload.action === "classify_images") {
          const result = await callAIService("/classify", {
            image_paths: payload.image_paths,
            options: payload.options || {},
          });

          // Convert FastAPI response to match CLI worker format
          const convertedResult = {
            predictions: result.predictions.map((p) => ({
              class: p.class_name,
              confidence: p.confidence,
              model: p.model,
              timestamp: p.timestamp,
              details: p.details,
            })),
            averageConfidence: result.averageConfidence,
            primaryClass: result.primaryClass,
            isValid: result.isValid,
            totalImages: result.totalImages,
            validImages: result.validImages,
          };

          return resolve(convertedResult);
        } else if (payload.action === "detect_anomalies") {
          const result = await callAIService("/anomaly", {
            reporter_id: payload.reporter_id,
            coordinates: payload.coordinates,
            options: payload.options || {},
          });

          return resolve(result);
        }
      }

      // Fallback to CLI worker
      console.log("Using CLI Python worker");
      const py = spawn("python", [PY_WORKER]);
      let stdout = "";
      let stderr = "";

      const timer = setTimeout(() => {
        py.kill();
        reject(new Error("Python worker timeout"));
      }, timeout);

      py.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      py.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      py.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          return reject(new Error(`Python worker exited ${code}: ${stderr}`));
        }
        try {
          const parsed = JSON.parse(stdout);
          resolve(parsed);
        } catch (err) {
          reject(new Error("Invalid JSON from python worker: " + err.message));
        }
      });

      // Send JSON payload
      py.stdin.write(JSON.stringify(payload));
      py.stdin.end();
    } catch (err) {
      reject(err);
    }
  });
}

export default {
  runPythonWorker,
  checkAIServiceHealth,
  callAIService,
  checkSatelliteServiceHealth,
  callSatelliteService,
};
