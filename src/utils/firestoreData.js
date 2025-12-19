/**
 * Утилиты для работы с Firestore - сохранение и загрузка данных пользователя
 */

import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { uploadImage, deleteImage, downloadImageAsFile } from './firebaseStorage';
import { createThumbnail } from './imageCompression';
import { dataURLtoFile } from './file';
import logger from './logger';

/**
 * Получает или создает профиль пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<Object>} Данные пользователя
 */
export async function getUserProfile(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Создаем новый профиль
      const newProfile = {
        credits: 10000, // Начальный баланс для тестирования
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(userRef, newProfile);
      return { ...newProfile, uid: userId };
    }

    return { ...userSnap.data(), uid: userId };
  } catch (error) {
    logger.error('Failed to get user profile:', error);
    throw error;
  }
}

/**
 * Обновляет кредиты пользователя
 * @param {string} userId - ID пользователя
 * @param {number} credits - Новое количество кредитов
 * @returns {Promise<void>}
 */
export async function updateUserCredits(userId, credits) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      credits,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    logger.error('Failed to update credits:', error);
    throw error;
  }
}

/**
 * Списывает кредиты у пользователя
 * @param {string} userId - ID пользователя
 * @param {number} amount - Количество кредитов для списания
 * @returns {Promise<{success: boolean, newBalance: number, error?: string}>}
 */
export async function deductUserCredits(userId, amount) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, newBalance: 0, error: 'User not found' };
    }

    const currentCredits = userSnap.data().credits || 0;

    if (currentCredits < amount) {
      return { success: false, newBalance: currentCredits, error: 'Insufficient credits' };
    }

    const newBalance = currentCredits - amount;
    await updateDoc(userRef, {
      credits: newBalance,
      updatedAt: serverTimestamp()
    });

    return { success: true, newBalance };
  } catch (error) {
    logger.error('Failed to deduct credits:', error);
    return { success: false, newBalance: 0, error: error.message };
  }
}

/**
 * Добавляет кредиты пользователю
 * @param {string} userId - ID пользователя
 * @param {number} amount - Количество кредитов для добавления
 * @returns {Promise<{success: boolean, newBalance: number}>}
 */
export async function addUserCredits(userId, amount) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, newBalance: 0 };
    }

    const currentCredits = userSnap.data().credits || 0;
    const newBalance = currentCredits + amount;

    await updateDoc(userRef, {
      credits: newBalance,
      updatedAt: serverTimestamp()
    });

    return { success: true, newBalance };
  } catch (error) {
    logger.error('Failed to add credits:', error);
    return { success: false, newBalance: 0 };
  }
}

// ============================================
// СОХРАНЕННЫЕ ПРОМПТЫ (SAVED PROMPTS)
// ============================================

/**
 * Загружает все сохраненные промпты пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<Array>} Массив сохраненных промптов
 */
export async function getSavedPrompts(userId) {
  try {
    const promptsRef = collection(db, 'users', userId, 'savedPrompts');
    const q = query(promptsRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    const prompts = [];
    snapshot.forEach((doc) => {
      prompts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return prompts;
  } catch (error) {
    logger.error('Failed to get saved prompts:', error);
    return [];
  }
}

/**
 * Сохраняет промпт в избранное
 * @param {string} userId - ID пользователя
 * @param {Object} promptData - Данные промпта
 * @returns {Promise<string>} ID сохраненного промпта
 */
export async function savePrompt(userId, promptData) {
  try {
    const { id, image, prompt, imageFile } = promptData;
    
    logger.debug('📝 Saving prompt:', { 
      id, 
      hasImage: !!image, 
      hasImageFile: !!imageFile,
      imageType: image?.startsWith('data:') ? 'Data URL' : image?.startsWith('http') ? 'Storage URL' : 'unknown'
    });
    
    let imageUrl = image;

    // Важно: Избранное должно быть независимым от чата!
    // Загружаем изображение с отдельным ID для избранного
    const savedImageId = `saved-${id}`;

    if (imageFile) {
      // Если есть файл, загружаем в Storage с префиксом "saved-"
      try {
        imageUrl = await uploadImage(imageFile, userId, savedImageId);
        logger.success('✓ Uploaded file to Storage as:', savedImageId);
      } catch (error) {
        logger.warn('Failed to upload image to Storage for saved prompt, using thumbnail:', error);
        imageUrl = image; // Fallback на Data URL
      }
    } else if (image) {
      // Если передан Data URL или Storage URL из чата
      if (image.startsWith('data:')) {
        // Это Data URL (миниатюра) - загружаем в Storage с новым ID
        try {
          const file = dataURLtoFile(image, `saved-${id}.webp`);
          if (file) {
            imageUrl = await uploadImage(file, userId, savedImageId);
            logger.success('✓ Converted Data URL and uploaded as:', savedImageId);
          }
        } catch (error) {
          logger.warn('Failed to convert and upload Data URL for saved prompt:', error);
          imageUrl = image; // Используем Data URL как есть
        }
      } else if (image.startsWith('http')) {
        // Это Storage URL из чата - создаем ОТДЕЛЬНУЮ КОПИЮ для избранного
        logger.info('🔄 Creating independent copy from chat Storage URL...');
        try {
          // Скачиваем изображение из Storage
          const file = await downloadImageAsFile(image, `saved-${id}.webp`);
          // Загружаем заново с новым ID
          imageUrl = await uploadImage(file, userId, savedImageId);
          logger.success('✅ Created independent copy:', savedImageId);
        } catch (error) {
          logger.warn('⚠️ Failed to copy Storage image, using original URL:', error.message);
          // Fallback: используем оригинальный URL (не идеально, но работает)
          imageUrl = image;
        }
      }
    }

    const promptRef = doc(db, 'users', userId, 'savedPrompts', id);
    const data = {
      prompt,
      imageUrl: imageUrl || null,
      timestamp: serverTimestamp()
    };

    await setDoc(promptRef, data);
    return imageUrl || null;
  } catch (error) {
    logger.error('Failed to save prompt:', error);
    throw error;
  }
}

/**
 * Удаляет сохраненный промпт
 * @param {string} userId - ID пользователя
 * @param {string} promptId - ID промпта
 * @returns {Promise<void>}
 */
export async function deleteSavedPrompt(userId, promptId) {
  try {
    const promptRef = doc(db, 'users', userId, 'savedPrompts', promptId);
    await deleteDoc(promptRef);
    
    // Удаляем изображение избранного из Storage (с префиксом "saved-")
    // Это не влияет на изображение в чате, так как у них разные ID
    try {
      await deleteImage(userId, `saved-${promptId}`);
    } catch (error) {
      // Игнорируем ошибку (изображения может не быть, если это Data URL)
      logger.debug('Could not delete saved image from Storage:', error.message);
    }
  } catch (error) {
    logger.error('Failed to delete saved prompt:', error);
    throw error;
  }
}

// ============================================
// ИСТОРИЯ ЧАТА (CHAT HISTORY)
// ============================================

/**
 * Загружает историю чата пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<Array>} Массив сообщений чата
 */
export async function getChatHistory(userId) {
  try {
    const chatRef = collection(db, 'users', userId, 'chatHistory');
    const q = query(chatRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);

    const history = [];
    snapshot.forEach((doc) => {
      history.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return history;
  } catch (error) {
    logger.error('Failed to get chat history:', error);
    return [];
  }
}

/**
 * Сохраняет сообщение в истории чата
 * @param {string} userId - ID пользователя
 * @param {Object} messageData - Данные сообщения
 * @returns {Promise<string>} ID сообщения
 */
export async function saveChatMessage(userId, messageData) {
  try {
    const { id, image, imageFile, prompt, status, phases } = messageData;
    
    let imageUrl = image; // Это может быть Data URL (миниатюра) или URL из Storage

    // Загружаем изображение в Storage
    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile, userId, id);
      } catch (error) {
        logger.warn('Failed to upload image to Storage, using thumbnail fallback:', error.message);
        // Если не удалось загрузить в Storage, используем миниатюру (image) как fallback
        imageUrl = image;
      }
    }

    const messageRef = doc(db, 'users', userId, 'chatHistory', id);
    const data = {
      imageUrl: imageUrl || null, // Сохраняем либо URL из Storage, либо Data URL миниатюры
      prompt: prompt || null,
      status: status || 'generating',
      phases: phases || [],
      timestamp: serverTimestamp()
    };

    await setDoc(messageRef, data);
    return { id, imageUrl }; // Возвращаем URL для обновления локального состояния
  } catch (error) {
    logger.error('Failed to save chat message:', error);
    throw error;
  }
}

/**
 * Обновляет сообщение в истории чата
 * @param {string} userId - ID пользователя
 * @param {string} messageId - ID сообщения
 * @param {Object} updates - Обновления
 * @returns {Promise<void>}
 */
export async function updateChatMessage(userId, messageId, updates) {
  try {
    const messageRef = doc(db, 'users', userId, 'chatHistory', messageId);
    await updateDoc(messageRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    logger.error('Failed to update chat message:', error);
    throw error;
  }
}

/**
 * Удаляет сообщение из истории чата
 * @param {string} userId - ID пользователя
 * @param {string} messageId - ID сообщения
 * @returns {Promise<void>}
 */
export async function deleteChatMessage(userId, messageId) {
  try {
    const messageRef = doc(db, 'users', userId, 'chatHistory', messageId);
    await deleteDoc(messageRef);
    
    // Пытаемся удалить изображение из Storage (если есть)
    try {
      await deleteImage(userId, messageId);
    } catch (error) {
      // Игнорируем ошибку удаления изображения
    }
  } catch (error) {
    logger.error('Failed to delete chat message:', error);
    throw error;
  }
}

/**
 * Удаляет несколько сообщений из истории чата
 * @param {string} userId - ID пользователя
 * @param {string[]} messageIds - Массив ID сообщений
 * @returns {Promise<void>}
 */
export async function deleteChatMessages(userId, messageIds) {
  try {
    // Firestore batch limit is 500 operations
    const BATCH_SIZE = 500;

    // Разбиваем на batch'и
    for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = messageIds.slice(i, Math.min(i + BATCH_SIZE, messageIds.length));
      
      chunk.forEach((messageId) => {
        const messageRef = doc(db, 'users', userId, 'chatHistory', messageId);
        batch.delete(messageRef);
      });

      await batch.commit();
    }

    // Удаляем изображения из Storage
    for (const messageId of messageIds) {
      try {
        await deleteImage(userId, messageId);
      } catch (error) {
        // Игнорируем ошибку удаления изображения
      }
    }
  } catch (error) {
    logger.error('Failed to delete chat messages:', error);
    throw error;
  }
}

/**
 * Очищает всю историю чата пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<void>}
 */
export async function clearChatHistory(userId) {
  try {
    const chatRef = collection(db, 'users', userId, 'chatHistory');
    const snapshot = await getDocs(chatRef);

    // Firestore batch limit is 500 operations
    const BATCH_SIZE = 500;
    const docs = snapshot.docs;
    const imageIds = [];

    // Разбиваем на batch'и по 500 документов
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, Math.min(i + BATCH_SIZE, docs.length));
      
      chunk.forEach((doc) => {
        batch.delete(doc.ref);
        imageIds.push(doc.id);
      });

      await batch.commit();
    }

    // Удаляем изображения из Storage
    for (const imageId of imageIds) {
      try {
        await deleteImage(userId, imageId);
      } catch (error) {
        // Игнорируем ошибку удаления изображения
      }
    }
  } catch (error) {
    logger.error('Failed to clear chat history:', error);
    throw error;
  }
}


