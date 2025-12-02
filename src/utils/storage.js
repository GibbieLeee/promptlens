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

/**
 * Загружает сохраненные промпты из localStorage
 * @param {string} key - Ключ для хранения
 * @returns {Array} Массив сохраненных промптов
 */
export function loadSavedPrompts(key) {
  return safeGetItem(key, []);
}

/**
 * Сохраняет промпты в localStorage с оптимизацией размера
 * @param {string} key - Ключ для хранения
 * @param {Array} saved - Массив промптов для сохранения
 */
export function saveSavedPrompts(key, saved) {
  // Ограничиваем количество сохраненных промптов (максимум 20)
  const limitedSaved = saved.slice(-20);

  try {
    const serialized = JSON.stringify(limitedSaved);
    // Проверяем размер (localStorage обычно ~5MB)
    if (serialized.length > 3 * 1024 * 1024) {
      // Если слишком большой, сохраняем без изображений
      const withoutImages = limitedSaved.map(({ image, ...rest }) => rest);
      safeSetItem(key, withoutImages);
      console.warn("Saved prompts too large, stored without images");
    } else {
      safeSetItem(key, limitedSaved);
    }
  } catch (error) {
    // Fallback: сохраняем без изображений
    const withoutImages = limitedSaved.map(({ image, ...rest }) => rest);
    safeSetItem(key, withoutImages);
    console.warn("Failed to save with images, stored without images:", error);
  }
}

/**
 * Удаляет элемент из localStorage
 * @param {string} key - Ключ для удаления
 */
export function removeItem(key) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove from localStorage (${key}):`, error);
  }
}
