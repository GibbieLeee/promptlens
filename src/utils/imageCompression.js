/**
 * Утилиты для сжатия изображений перед загрузкой
 */

/**
 * Сжимает изображение до оптимального размера
 * @param {File} file - Исходный файл изображения
 * @param {Object} options - Параметры сжатия
 * @returns {Promise<Blob>} Сжатое изображение
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    outputFormat = 'image/webp'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    reader.onerror = reject;

    img.onload = () => {
      try {
        // Вычисляем новые размеры с сохранением пропорций
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        // Создаем canvas для сжатия
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Рисуем изображение
        ctx.drawImage(img, 0, 0, width, height);

        // Конвертируем в blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          outputFormat,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = reject;

    reader.readAsDataURL(file);
  });
}

/**
 * Конвертирует Blob в File
 * @param {Blob} blob - Blob для конвертации
 * @param {string} fileName - Имя файла
 * @returns {File}
 */
export function blobToFile(blob, fileName) {
  return new File([blob], fileName, { type: blob.type });
}

/**
 * Создает миниатюру изображения для предпросмотра
 * @param {File} file - Исходный файл
 * @returns {Promise<string>} Data URL миниатюры
 */
export async function createThumbnail(file, maxSize = 400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    reader.onerror = reject;

    img.onload = () => {
      try {
        let { width, height } = img;
        
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/webp', 0.7));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = reject;

    reader.readAsDataURL(file);
  });
}

