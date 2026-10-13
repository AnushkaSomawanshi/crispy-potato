# Windows PowerShell Script to run Distributed Satellite Mission Control via Docker Compose

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Distributed Satellite Mission Control - Docker Compose" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Docker Compose Stack
Write-Host "`n[1/2] Starting Docker Compose stack (9 containers)..." -ForegroundColor Yellow
docker compose up -d

# 2. Check running containers
Write-Host "`n[2/2] Inspecting running containers..." -ForegroundColor Yellow
docker ps --filter "name=mission-control" --filter "name=satellite"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " Docker Compose Stack Running!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Frontend UI:                http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend API:                http://localhost:8000" -ForegroundColor Cyan
Write-Host "API Health Check:           http://localhost:8000/api/health" -ForegroundColor Cyan
Write-Host "RabbitMQ Management:        http://localhost:15672 (guest/guest)" -ForegroundColor Cyan
Write-Host "Ground Blackout Mode:       http://localhost:3000/blackout" -ForegroundColor Cyan
Write-Host "Synchronization Lab:        http://localhost:3000/sync-lab" -ForegroundColor Cyan
Write-Host "Paradigms & Cloud Lab:      http://localhost:3000/paradigms-lab" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
