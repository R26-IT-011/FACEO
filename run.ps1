# Face Intelligence Platform Launcher
# This script starts the 5 backend microservices and the Next.js frontend.

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "       Face Intelligence Platform Launcher" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

$BaseDir = Resolve-Path "."
$BackendDir = Join-Path $BaseDir "backend"
$FrontendDir = Join-Path $BaseDir "frontend"
$VenvActivate = Join-Path $BackendDir "venv\Scripts\Activate.ps1"

# Check if Virtual Environment exists
if (-not (Test-Path $VenvActivate)) {
    Write-Host "[!] Python Virtual Environment (venv) not found in backend/." -ForegroundColor Yellow
    Write-Host "    Please ensure Python venv is initialized." -ForegroundColor Yellow
} else {
    Write-Host "[+] Virtual environment found." -ForegroundColor Green
}

# Ask user if they want to install/verify dependencies
$InstallDeps = Read-Host "Do you want to install/update Python and Node dependencies? (y/N)"
if ($InstallDeps -eq "y" -or $InstallDeps -eq "Y") {
    Write-Host "`n[+] Installing python dependencies..." -ForegroundColor Cyan
    & cmd /c "cd /d `"$BackendDir`" && venv\Scripts\activate.bat && pip install fastapi uvicorn python-multipart opencv-python-headless numpy"
    
    Write-Host "`n[+] Installing frontend dependencies..." -ForegroundColor Cyan
    & cmd /c "cd /d `"$FrontendDir`" && npm install"
}

Write-Host "`n[+] Starting services in separate terminal windows..." -ForegroundColor Green

# 1. Main API Service (Port 8000)
Write-Host " -> Starting Main API (Port 8000)..." -ForegroundColor Gray
Start-Process powershell -WindowStyle Normal -ArgumentList "-NoExit", "-Command", "cd `"$BackendDir`\"; .\venv\Scripts\Activate.ps1; python api/main.py"

# 2. Age and Gender Service (Port 8001)
Write-Host " -> Starting Age and Gender Service (Port 8001)..." -ForegroundColor Gray
Start-Process powershell -WindowStyle Normal -ArgumentList "-NoExit", "-Command", "cd `"$BackendDir`\"; .\venv\Scripts\Activate.ps1; python age-gender-service/main.py"

# 3. Emotion Service (Port 8002)
Write-Host " -> Starting Emotion Service (Port 8002)..." -ForegroundColor Gray
Start-Process powershell -WindowStyle Normal -ArgumentList "-NoExit", "-Command", "cd `"$BackendDir`\"; .\venv\Scripts\Activate.ps1; python emotion-service/main.py"

# 4. Face Condition Detection Service (Port 8003)
Write-Host " -> Starting Face Condition Detection Service (Port 8003)..." -ForegroundColor Gray
Start-Process powershell -WindowStyle Normal -ArgumentList "-NoExit", "-Command", "cd `"$BackendDir`\"; .\venv\Scripts\Activate.ps1; python face-condition-detection-service/main.py"

# 5. Deepfake Detection Service (Port 8004)
Write-Host " -> Starting Deepfake Detection Service (Port 8004)..." -ForegroundColor Gray
Start-Process powershell -WindowStyle Normal -ArgumentList "-NoExit", "-Command", "cd `"$BackendDir`\"; .\venv\Scripts\Activate.ps1; python deepfake-service/main.py"

# 6. Low-Light Emotion Service (Port 8006)
Write-Host " -> Starting Low-Light Emotion Service (Port 8006)..." -ForegroundColor Gray
Start-Process powershell -WindowStyle Normal -ArgumentList "-NoExit", "-Command", "cd `"$BackendDir`\"; .\venv\Scripts\Activate.ps1; python low-light-service/main.py"

# 7. Frontend Dev Server (Port 3000)
Write-Host " -> Starting Next.js Frontend (Port 3000)..." -ForegroundColor Gray
Start-Process powershell -WindowStyle Normal -ArgumentList "-NoExit", "-Command", "cd `"$FrontendDir`\"; npm run dev"

Write-Host "`n==============================================" -ForegroundColor Green
Write-Host " All services have been launched!" -ForegroundColor Green
Write-Host " Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host " Backend status check: http://localhost:8000" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host "You can close this main terminal. Keep the new windows open while running the app."
