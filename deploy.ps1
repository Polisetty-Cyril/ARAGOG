# Quick deployment script for Hugging Face Spaces
Write-Host "ARAGOG Deployment to Hugging Face Spaces" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
$hfUsername = Read-Host "Enter your Hugging Face username"
$spaceName = Read-Host "Enter Space name (default: aragog-medical-ai)"
if ([string]::IsNullOrWhiteSpace($spaceName)) { $spaceName = "aragog-medical-ai" }

Write-Host ""
Write-Host "Space URL: https://huggingface.co/spaces/$hfUsername/$spaceName" -ForegroundColor Green
Write-Host ""

# Navigate to project
cd "c:\Users\Dell\OneDrive\Desktop\ARAGOG"

# Initialize Git LFS
Write-Host "Setting up Git LFS..." -ForegroundColor Yellow
git lfs install
git lfs track "*.pt" "*.faiss" "*.bin" "medical_qa_checkpoints/**"

# Add remote
Write-Host "Adding Hugging Face remote..." -ForegroundColor Yellow
git remote remove hf 2>$null
git remote add hf "https://huggingface.co/spaces/$hfUsername/$spaceName"

# Stage files
Write-Host "Staging files..." -ForegroundColor Yellow
git add .

# Commit
$commitMsg = Read-Host "Commit message (default: 'Deploy ARAGOG to Hugging Face')"
if ([string]::IsNullOrWhiteSpace($commitMsg)) { $commitMsg = "Deploy ARAGOG to Hugging Face" }
git commit -m $commitMsg

# Push
Write-Host ""
Write-Host "Pushing to Hugging Face..." -ForegroundColor Cyan
Write-Host "   This may take 10-30 minutes for large files..." -ForegroundColor Gray
Write-Host ""

git push hf main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "View your Space: https://huggingface.co/spaces/$hfUsername/$spaceName" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Push failed. Make sure:" -ForegroundColor Red
    Write-Host "   1. Space exists on Hugging Face" -ForegroundColor Yellow
    Write-Host "   2. You are logged in: huggingface-cli login" -ForegroundColor Yellow
}
