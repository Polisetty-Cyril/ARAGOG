Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Starting ARAGOG..." -ForegroundColor Cyan
    Write-Host "App will be available at: http://localhost:7860" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    python app.py
} else {
    Write-Host "Installation failed!" -ForegroundColor Red
}
