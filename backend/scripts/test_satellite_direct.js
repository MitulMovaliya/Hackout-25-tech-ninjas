(async () => {
  const endpoints = [
    "/health",
    "/satellite/ndvi",
    "/satellite/historical",
    "/satellite/deforestation",
  ];
  for (const ep of endpoints) {
    try {
      console.log("\nGET/POST", ep);
      const url = "http://localhost:8002" + ep;
      const opts =
        ep === "/health"
          ? { method: "GET" }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                longitude: 72.0,
                latitude: 21.5,
                days_back: 60,
              }),
            };
      const res = await fetch(url, opts);
      console.log("status", res.status);
      const txt = await res.text();
      console.log("body:", txt.slice(0, 2000));
    } catch (err) {
      console.error(
        "error calling",
        ep,
        err && (err.stack || err.message || err)
      );
    }
  }
})();
