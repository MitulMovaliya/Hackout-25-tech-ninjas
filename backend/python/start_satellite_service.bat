@echo off
REM Start the satellite FastAPI service on port 8002
python -m uvicorn satellite_service:app --host 0.0.0.0 --port 8002 --reload
