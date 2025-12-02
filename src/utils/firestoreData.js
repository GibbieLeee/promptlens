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
import { uploadImage, deleteImage } from './firebaseStorage';
import { createThumbnail } from './imageCompression';
import { dataURLtoFile } from './file';

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
    console.error('Failed to get user profile:', error);
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
    console.error('Failed to update credits:', error);
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
    console.error('Failed to deduct credits:', error);
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
    console.error('Failed to add credits:', error);
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
    console.error('Failed to get saved prompts:', error);
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
    
    let imageUrl = image;

    // Если передан файл изображения, загружаем в Storage
    if (imageFile) {
      imageUrl = await uploadImage(imageFile, userId, id);
    } else if (image && image.startsWith('data:')) {
      // Если изображение в виде data URL, создаем миниатюру
      const file = dataURLtoFile(image, `thumb-${id}.png`);
      if (file) {
        imageUrl = await createThumbnail(file, 400);
      }
    }

    const promptRef = doc(db, 'users', userId, 'savedPrompts', id);
    const data = {
      prompt,
      imageUrl: imageUrl || null,
      timestamp: serverTimestamp()
    };

    await setDoc(promptRef, data);
    return imageUrl || null; // Возвращаем URL для обновления локального состояния
  } catch (error) {
    console.error('Failed to save prompt:', error);
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
    
    // Пытаемся удалить изображение из Storage (если есть)
    try {
      await deleteImage(userId, promptId);
    } catch (error) {
      // Игнорируем ошибку удаления изображения
    }
  } catch (error) {
    console.error('Failed to delete saved prompt:', error);
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
    console.error('Failed to get chat history:', error);
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
    
    let imageUrl = image;

    // Загружаем изображение в Storage
    if (imageFile) {
      imageUrl = await uploadImage(imageFile, userId, id);
    }

    const messageRef = doc(db, 'users', userId, 'chatHistory', id);
    const data = {
      imageUrl: imageUrl || null,
      prompt: prompt || null,
      status: status || 'generating',
      phases: phases || [],
      timestamp: serverTimestamp()
    };

    await setDoc(messageRef, data);
    return { id, imageUrl }; // Возвращаем URL для обновления локального состояния
  } catch (error) {
    console.error('Failed to save chat message:', error);
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
    console.error('Failed to update chat message:', error);
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

    // Используем batch для удаления всех документов
    const batch = writeBatch(db);
    const imageIds = [];

    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
      imageIds.push(doc.id);
    });

    await batch.commit();

    // Удаляем изображения из Storage
    for (const imageId of imageIds) {
      try {
        await deleteImage(userId, imageId);
      } catch (error) {
        // Игнорируем ошибку удаления изображения
      }
    }
  } catch (error) {
    console.error('Failed to clear chat history:', error);
    throw error;
  }
}


