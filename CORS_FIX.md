# Исправление ошибок CORS в Firebase Storage

## Проблема

При загрузке изображений в Firebase Storage возникают ошибки CORS:

```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
It does not have HTTP ok status.
```

## Причина

Firebase Storage требует настройки CORS (Cross-Origin Resource Sharing) для разрешения запросов из браузера. Без правильной конфигурации CORS браузер блокирует запросы к Firebase Storage из вашего локального приложения.

## Решение

### Вариант 1: Использование gsutil (Рекомендуется)

1. **Установите Google Cloud SDK** (включает gsutil):
   - Windows: https://cloud.google.com/sdk/docs/install
   - Или используйте: `pip install gsutil`

2. **⚠️ ВАЖНО: Запустите PowerShell или CMD от имени администратора**
   - Правый клик на PowerShell/CMD → "Запуск от имени администратора"
   - Это необходимо для доступа к файлам Google Cloud SDK

3. **Перейдите в директорию проекта**:
   ```bash
   cd C:\Users\Gibbie\Desktop\ai-prompt-generator-5.0
   ```

4. **Аутентифицируйтесь в Google Cloud**:
   ```bash
   gcloud auth login
   ```

5. **Установите проект по умолчанию**:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```
   (Замените `YOUR_PROJECT_ID` на ваш Firebase Project ID)

6. **Примените CORS конфигурацию**:
   ```bash
   gsutil cors set cors.json gs://YOUR_STORAGE_BUCKET
   ```
   (Замените `YOUR_STORAGE_BUCKET` на имя вашего Storage bucket из `.env`)

   Пример:
   ```bash
   gsutil cors set cors.json gs://promptlens-gibbie.firebasestorage.app
   ```

**Если ошибка "Permission denied" продолжается:**
- Убедитесь, что запустили терминал от имени администратора
- Или попробуйте использовать полный путь к gsutil:
  ```bash
  "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gsutil.cmd" cors set cors.json gs://promptlens-gibbie.firebasestorage.app
  ```

### Вариант 2: Использование Google Cloud Console (Альтернатива)

Если gsutil не работает из-за проблем с правами доступа:

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект
3. Перейдите в **Cloud Storage** → **Browser**
4. Выберите ваш bucket (`promptlens-gibbie.firebasestorage.app`)
5. Перейдите на вкладку **Configuration**
6. В разделе **CORS** нажмите **Edit**
7. Вставьте содержимое из `cors.json` (только JSON без внешних квадратных скобок массива)
8. Сохраните изменения

**Важно:** В Cloud Console нужно вставить только объект из массива:
```json
{
  "origin": ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
  "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
  "maxAgeSeconds": 3600,
  "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable", "x-goog-upload-command", "x-goog-upload-header-content-length", "x-goog-upload-header-content-type"]
}
```

### Вариант 3: Использование REST API напрямую

Можно использовать curl или PowerShell для настройки CORS через REST API:

```powershell
# Сначала получите access token
$token = gcloud auth print-access-token

# Затем примените CORS конфигурацию
$bucket = "promptlens-gibbie.firebasestorage.app"
$corsConfig = Get-Content cors.json -Raw

Invoke-RestMethod -Method PUT `
  -Uri "https://storage.googleapis.com/storage/v1/b/$bucket" `
  -Headers @{Authorization="Bearer $token"} `
  -ContentType "application/json" `
  -Body "{`"cors`": $corsConfig}"
```

### Вариант 4: Использование Firebase Admin SDK (Требует backend)

Если вы не можете использовать gsutil, можно настроить CORS через Firebase Admin SDK на сервере, но это требует дополнительной настройки backend.

## Проверка конфигурации

После применения CORS конфигурации, проверьте что она применена:

```bash
gsutil cors get gs://YOUR_STORAGE_BUCKET
```

Должна отобразиться конфигурация из `cors.json`.

## Текущая конфигурация CORS

Файл `cors.json` уже настроен для разрешения запросов с:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (альтернативный порт)
- `http://127.0.0.1:5173` (IP адрес localhost)

## Дополнительные шаги для production

Для production окружения, добавьте ваш домен в `cors.json`:

```json
[
  {
    "origin": [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "https://your-production-domain.com"
    ],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable"]
  }
]
```

Затем снова примените:
```bash
gsutil cors set cors.json gs://YOUR_STORAGE_BUCKET
```

## Важные замечания

1. **OPTIONS метод**: Убедитесь, что в конфигурации есть метод `OPTIONS` (для preflight запросов)
2. **responseHeader**: Добавьте `x-goog-resumable` если используете resumable uploads
3. **maxAgeSeconds**: Определяет, как долго браузер кэширует результат preflight запроса

## Альтернативное решение (если gsutil недоступен)

Если вы не можете использовать gsutil, можно временно использовать Firebase Storage Rules для разрешения доступа, но это не решает проблему CORS полностью. Лучшее решение - настроить CORS через gsutil.

## Проверка после исправления

После применения CORS конфигурации:
1. Перезапустите dev server
2. Попробуйте загрузить изображение
3. Ошибки CORS должны исчезнуть

Если ошибки продолжаются:
- Проверьте, что bucket name правильный
- Убедитесь, что конфигурация применена: `gsutil cors get gs://YOUR_BUCKET`
- Проверьте консоль браузера на наличие других ошибок

