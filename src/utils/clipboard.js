/**
 * Утилиты для работы с буфером обмена
 */

/**
 * Копирует текст в буфер обмена с fallback для старых браузеров
 * @param {string} text - Текст для копирования
 * @returns {Promise<boolean>} true если успешно, false при ошибке
 */
export async function copyToClipboard(text) {
  if (!text || typeof text !== "string") {
    console.warn("Invalid text for copy:", text);
    return false;
  }

  // Метод 1: Современный Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("Clipboard API failed, trying fallback:", err);
    }
  }

  // Метод 2: Fallback через временный textarea
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.cssText = "position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;boxShadow:none;background:transparent;opacity:0";

  document.body.appendChild(textarea);

  try {
    textarea.focus();
    textarea.select();
  } catch (focusErr) {
    textarea.select();
  }

  try {
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    document.body.removeChild(textarea);
    console.error("Copy failed:", err);
    return false;
  }
}

