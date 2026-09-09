@echo off
REM GridSense Full Stack Startup (Windows)
REM Starts Frontend, Backend, and Metabase

echo.
echo ============================================
echo  GridSense - Full Stack Startup
echo ============================================
echo.

REM Colors (Windows 10+ supports ANSI)
setlocal enabledelayedexpansion

echo [1/3] Starting Backend (FastAPI on port 8000)...
start "GridSense Backend" cmd /k ^
  cd /d "%~dp0backend" ^& ^
  venv\Scripts\activate.bat ^& ^
  python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

timeout /t 3 /nobreak

echo [2/3] Starting Frontend (Vite on port 5173)...
start "GridSense Frontend" cmd /k ^
  cd /d "%~dp0frontend" ^& ^
  npx vite --port 5173

timeout /t 5 /nobreak

echo.
echo ============================================
echo   ✅ GridSense is running!
echo ============================================
echo.
echo 📱 Frontend:  http://localhost:5173
echo 🔌 Backend:   http://localhost:8000
echo 📊 API Docs:  http://localhost:8000/docs
echo 📈 Metabase:  http://localhost:3000 (docker-compose)
echo.
echo Next Steps:
echo   1. Open http://localhost:5173 in browser
echo   2. Upload a dataset in the Dashboard
echo   3. View analysis, forecasts, and optimization
echo   4. (Optional) Start Metabase: docker-compose up -d metabase
echo.
echo Note:
echo   - Backend runs in one terminal (auto-reloads on code changes)
echo   - Frontend runs in another terminal (hot module replacement)
echo   - Close either window to stop that service
echo.

REM Keep window open
cmd /k