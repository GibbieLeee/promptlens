/**
 * Хук для управления данными пользователя (чат, сохраненные промпты, кредиты)
 * Автоматически синхронизирует данные с Firestore
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserProfile,
  getSavedPrompts,
  getChatHistory,
  savePrompt,
  deleteSavedPrompt,
  saveChatMessage,
  updateChatMessage,
  clearChatHistory
} from '../utils/firestoreData';

export function useUserData() {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Загрузка данных пользователя при входе
  useEffect(() => {
    if (!user) {
      // Очищаем данные при выходе
      setCredits(0);
      setSavedPrompts([]);
      setChatHistory([]);
      setIsLoading(false);
      return;
    }

    const loadUserData = async () => {
      setIsLoading(true);
      try {
        // Загружаем профиль и данные параллельно
        const [profile, prompts, history] = await Promise.all([
          getUserProfile(user.uid),
          getSavedPrompts(user.uid),
          getChatHistory(user.uid)
        ]);

        setCredits(profile.credits || 0);
        setSavedPrompts(prompts);
        setChatHistory(history);
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  // ============================================
  // СОХРАНЕННЫЕ ПРОМПТЫ
  // ============================================

  /**
   * Добавляет промпт в сохраненные
   */
  const addSavedPrompt = useCallback(
    async (promptData) => {
      if (!user) return;

      setIsSyncing(true);
      try {
        // Сначала обновляем UI оптимистично
        const newPrompt = {
          id: promptData.id,
          prompt: promptData.prompt,
          imageUrl: promptData.image,
          timestamp: Date.now()
        };
        setSavedPrompts((prev) => [newPrompt, ...prev]);

        // Затем сохраняем в Firestore
        const imageUrl = await savePrompt(user.uid, promptData);
        
        // Обновляем с URL из Storage, если изображение было загружено
        if (imageUrl && imageUrl !== promptData.image) {
          setSavedPrompts((prev) =>
            prev.map((p) =>
              p.id === promptData.id ? { ...p, imageUrl } : p
            )
          );
        }
      } catch (error) {
        console.error('Failed to save prompt:', error);
        // Откатываем изменения при ошибке
        setSavedPrompts((prev) => prev.filter((p) => p.id !== promptData.id));
      } finally {
        setIsSyncing(false);
      }
    },
    [user]
  );

  /**
   * Удаляет промпт из сохраненных
   */
  const removeSavedPrompt = useCallback(
    async (promptId) => {
      if (!user) return;

      setIsSyncing(true);
      // Сохраняем копию для возможного отката
      const promptCopy = savedPrompts.find((p) => p.id === promptId);

      try {
        // Оптимистично обновляем UI
        setSavedPrompts((prev) => prev.filter((p) => p.id !== promptId));

        // Удаляем из Firestore
        await deleteSavedPrompt(user.uid, promptId);
      } catch (error) {
        console.error('Failed to delete prompt:', error);
        // Откатываем изменения
        if (promptCopy) {
          setSavedPrompts((prev) => [...prev, promptCopy]);
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [user, savedPrompts]
  );

  /**
   * Проверяет, сохранен ли промпт
   */
  const isPromptSaved = useCallback(
    (promptId) => {
      return savedPrompts.some((p) => p.id === promptId);
    },
    [savedPrompts]
  );

  // ============================================
  // ИСТОРИЯ ЧАТА
  // ============================================

  /**
   * Добавляет сообщение в историю чата
   */
  const addChatMessage = useCallback(
    async (messageData) => {
      if (!user) return;

      try {
        // Сначала добавляем в локальное состояние
        const newMessage = {
          id: messageData.id,
          imageUrl: messageData.image,
          prompt: messageData.prompt,
          status: messageData.status,
          phases: messageData.phases || [],
          timestamp: Date.now()
        };
        setChatHistory((prev) => [...prev, newMessage]);

        // Затем сохраняем в Firestore в фоне
        const result = await saveChatMessage(user.uid, messageData);
        
        // Обновляем локальное состояние с URL из Storage
        if (result && result.imageUrl) {
          setChatHistory((prev) =>
            prev.map((msg) =>
              msg.id === messageData.id ? { ...msg, imageUrl: result.imageUrl } : msg
            )
          );
        }
      } catch (error) {
        console.error('Failed to save chat message:', error);
        // Не откатываем, так как чат может работать локально
      }
    },
    [user]
  );

  /**
   * Обновляет сообщение в чате
   */
  const updateChatMessageLocal = useCallback(
    async (messageId, updates) => {
      if (!user) return;

      try {
        // Обновляем локально
        setChatHistory((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          )
        );

        // Обновляем в Firestore
        await updateChatMessage(user.uid, messageId, updates);
      } catch (error) {
        console.error('Failed to update chat message:', error);
        // Откатываем локальные изменения при ошибке
        setChatHistory((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg } : msg
          )
        );
      }
    },
    [user]
  );

  /**
   * Очищает историю чата (New Chat)
   */
  const clearChat = useCallback(async () => {
    if (!user) return;

    setIsSyncing(true);
    // Сохраняем копию для возможного отката
    const historyCopy = [...chatHistory];

    try {
      // Очищаем локально
      setChatHistory([]);

      // Очищаем в Firestore
      await clearChatHistory(user.uid);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
      // Откатываем изменения
      setChatHistory(historyCopy);
    } finally {
      setIsSyncing(false);
    }
  }, [user, chatHistory]);

  // ============================================
  // КРЕДИТЫ
  // ============================================

  /**
   * Обновляет баланс кредитов
   */
  const updateCredits = useCallback((newBalance) => {
    setCredits(newBalance);
  }, []);

  return {
    // Данные
    credits,
    savedPrompts,
    chatHistory,
    isLoading,
    isSyncing,

    // Методы для сохраненных промптов
    addSavedPrompt,
    removeSavedPrompt,
    isPromptSaved,

    // Методы для чата
    addChatMessage,
    updateChatMessage: updateChatMessageLocal,
    clearChat,

    // Методы для кредитов
    updateCredits
  };
}

