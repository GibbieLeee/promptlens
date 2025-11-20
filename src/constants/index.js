/**
 * Константы приложения
 */

// Валидные типы файлов для загрузки
export const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Максимальный размер файла (10 MB)
export const MAX_SIZE = 10 * 1024 * 1024;

// Ключи для localStorage
export const STORAGE_KEYS = {
  HISTORY: "promptlens_history_v1",
  SAVED_PROMPTS: "promptlens_saved_v1",
};

// Статусы генерации
export const GENERATION_STATUS = {
  GENERATING: "generating",
  DONE: "done",
  STOPPED: "stopped",
  ERROR: "error",
};

// Вкладки приложения
export const TABS = {
  CHAT: "chat",
  FAVORITES: "favorites",
  SETTINGS: "settings",
};

