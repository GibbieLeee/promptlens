/**
 * Утилиты для работы с localStorage
 */

/**
 * Безопасное чтение из localStorage
 * @param {string} key - Ключ
 * @param {any} defaultValue - Значение по умолчанию
 * @returns {any}
 */
export function safeGetItem(key, defaultValue = null) {
  try {
    if (typeof localStorage === "undefined") return defaultValue;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (error) {
    console.warn(`Failed to read from localStorage (${key}):`, error);
    return defaultValue;
  }
}

/**
 * Безопасная запись в localStorage
 * @param {string} key - Ключ
 * @param {any} value - Значение
 * @returns {boolean} Успешность операции
 */
export function safeSetItem(key, value) {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Failed to write to localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Безопасное чтение строки из localStorage
 * @param {string} key - Ключ
 * @param {string} defaultValue - Значение по умолчанию
 * @returns {string}
 */
export function safeGetString(key, defaultValue = "") {
  try {
    if (typeof localStorage === "undefined") return defaultValue;
    return localStorage.getItem(key) || defaultValue;
  } catch (error) {
    console.warn(`Failed to read string from localStorage (${key}):`, error);
    return defaultValue;
  }
}

/**
 * Безопасная запись строки в localStorage
 * @param {string} key - Ключ
 * @param {string} value - Значение
 * @returns {boolean} Успешность операции
 */
export function safeSetString(key, value) {
  try {
    if (typeof localStorage === "undefined") return false;
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Failed to write string to localStorage (${key}):`, error);
    return false;
  }
}

