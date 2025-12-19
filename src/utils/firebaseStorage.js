/**
 * Утилиты для работы с Firebase Storage
 */

import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { compressImage } from './imageCompression';

const storage = getStorage();

/**
 * Загружает изображение в Firebase Storage
 * @param {File} file - Файл для загрузки
 * @param {string} userId - ID пользователя
 * @param {string} imageId - Уникальный ID изображения
 * @returns {Promise<string>} URL загруженного изображения
 */
export async function uploadImage(file, userId, imageId) {
  try {
    // Сжимаем изображение перед загрузкой
    const compressedBlob = await compressImage(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.85,
      outputFormat: 'image/webp'
    });

    // Создаем путь для хранения
    const filePath = `users/${userId}/images/${imageId}.webp`;
    const storageRef = ref(storage, filePath);

    // Загружаем файл
    const snapshot = await uploadBytes(storageRef, compressedBlob, {
      contentType: 'image/webp',
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        originalName: file.name
      }
    });

    // Получаем URL загруженного файла
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Failed to upload image:', error);
    
    // Более детальная обработка ошибок
    if (error.code === 'storage/unauthorized') {
      throw new Error('Storage: Permission denied. Check security rules.');
    } else if (error.code === 'storage/canceled') {
      throw new Error('Storage: Upload canceled.');
    } else if (error.code === 'storage/quota-exceeded') {
      throw new Error('Storage: Quota exceeded.');
    } 
    
    // Определение CORS ошибок - проверяем различные признаки
    const errorMessage = error.message?.toLowerCase() || '';
    const errorString = String(error).toLowerCase();
    const isCorsError = 
      errorMessage.includes('cors') ||
      errorMessage.includes('preflight') ||
      errorMessage.includes('access-control') ||
      errorMessage.includes('cross-origin') ||
      errorString.includes('cors') ||
      errorString.includes('preflight') ||
      errorString.includes('access-control') ||
      errorString.includes('cross-origin') ||
      error.code === 'storage/unknown' && errorMessage.includes('network') ||
      (error.serverResponse && error.serverResponse.status === 0); // Network error часто означает CORS
    
    if (isCorsError) {
      throw new Error('Storage: CORS error. Check Firebase Storage rules and CORS configuration. See CORS_FIX.md for details.');
    } else {
      throw new Error(`Storage upload failed: ${error.message || 'Unknown error'}`);
    }
  }
}

/**
 * Удаляет изображение из Firebase Storage
 * @param {string} userId - ID пользователя
 * @param {string} imageId - ID изображения для удаления
 * @returns {Promise<void>}
 */
export async function deleteImage(userId, imageId) {
  try {
    const filePath = `users/${userId}/images/${imageId}.webp`;
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
  } catch (error) {
    // Игнорируем ошибку, если файл не найден
    if (error.code === 'storage/object-not-found') {
      return;
    }
    console.error('Failed to delete image:', error);
    throw error;
  }
}

/**
 * Получает URL изображения из Storage
 * @param {string} userId - ID пользователя
 * @param {string} imageId - ID изображения
 * @returns {Promise<string>} URL изображения
 */
export async function getImageURL(userId, imageId) {
  try {
    const filePath = `users/${userId}/images/${imageId}.webp`;
    const storageRef = ref(storage, filePath);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error('Failed to get image URL:', error);
    throw error;
  }
}

/**
 * Загружает файл из Storage по URL и конвертирует в File
 * @param {string} imageUrl - URL изображения из Storage
 * @param {string} filename - Имя файла
 * @returns {Promise<File>} Файл изображения
 */
export async function downloadImageAsFile(imageUrl, filename = 'image.webp') {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || 'image/webp' });
  } catch (error) {
    console.error('Failed to download image as file:', error);
    throw error;
  }
}

