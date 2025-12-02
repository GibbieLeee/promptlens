# Скрипт для настройки CORS в Firebase Storage
# Использование: .\setup-cors.ps1

Write-Host "=== Настройка CORS для Firebase Storage ===" -ForegroundColor Cyan
Write-Host ""

# Проверка наличия gcloud
$gcloudPath = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloudPath) {
    Write-Host "❌ Google Cloud SDK не найден!" -ForegroundColor Red
    Write-Host "Установите Google Cloud SDK: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Или используйте Google Cloud Console:" -ForegroundColor Yellow
    Write-Host "1. Откройте https://console.cloud.google.com/" -ForegroundColor Yellow
    Write-Host "2. Выберите ваш проект" -ForegroundColor Yellow
    Write-Host "3. Cloud Storage → Browser → ваш bucket → Configuration → CORS" -ForegroundColor Yellow
    exit 1
}

# Проверка наличия cors.json
if (-not (Test-Path "cors.json")) {
    Write-Host "❌ Файл cors.json не найден!" -ForegroundColor Red
    exit 1
}

# Чтение bucket из .env
$bucket = $null
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "VITE_FIREBASE_STORAGE_BUCKET=(.+)") {
        $bucket = $matches[1].Trim()
    }
}

if (-not $bucket) {
    Write-Host "Введите имя вашего Storage bucket:" -ForegroundColor Yellow
    Write-Host "(Например: promptlens-gibbie.firebasestorage.app)" -ForegroundColor Gray
    $bucket = Read-Host "Bucket name"
}

if (-not $bucket) {
    Write-Host "❌ Имя bucket не указано!" -ForegroundColor Red
    exit 1
}

Write-Host "Bucket: $bucket" -ForegroundColor Green
Write-Host ""

# Проверка аутентификации
Write-Host "Проверка аутентификации..." -ForegroundColor Cyan
try {
    $token = gcloud auth print-access-token 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Требуется аутентификация" -ForegroundColor Yellow
        Write-Host "Выполняется: gcloud auth login" -ForegroundColor Cyan
        gcloud auth login
    } else {
        Write-Host "✓ Аутентификация успешна" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Ошибка при проверке аутентификации" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Применение CORS конфигурации
Write-Host "Применение CORS конфигурации..." -ForegroundColor Cyan
try {
    $result = gsutil cors set cors.json "gs://$bucket" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ CORS конфигурация успешно применена!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Проверка конфигурации..." -ForegroundColor Cyan
        gsutil cors get "gs://$bucket"
    } else {
        Write-Host "❌ Ошибка при применении CORS:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        Write-Host ""
        Write-Host "Попробуйте:" -ForegroundColor Yellow
        Write-Host "1. Запустить PowerShell от имени администратора" -ForegroundColor Yellow
        Write-Host "2. Или использовать Google Cloud Console (см. CORS_FIX.md)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Ошибка: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Альтернативный способ:" -ForegroundColor Yellow
    Write-Host "Используйте Google Cloud Console для настройки CORS" -ForegroundColor Yellow
    Write-Host "См. инструкции в CORS_FIX.md" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Готово!" -ForegroundColor Green

