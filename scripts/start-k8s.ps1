# Windows PowerShell Script to deploy and run Distributed Satellite Mission Control on Docker Desktop Kubernetes

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Distributed Satellite Mission Control - Kubernetes Launch" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify kubectl is available
try {
    $k8sVersion = kubectl version --client -o json | ConvertFrom-Json
    Write-Host "[OK] kubectl detected: $($k8sVersion.clientVersion.gitVersion)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] kubectl CLI not found. Ensure Docker Desktop Kubernetes is enabled in settings." -ForegroundColor Red
    exit 1
}

# 2. Check cluster connection
try {
    $clusterInfo = kubectl cluster-info
    Write-Host "[OK] Connected to Kubernetes cluster (Docker Desktop / kind)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Cannot reach Kubernetes cluster. Start Kubernetes in Docker Desktop settings." -ForegroundColor Red
    exit 1
}

# 3. Apply Kubernetes manifests
Write-Host "`n[1/3] Deploying Kubernetes workloads to namespace 'orbital-mission'..." -ForegroundColor Yellow
kubectl apply -f k8s/

# 4. Wait for core workloads to stabilize
Write-Host "`n[2/3] Waiting for Backend deployment to become Ready..." -ForegroundColor Yellow
kubectl rollout status deployment/mission-control-backend -n orbital-mission --timeout=90s

Write-Host "`n[3/3] Inspecting live Kubernetes resources..." -ForegroundColor Yellow
kubectl get pods,deployments,services -n orbital-mission

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " Deployment Complete & Operational!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Frontend UI (NodePort):     http://localhost:30080" -ForegroundColor Cyan
Write-Host "Mission Overview:           http://localhost:30080/" -ForegroundColor Cyan
Write-Host "Ground Blackout Mode:       http://localhost:30080/blackout" -ForegroundColor Cyan
Write-Host "Synchronization Lab:        http://localhost:30080/sync-lab" -ForegroundColor Cyan
Write-Host "Paradigms & Cloud Lab:      http://localhost:30080/paradigms-lab" -ForegroundColor Cyan
Write-Host "Backend API Health:         http://localhost:8000/api/health" -ForegroundColor Cyan
Write-Host "Interactive API Docs:       http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
