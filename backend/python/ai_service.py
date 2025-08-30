#!/usr/bin/env python
"""
FastAPI microservice for AI image analysis.
Persistent service with model loading, health checks, and batch processing.

Run with: uvicorn ai_service:app --host 0.0.0.0 --port 8001

Endpoints:
- GET /health - health check
- POST /classify - classify images
- POST /anomaly - detect anomalies (placeholder)
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import logging
from PIL import Image
import numpy as np
import asyncio
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model state
models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup and cleanup on shutdown."""
    logger.info("Starting AI service...")
    
    # Load any ML models here
    try:
        # Placeholder for real model loading
        # models["image_classifier"] = load_your_model()
        models["initialized"] = True
        logger.info("AI models loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load models: {e}")
        models["initialized"] = False
    
    yield
    
    # Cleanup
    logger.info("Shutting down AI service...")
    models.clear()

app = FastAPI(
    title="Mangrove AI Service",
    description="Python ML microservice for image analysis and anomaly detection",
    version="1.0.0",
    lifespan=lifespan
)

# Request/Response models
class ImageClassificationRequest(BaseModel):
    image_paths: List[str]
    options: Optional[Dict[str, Any]] = {}

class ImagePrediction(BaseModel):
    class_name: str = "unknown"
    confidence: float = 0.0
    model: str = "python-heuristic-v1"
    timestamp: Optional[str] = None
    details: Optional[Dict[str, Any]] = {}

class ImageClassificationResponse(BaseModel):
    predictions: List[ImagePrediction]
    averageConfidence: float
    primaryClass: str
    isValid: bool
    totalImages: int
    validImages: int

class AnomalyDetectionRequest(BaseModel):
    reporter_id: str
    coordinates: List[float]  # [longitude, latitude]
    options: Optional[Dict[str, Any]] = {}

class AnomalyFlag(BaseModel):
    type: str
    severity: str
    description: str
    details: Optional[Dict[str, Any]] = {}

class AnomalyDetectionResponse(BaseModel):
    score: float
    flags: List[AnomalyFlag]
    isSuspicious: bool
    analysis: Optional[Dict[str, Any]] = {}

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "models_loaded": models.get("initialized", False),
        "service": "mangrove-ai"
    }

def analyze_image_heuristic(image_path: str) -> ImagePrediction:
    """Analyze a single image using heuristic methods."""
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            arr = np.array(img)
            h, w, c = arr.shape

            total = h * w
            r = arr[:, :, 0].astype(np.int32)
            g = arr[:, :, 1].astype(np.int32)
            b = arr[:, :, 2].astype(np.int32)

            # Enhanced color analysis
            green_mask = (g > r + 20) & (g > b + 10) & (g > 80)
            brown_mask = (r > 100) & (g > 60) & (b < 80) & (r > g) & (g > b)
            blue_mask = (b > r + 15) & (b > g + 10) & (b > 60)
            gray_mask = (np.abs(r - g) < 20) & (np.abs(g - b) < 20) & (np.abs(r - b) < 20)

            green_ratio = float(np.count_nonzero(green_mask)) / total
            brown_ratio = float(np.count_nonzero(brown_mask)) / total
            blue_ratio = float(np.count_nonzero(blue_mask)) / total
            gray_ratio = float(np.count_nonzero(gray_mask)) / total

            avg_brightness = float(np.mean((r + g + b) / 3.0))
            
            # Texture analysis (simple variance)
            gray_img = np.dot(arr[...,:3], [0.2989, 0.5870, 0.1140])
            texture_variance = float(np.var(gray_img))
            
            # Edge detection (simple gradient)
            grad_x = np.abs(np.gradient(gray_img, axis=1))
            grad_y = np.abs(np.gradient(gray_img, axis=0))
            edge_density = float(np.mean(grad_x + grad_y))

            # Enhanced classification logic
            mangrove_score = 0.0
            cutting_score = 0.0
            pollution_score = 0.0
            encroachment_score = 0.0

            # Color-based scoring
            if green_ratio > 0.25 and blue_ratio > 0.05:
                mangrove_score += 0.4 + min(0.3, green_ratio)
            
            if brown_ratio > 0.2 and green_ratio < 0.1:
                cutting_score += 0.4 + min(0.3, brown_ratio)
            
            if blue_ratio > 0.4:
                pollution_score += 0.4 + min(0.3, blue_ratio)
            
            if gray_ratio > 0.3:
                pollution_score += 0.2
                encroachment_score += 0.2

            # Texture-based scoring
            if texture_variance > 500:  # High texture = natural
                mangrove_score += 0.2
            elif texture_variance < 100:  # Low texture = artificial
                encroachment_score += 0.3

            # Edge-based scoring
            if edge_density > 10:  # High edges = cutting/construction
                cutting_score += 0.2
                encroachment_score += 0.2

            # Determine primary class
            scores = {
                "mangrove": mangrove_score,
                "cutting": cutting_score,
                "pollution": pollution_score,
                "encroachment": encroachment_score
            }

            primary_class = max(scores.keys(), key=lambda k: scores[k])
            confidence = min(scores[primary_class], 0.95)

            # If all scores are low, classify as unknown
            if confidence < 0.3:
                primary_class = "unknown"
                confidence = 0.4 + max(0.0, min(0.2, green_ratio))

            return ImagePrediction(
                class_name=primary_class,
                confidence=round(confidence, 3),
                model="python-heuristic-v2",
                details={
                    "greenRatio": round(green_ratio, 4),
                    "brownRatio": round(brown_ratio, 4),
                    "blueRatio": round(blue_ratio, 4),
                    "grayRatio": round(gray_ratio, 4),
                    "averageBrightness": round(avg_brightness, 2),
                    "textureVariance": round(texture_variance, 2),
                    "edgeDensity": round(edge_density, 2),
                    "dimensions": {"width": w, "height": h},
                    "scores": {k: round(v, 3) for k, v in scores.items()}
                }
            )

    except Exception as e:
        logger.error(f"Failed to analyze image {image_path}: {e}")
        return ImagePrediction(
            class_name="invalid",
            confidence=0.0,
            model="python-heuristic-v2",
            details={"error": str(e)}
        )

@app.post("/classify", response_model=ImageClassificationResponse)
async def classify_images(request: ImageClassificationRequest):
    """Classify multiple images using ML heuristics."""
    if not models.get("initialized", False):
        raise HTTPException(status_code=503, detail="AI models not loaded")
    
    if not request.image_paths:
        raise HTTPException(status_code=400, detail="No image paths provided")
    
    logger.info(f"Classifying {len(request.image_paths)} images")
    
    # Process images (could be parallelized for better performance)
    predictions = []
    for image_path in request.image_paths:
        # Convert to absolute path
        abs_path = os.path.abspath(image_path)
        if not os.path.exists(abs_path):
            logger.warning(f"Image not found: {abs_path}")
            predictions.append(ImagePrediction(
                class_name="invalid",
                confidence=0.0,
                details={"error": f"File not found: {abs_path}"}
            ))
        else:
            prediction = analyze_image_heuristic(abs_path)
            predictions.append(prediction)
    
    # Calculate aggregate metrics
    valid_predictions = [p for p in predictions if p.class_name != "invalid"]
    avg_confidence = sum(p.confidence for p in valid_predictions) / len(valid_predictions) if valid_predictions else 0.0
    
    # Determine primary class by vote
    class_counts = {}
    for p in valid_predictions:
        class_counts[p.class_name] = class_counts.get(p.class_name, 0) + 1
    
    primary_class = max(class_counts.keys(), key=lambda k: class_counts[k]) if class_counts else "unknown"
    is_valid = avg_confidence > 0.6
    
    return ImageClassificationResponse(
        predictions=predictions,
        averageConfidence=round(avg_confidence, 3),
        primaryClass=primary_class,
        isValid=is_valid,
        totalImages=len(request.image_paths),
        validImages=len(valid_predictions)
    )

@app.post("/anomaly", response_model=AnomalyDetectionResponse)
async def detect_anomalies(request: AnomalyDetectionRequest):
    """Detect anomalies in reporting patterns (placeholder implementation)."""
    if not models.get("initialized", False):
        raise HTTPException(status_code=503, detail="AI models not loaded")
    
    logger.info(f"Analyzing anomalies for reporter {request.reporter_id}")
    
    # Placeholder anomaly detection logic
    # In a real implementation, this would query databases and run ML models
    
    flags = []
    score = 0.0
    
    # Simulate some simple checks
    if len(request.coordinates) == 2:
        lon, lat = request.coordinates
        
        # Check for suspicious coordinates (e.g., exact zeros)
        if lon == 0.0 and lat == 0.0:
            flags.append(AnomalyFlag(
                type="suspicious_coordinates",
                severity="high",
                description="Coordinates are exactly (0,0)",
                details={"coordinates": request.coordinates}
            ))
            score += 0.8
        
        # Check for coordinates outside reasonable ranges
        if not (-180 <= lon <= 180) or not (-90 <= lat <= 90):
            flags.append(AnomalyFlag(
                type="invalid_coordinates",
                severity="high",
                description="Coordinates outside valid range",
                details={"coordinates": request.coordinates}
            ))
            score += 0.9
    
    # Simulate frequency checking (would need database in real implementation)
    if "high_frequency" in request.options.get("simulate", []):
        flags.append(AnomalyFlag(
            type="frequent_reporter",
            severity="medium",
            description="High reporting frequency detected",
            details={"timeframe": "24h", "count": 15}
        ))
        score += 0.4
    
    is_suspicious = score > 0.6
    
    return AnomalyDetectionResponse(
        score=round(score, 3),
        flags=flags,
        isSuspicious=is_suspicious,
        analysis={
            "checks_performed": ["coordinate_validation", "frequency_analysis"],
            "reporter_id": request.reporter_id,
            "coordinates": request.coordinates
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
