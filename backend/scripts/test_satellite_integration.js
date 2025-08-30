import pythonService from "../src/services/pythonService.js";

async function run() {
  console.log("Checking satellite service health...");
  const healthy = await pythonService.checkSatelliteServiceHealth();
  console.log("Satellite service reachable:", healthy);

  const sample = { longitude: 72.0, latitude: 21.5 };

  try {
    console.log("Calling /satellite/ndvi...");
    const ndvi = await pythonService.callSatelliteService("/satellite/ndvi", {
      ...sample,
      days_back: 60,
    });
    console.log("NDVI response:", JSON.stringify(ndvi, null, 2));
  } catch (err) {
    console.error("NDVI call failed:", err.message || err);
  }

  try {
    console.log("Calling /satellite/historical...");
    const hist = await pythonService.callSatelliteService(
      "/satellite/historical",
      { ...sample, startDate: "2023-01-01", endDate: "2023-12-31" }
    );
    console.log(
      "Historical response sample:",
      JSON.stringify(hist, null, 2).slice(0, 1000)
    );
  } catch (err) {
    console.error("Historical call failed:", err.message || err);
  }

  try {
    console.log("Calling /satellite/deforestation...");
    const def = await pythonService.callSatelliteService(
      "/satellite/deforestation",
      { ...sample, sensitivity: "medium" }
    );
    console.log("Deforestation response:", JSON.stringify(def, null, 2));
  } catch (err) {
    console.error("Deforestation call failed:", err.message || err);
  }
}

run().catch((e) => console.error(e));
