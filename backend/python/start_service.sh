#!/bin/bash
# Startup script for the FastAPI AI service
# Run this to start the persistent Python ML microservice

echo "Starting Mangrove AI Service..."

# Change to the python directory
cd "$(dirname "$0")"

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
if [ -f "venv/Scripts/activate" ]; then
    # Windows
    source venv/Scripts/activate
elif [ -f "venv/bin/activate" ]; then
    # Unix/Linux/macOS
    source venv/bin/activate
fi

# Install/upgrade dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Start the FastAPI service
echo "Starting FastAPI service on http://localhost:8001"
echo "Health check: http://localhost:8001/health"
echo "API docs: http://localhost:8001/docs"
echo "Press Ctrl+C to stop"

uvicorn ai_service:app --host 0.0.0.0 --port 8001 --reload
