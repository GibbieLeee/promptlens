/**
 * Утилита для управления кредитами
 * 
 * В будущем можно легко заменить на реальный API:
 * - Заменить loadCredits() на запрос к API
 * - Заменить deductCredits() на запрос к API
 * - Добавить синхронизацию с сервером
 */

const CREDITS_STORAGE_KEY = "promptlens_credits_v1";

// Начальный баланс для новых пользователей (тестовый)
const INITIAL_CREDITS = 1000;

// Стоимость генерации одного промпта (можно настроить)
const GENERATION_COST = 10;

/**
 * Загружает баланс кредитов из localStorage
 * @returns {number} Текущий баланс кредитов
 */
export function loadCredits() {
  try {
    const raw = localStorage.getItem(CREDITS_STORAGE_KEY);
    if (raw === null) {
      // Первый запуск - устанавливаем начальный баланс
      const initialBalance = INITIAL_CREDITS;
      saveCredits(initialBalance);
      return initialBalance;
    }
    const balance = parseFloat(raw);
    return isNaN(balance) ? INITIAL_CREDITS : balance;
  } catch (error) {
    console.warn("Failed to load credits from localStorage:", error);
    return INITIAL_CREDITS;
  }
}

/**
 * Сохраняет баланс кредитов в localStorage
 * @param {number} balance - Новый баланс
 */
export function saveCredits(balance) {
  try {
    localStorage.setItem(CREDITS_STORAGE_KEY, balance.toString());
  } catch (error) {
    console.warn("Failed to save credits to localStorage:", error);
  }
}

/**
 * Проверяет, достаточно ли кредитов для операции
 * @param {number} required - Требуемое количество кредитов
 * @param {number} currentBalance - Текущий баланс (опционально)
 * @returns {boolean}
 */
export function hasEnoughCredits(required = GENERATION_COST, currentBalance = null) {
  const balance = currentBalance !== null ? currentBalance : loadCredits();
  return balance >= required;
}

/**
 * Списывает кредиты (тестовый вариант - только localStorage)
 * 
 * В будущем можно заменить на:
 * async function deductCredits(amount, userId) {
 *   const response = await fetch('/api/credits/deduct', {
 *     method: 'POST',
 *     body: JSON.stringify({ amount, userId })
 *   });
 *   const data = await response.json();
 *   return data.newBalance;
 * }
 * 
 * @param {number} amount - Количество кредитов для списания
 * @returns {{success: boolean, newBalance: number, error?: string}}
 */
export function deductCredits(amount = GENERATION_COST) {
  try {
    const currentBalance = loadCredits();
    
    if (currentBalance < amount) {
      return {
        success: false,
        newBalance: currentBalance,
        error: "Insufficient credits"
      };
    }
    
    const newBalance = currentBalance - amount;
    saveCredits(newBalance);
    
    return {
      success: true,
      newBalance: newBalance
    };
  } catch (error) {
    console.error("Failed to deduct credits:", error);
    return {
      success: false,
      newBalance: loadCredits(),
      error: error.message
    };
  }
}

/**
 * Добавляет кредиты (для тестирования или бонусов)
 * 
 * В будущем можно заменить на API вызов
 * 
 * @param {number} amount - Количество кредитов для добавления
 * @returns {{success: boolean, newBalance: number}}
 */
export function addCredits(amount) {
  try {
    const currentBalance = loadCredits();
    const newBalance = currentBalance + amount;
    saveCredits(newBalance);
    
    return {
      success: true,
      newBalance: newBalance
    };
  } catch (error) {
    console.error("Failed to add credits:", error);
    return {
      success: false,
      newBalance: loadCredits()
    };
  }
}

/**
 * Сбрасывает баланс до начального значения (для тестирования)
 */
export function resetCredits() {
  saveCredits(INITIAL_CREDITS);
  return INITIAL_CREDITS;
}

/**
 * Форматирует число кредитов для отображения
 * @param {number} credits - Количество кредитов
 * @returns {string} Отформатированная строка (например, "1.560")
 */
export function formatCredits(credits) {
  return credits.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).replace(/,/g, '.');
}

// Экспортируем константы для использования в других местах
export { GENERATION_COST, INITIAL_CREDITS };

