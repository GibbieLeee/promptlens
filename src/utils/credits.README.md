# Система кредитов - Инструкция по переходу на реальную систему

## Текущая реализация (тестовая)

Сейчас система работает полностью локально через `localStorage`. Все функции находятся в `src/utils/credits.js`.

## Как переключиться на реальную систему

### 1. Заменить функции в `src/utils/credits.js`

#### `loadCredits()` → API запрос
```javascript
// Было:
export function loadCredits() {
  return parseFloat(localStorage.getItem(CREDITS_STORAGE_KEY)) || INITIAL_CREDITS;
}

// Станет:
export async function loadCredits(userId) {
  const response = await fetch(`/api/users/${userId}/credits`);
  const data = await response.json();
  return data.balance;
}
```

#### `deductCredits()` → API запрос
```javascript
// Было:
export function deductCredits(amount) {
  const balance = loadCredits();
  saveCredits(balance - amount);
  return { success: true, newBalance: balance - amount };
}

// Станет:
export async function deductCredits(amount, userId) {
  const response = await fetch(`/api/users/${userId}/credits/deduct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  });
  const data = await response.json();
  return { success: data.success, newBalance: data.newBalance };
}
```

### 2. Обновить `App.jsx`

Изменить синхронные вызовы на асинхронные:

```javascript
// Было:
const [credits, setCredits] = useState(() => loadCredits());

// Станет:
const [credits, setCredits] = useState(0);
useEffect(() => {
  loadCredits(userId).then(setCredits);
}, [userId]);
```

```javascript
// Было:
const deductionResult = deductCredits(GENERATION_COST);
setCredits(deductionResult.newBalance);

// Станет:
const deductionResult = await deductCredits(GENERATION_COST, userId);
if (deductionResult.success) {
  setCredits(deductionResult.newBalance);
}
```

### 3. Добавить обработку ошибок сети

Добавить проверки на ошибки API и fallback на локальное состояние при оффлайн режиме.

### 4. Настройки

- `INITIAL_CREDITS` - можно оставить для новых пользователей
- `GENERATION_COST` - стоимость генерации (можно сделать динамической)
- `CREDITS_STORAGE_KEY` - можно использовать для кеширования баланса

## Текущие возможности

- ✅ Автоматическое списание при генерации
- ✅ Проверка баланса перед операцией
- ✅ Возврат кредитов при ошибках/отмене
- ✅ Сохранение в localStorage
- ✅ Форматирование для отображения (1.560 вместо 1560)

## Тестирование

Для тестирования можно использовать функции:
- `resetCredits()` - сбросить баланс до начального
- `addCredits(amount)` - добавить кредиты вручную

В консоли браузера:
```javascript
import { resetCredits, addCredits } from './utils/credits';
resetCredits(); // Сбросить до 1000
addCredits(500); // Добавить 500 кредитов
```

