/**
 * Утилиты для работы с файлами
 */

// Разрешенные MIME типы для изображений
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Конвертирует Data URL в File объект
 * @param {string} dataurl - Data URL строка
 * @param {string} filename - Имя файла
 * @returns {File|null} File объект или null при ошибке
 */
export function dataURLtoFile(dataurl, filename) {
  if (!dataurl) return null;
  try {
    const arr = dataurl.split(",");
    if (arr.length < 2) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    
    // Валидация MIME типа
    if (!ALLOWED_MIME_TYPES.includes(mime)) {
      console.warn(`Invalid MIME type: ${mime}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
      return null;
    }
    
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  } catch (error) {
    console.error("Error converting dataURL to File:", error);
    return null;
  }
}

