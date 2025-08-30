# Mangrove AI Service

This directory contains the Python-based AI/ML microservice for the Mangrove project, providing image classification and anomaly detection capabilities.

## Architecture

The service supports two deployment modes:

1. **FastAPI Microservice** (recommended for production)

   - Persistent HTTP service with model loading
   - Better performance and scalability
   - RESTful API with automatic documentation

2. **CLI Worker** (fallback)
   - Simple command-line script
   - Spawned per-request from Node.js
   - No persistent state

## Setup

### 1. Install Dependencies

```bash
cd backend/python
pip install -r requirements.txt
```

### 2. Start FastAPI Service

**Windows:**

```cmd
start_service.bat
```

**Unix/Linux/macOS:**

```bash
./start_service.sh
```

**Manual:**

```bash
python -m uvicorn ai_service:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Verify Service

- Health check: http://localhost:8001/health
- API documentation: http://localhost:8001/docs
- Interactive API: http://localhost:8001/redoc

## API Endpoints

### POST /classify

Classify images using ML heuristics.

**Request:**

```json
{
  "image_paths": ["/path/to/image1.jpg", "/path/to/image2.jpg"],
  "options": {}
}
```

**Response:**

```json
{
  "predictions": [
    {
      "class_name": "mangrove",
      "confidence": 0.75,
      "model": "python-heuristic-v2",
      "details": {
        "greenRatio": 0.3,
        "brownRatio": 0.1,
        "blueRatio": 0.2,
        "dimensions": { "width": 1024, "height": 768 }
      }
    }
  ],
  "averageConfidence": 0.75,
  "primaryClass": "mangrove",
  "isValid": true,
  "totalImages": 1,
  "validImages": 1
}
```

### POST /anomaly

Detect anomalies in reporting patterns.

**Request:**

```json
{
  "reporter_id": "user123",
  "coordinates": [77.5946, 12.9716],
  "options": {}
}
```

**Response:**

```json
{
  "score": 0.2,
  "flags": [
    {
      "type": "frequent_reporter",
      "severity": "medium",
      "description": "High reporting frequency detected",
      "details": { "timeframe": "24h", "count": 15 }
    }
  ],
  "isSuspicious": false,
  "analysis": {}
}
```

## Node.js Integration

The Node.js backend automatically detects and uses the FastAPI service when available, falling back to the CLI worker if the service is down.

```javascript
import pythonService from "./src/services/pythonService.js";

// This will use FastAPI if available, CLI worker as fallback
const result = await pythonService.runPythonWorker({
  action: "classify_images",
  image_paths: ["/path/to/image.jpg"],
});
```

## Testing

Run the integration test:

```bash
cd backend
node scripts/test_python_integration.js
```

This test will:

1. Check FastAPI service health
2. Run image classification
3. Test anomaly detection (if FastAPI is available)

## Environment Variables

- `AI_SERVICE_URL`: FastAPI service URL (default: http://localhost:8001)
- `AI_SERVICE_TIMEOUT`: Request timeout in ms (default: 30000)

## Development

### Adding New ML Models

1. Add model loading code in the `lifespan` function in `ai_service.py`
2. Create new endpoint functions
3. Update the Pydantic models for request/response
4. Add corresponding actions in the CLI worker if needed

### Extending Classification

The current heuristic analysis can be enhanced with:

- Pre-trained CNN models (ResNet, EfficientNet)
- Computer vision libraries (OpenCV, scikit-image)
- Specialized models for environmental monitoring

### Production Considerations

- Use a process manager (PM2, systemd) for the FastAPI service
- Add authentication and rate limiting
- Implement proper logging and monitoring
- Use a job queue (Celery, RQ) for heavy batch processing
- Deploy with Docker for consistency

## Files

- `ai_service.py` - FastAPI microservice
- `ai_worker.py` - CLI worker (legacy fallback)
- `requirements.txt` - Python dependencies
- `start_service.bat/sh` - Service startup scripts
