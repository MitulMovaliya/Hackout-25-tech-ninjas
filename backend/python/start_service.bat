@echo off
REM Windows batch file to start the FastAPI AI service

echo Starting Mangrove AI Service...

REM Change to the python directory
cd /d "%~dp0"

REM Check if virtual environment exists, create if not
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

REM Start the FastAPI service
echo Starting FastAPI service on http://localhost:8001
echo Health check: http://localhost:8001/health
echo API docs: http://localhost:8001/docs
echo Press Ctrl+C to stop

uvicorn ai_service:app --host 0.0.0.0 --port 8001 --reload
