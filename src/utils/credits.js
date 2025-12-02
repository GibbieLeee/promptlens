/**
 * Утилита для управления кредитами
 * 
 * Содержит только константы и функции форматирования.
 * Управление кредитами происходит через Firestore (см. useCredits hook).
 */

// Стоимость генерации одного промпта
const GENERATION_COST = 10;

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
export { GENERATION_COST };

