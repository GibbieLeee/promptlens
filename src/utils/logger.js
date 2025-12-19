/**
 * Логгер с поддержкой DEBUG mode для development окружения
 * В production console.log автоматически отключается
 */

// Определяем DEBUG mode из import.meta.env или process.env
const IS_DEV = import.meta.env?.DEV ?? import.meta.env?.MODE === 'development' ?? false;

// Можно также включить debug mode через localStorage для production debugging
const DEBUG_ENABLED = IS_DEV || (typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_MODE') === 'true');

/**
 * Цветовая схема для различных типов логов
 */
const LOG_COLORS = {
  info: '#3b82f6',    // blue
  success: '#10b981', // green
  warn: '#f59e0b',    // amber
  error: '#ef4444',   // red
  debug: '#8b5cf6',   // purple
};

/**
 * Форматирует сообщение с префиксом и стилем
 */
const formatMessage = (type, message, color) => {
  if (!DEBUG_ENABLED) return;
  
  const prefix = `[${type.toUpperCase()}]`;
  const style = `color: ${color}; font-weight: bold;`;
  
  return { prefix, style };
};

/**
 * Logger API
 */
const logger = {
  /**
   * Основной информационный лог
   * @param {string} message - Сообщение
   * @param {...any} args - Дополнительные аргументы
   */
  log: (message, ...args) => {
    if (!DEBUG_ENABLED) return;
    console.log(message, ...args);
  },

  /**
   * Информационный лог с префиксом
   * @param {string} message - Сообщение
   * @param {...any} args - Дополнительные аргументы
   */
  info: (message, ...args) => {
    if (!DEBUG_ENABLED) return;
    const { prefix, style } = formatMessage('info', message, LOG_COLORS.info);
    console.log(`%c${prefix}`, style, message, ...args);
  },

  /**
   * Лог успешных операций
   * @param {string} message - Сообщение
   * @param {...any} args - Дополнительные аргументы
   */
  success: (message, ...args) => {
    if (!DEBUG_ENABLED) return;
    const { prefix, style } = formatMessage('success', message, LOG_COLORS.success);
    console.log(`%c${prefix}`, style, message, ...args);
  },

  /**
   * Предупреждение
   * @param {string} message - Сообщение
   * @param {...any} args - Дополнительные аргументы
   */
  warn: (message, ...args) => {
    if (!DEBUG_ENABLED) return;
    const { prefix, style } = formatMessage('warn', message, LOG_COLORS.warn);
    console.warn(`%c${prefix}`, style, message, ...args);
  },

  /**
   * Ошибка (всегда выводится, даже в production)
   * @param {string} message - Сообщение
   * @param {...any} args - Дополнительные аргументы
   */
  error: (message, ...args) => {
    const { prefix, style } = formatMessage('error', message, LOG_COLORS.error);
    console.error(`%c${prefix}`, style, message, ...args);
  },

  /**
   * Debug лог (только в dev режиме)
   * @param {string} message - Сообщение
   * @param {...any} args - Дополнительные аргументы
   */
  debug: (message, ...args) => {
    if (!DEBUG_ENABLED) return;
    const { prefix, style } = formatMessage('debug', message, LOG_COLORS.debug);
    console.log(`%c${prefix}`, style, message, ...args);
  },

  /**
   * Групповой лог (складная группа)
   * @param {string} groupName - Название группы
   * @param {Function} callback - Callback с логами внутри группы
   */
  group: (groupName, callback) => {
    if (!DEBUG_ENABLED) return;
    console.group(groupName);
    callback?.();
    console.groupEnd();
  },

  /**
   * Таблица (для объектов и массивов)
   * @param {any} data - Данные для отображения
   */
  table: (data) => {
    if (!DEBUG_ENABLED) return;
    console.table(data);
  },

  /**
   * Таймер для измерения производительности
   * @param {string} label - Метка таймера
   */
  time: (label) => {
    if (!DEBUG_ENABLED) return;
    console.time(label);
  },

  /**
   * Остановка таймера
   * @param {string} label - Метка таймера
   */
  timeEnd: (label) => {
    if (!DEBUG_ENABLED) return;
    console.timeEnd(label);
  },
};

/**
 * Хелперы для включения/отключения debug mode в runtime
 */
export const enableDebugMode = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('DEBUG_MODE', 'true');
    console.log('✅ Debug mode enabled. Reload page to apply.');
  }
};

export const disableDebugMode = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('DEBUG_MODE');
    console.log('❌ Debug mode disabled. Reload page to apply.');
  }
};

export default logger;

