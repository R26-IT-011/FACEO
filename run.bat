@echo off
title Face Intelligence Platform Launcher

:: Get absolute paths and resolve quotes
set "BASE_DIR=%~dp0"
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"

echo ==============================================
echo        Face Intelligence Platform Launcher
echo ==============================================
echo.
echo [+] Working directory set to: %BASE_DIR%

:: 1. Main API Service (Port 8000)
echo [+] Starting Main API (Port 8000)...
start "Main API - Port 8000" cmd /k "cd /d "%BACKEND_DIR%" && call venv\Scripts\activate.bat && python api/main.py"

:: 2. Age and Gender Service (Port 8001)
echo [+] Starting Age and Gender Service (Port 8001)...
start "Age & Gender - Port 8001" cmd /k "cd /d "%BACKEND_DIR%" && call venv\Scripts\activate.bat && python age-gender-service/main.py"

:: 3. Emotion Service (Port 8002)
echo [+] Starting Emotion Service (Port 8002)...
start "Emotion - Port 8002" cmd /k "cd /d "%BACKEND_DIR%" && call venv\Scripts\activate.bat && python emotion-service/main.py"

:: 4. Bruise/Marks Detection Service (Port 8003)
echo [+] Starting Bruise/Marks Detection Service (Port 8003)...
start "Bruise & Marks - Port 8003" cmd /k "cd /d "%BACKEND_DIR%" && call venv\Scripts\activate.bat && python bruise-detection-service/main.py"

:: 5. Deepfake Detection Service (Port 8004)
echo [+] Starting Deepfake Detection Service (Port 8004)...
start "Deepfake - Port 8004" cmd /k "cd /d "%BACKEND_DIR%" && call venv\Scripts\activate.bat && python deepfake-service/main.py"

:: 6. Low-Light Emotion Service (Port 8006)
echo [+] Starting Low-Light Emotion Service (Port 8006)...
start "Low-Light Emotion - Port 8006" cmd /k "cd /d "%BACKEND_DIR%" && call venv\Scripts\activate.bat && python low-light-service/main.py"

:: 7. Frontend Dev Server (Port 3000)
echo [+] Starting Next.js Frontend (Port 3000)...
start "Next.js Frontend - Port 3000" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo ==============================================
echo  All services have been launched!
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:8000
echo ==============================================
echo You can close this console. Keep the spawned windows open.
echo.
