#!/usr/bin/env python
"""
Lightweight FastAPI satellite analysis microservice.
Endpoints:
- POST /satellite/ndvi
- POST /satellite/historical
- POST /satellite/deforestation

This is a first-pass implementation: it prefers NASA MODIS if API key is provided, otherwise returns a safe fallback.
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import os
import logging
import requests
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("satellite_service")

app = FastAPI(title="Mangrove Satellite Service", version="0.1")


@app.get("/health")
def health():
    return {"status": "healthy", "service": "satellite_service", "time": datetime.utcnow().isoformat()}


@app.get("/")
def root():
    return {"message": "Mangrove Satellite Service", "health": "/health"}


class NDVIRequest(BaseModel):
    longitude: float
    latitude: float
    days_back: Optional[int] = 60


class HistoricalRequest(BaseModel):
    longitude: float
    latitude: float
    startDate: str
    endDate: str


class DeforestRequest(BaseModel):
    longitude: float
    latitude: float
    sensitivity: Optional[str] = "medium"


def format_date_for_nasa(date: datetime, day_offset=0):
    target = date + timedelta(days=day_offset)
    return target.strftime("%Y-%m-%d")


def get_nasa_modis_ndvi(lon, lat, date, api_key):
    try:
        url = "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset"
        params = {
            "latitude": lat,
            "longitude": lon,
            "startDate": format_date_for_nasa(date, -16),
            "endDate": format_date_for_nasa(date, 16),
            "kmAboveBelow": 1,
            "kmLeftRight": 1,
        }
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        resp = requests.get(url, params=params, headers=headers, timeout=30)
        if not resp.ok:
            logger.warning(f"NASA MODIS request failed: {resp.status_code} {resp.text}")
            return None

        data = resp.json()
        subset = data.get("subset") or []
        ndvi_vals = [item.get("value") / 10000.0 for item in subset if item.get("band") == "250m_16_days_NDVI" and item.get("value") is not None]
        if not ndvi_vals:
            return None
        avg = sum(ndvi_vals) / len(ndvi_vals)
        confidence = min(1.0, len(ndvi_vals) / 5.0)
        return {"ndvi": avg, "confidence": confidence, "dataPoints": len(ndvi_vals)}
    except Exception as e:
        logger.exception("Error fetching MODIS data: %s", e)
        return None


@app.post("/satellite/ndvi")
def ndvi(req: NDVIRequest):
    now = datetime.utcnow()
    past = now - timedelta(days=req.days_back)
    api_key = os.getenv("NASA_API_KEY")

    # Try NASA MODIS
    if api_key:
        past_data = get_nasa_modis_ndvi(req.longitude, req.latitude, past, api_key)
        current_data = get_nasa_modis_ndvi(req.longitude, req.latitude, now, api_key)
        if past_data and current_data:
            ndvi_diff = (past_data["ndvi"] - current_data["ndvi"]) if past_data and current_data else None
            change_threshold = float(os.getenv("NDVI_CHANGE_THRESHOLD", "0.2"))
            changeDetected = abs(ndvi_diff) > change_threshold if ndvi_diff is not None else False
            vegetation_loss_pct = 0.0
            if past_data and current_data and past_data["ndvi"] > 0:
                vegetation_loss_pct = ((past_data["ndvi"] - current_data["ndvi"]) / past_data["ndvi"]) * 100

            return {
                "ndviAnalysis": {
                    "beforeNDVI": round(past_data["ndvi"], 3),
                    "afterNDVI": round(current_data["ndvi"], 3),
                    "difference": round(ndvi_diff, 3) if ndvi_diff is not None else None,
                    "changeDetected": changeDetected,
                    "satelliteSource": "nasa-modis",
                    "analysisDate": now.isoformat(),
                    "confidence": min(past_data["confidence"], current_data["confidence"]),
                },
                "vegetationLoss": {
                    "percentage": round(vegetation_loss_pct, 2),
                    "area": None,
                    "confirmed": vegetation_loss_pct > 15,
                },
                "metadata": {
                    "pastDate": past.isoformat(),
                    "currentDate": now.isoformat(),
                    "coordinates": [req.longitude, req.latitude],
                },
            }

    # Fallback
    return {
        "ndviAnalysis": {
            "beforeNDVI": None,
            "afterNDVI": None,
            "difference": None,
            "changeDetected": False,
            "satelliteSource": "unavailable",
            "analysisDate": now.isoformat(),
            "confidence": 0.0,
        },
        "vegetationLoss": {"percentage": None, "area": None, "confirmed": False},
        "metadata": {"coordinates": [req.longitude, req.latitude]},
    }


@app.post("/satellite/historical")
def historical(req: HistoricalRequest):
    try:
        start = datetime.fromisoformat(req.startDate)
        end = datetime.fromisoformat(req.endDate)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format, use ISO YYYY-MM-DD")

    days_between = (end - start).days
    if days_between <= 0:
        raise HTTPException(status_code=400, detail="endDate must be after startDate")

    api_key = os.getenv("NASA_API_KEY")
    data = []
    step = max(16, days_between // 20)
    current = start
    while current <= end:
        entry = {"date": current.strftime("%Y-%m-%d"), "ndvi": None, "confidence": 0}
        if api_key:
            nd = get_nasa_modis_ndvi(req.longitude, req.latitude, current, api_key)
            if nd:
                entry["ndvi"] = round(nd["ndvi"], 3)
                entry["confidence"] = nd["confidence"]
        data.append(entry)
        current += timedelta(days=step)

    return {"historical": data}


@app.post("/satellite/deforestation")
def deforestation(req: DeforestRequest):
    now = datetime.utcnow()
    past = now - timedelta(days=60)
    # Reuse NDVI endpoint logic
    ndvi_resp = ndvi(NDVIRequest(longitude=req.longitude, latitude=req.latitude, days_back=60))
    try:
        before = ndvi_resp["ndviAnalysis"]["beforeNDVI"]
        after = ndvi_resp["ndviAnalysis"]["afterNDVI"]
        diff = None if before is None or after is None else before - after
    except Exception:
        before = after = diff = None

    detected = False
    confidence = 0.0
    severity = "low"
    if diff is not None and before and before > 0:
        pct = ((before - after) / before) * 100
        detected = pct > (0.2 * 100)  # 20% threshold
        confidence = 0.5
        if pct > 50:
            severity = "critical"
            confidence = 0.9
        elif pct > 25:
            severity = "high"
            confidence = 0.75
        elif pct > 10:
            severity = "medium"
            confidence = 0.6

    return {
        "detected": detected,
        "confidence": confidence,
        "severity": severity,
        "analysis": ndvi_resp,
        "metadata": {"coordinates": [req.longitude, req.latitude]},
    }
