/**
 * Константы приложения
 */

// Валидные типы файлов для загрузки
export const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Максимальный размер файла (10 MB)
export const MAX_SIZE = 10 * 1024 * 1024;


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
  SAVED: "saved",
  SETTINGS: "settings",
};

// Lottie анимация для загрузки
export const LOADING_ANIMATION_URL = "https://lottie.host/620b0535-fab7-497b-a959-eaa1aa68c8c7/mxvQ1zMQvz.lottie";

