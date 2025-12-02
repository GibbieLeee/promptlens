import { useState, useCallback } from "react";
import { GENERATION_COST } from "../utils/credits";
import {
  deductUserCredits,
  addUserCredits
} from "../utils/firestoreData";
import { useAuth } from "../contexts/AuthContext";

/**
 * Хук для управления кредитами пользователя через Firestore
 * @param {number} initialCredits - Начальный баланс кредитов
 * @returns {Object} Объект с состоянием и методами для работы с кредитами
 */
export function useCredits(initialCredits = 0) {
  const { user } = useAuth();
  const [credits, setCredits] = useState(initialCredits);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Проверяет, достаточно ли кредитов
   */
  const hasEnough = useCallback(
    (required = GENERATION_COST) => {
      return credits >= required;
    },
    [credits]
  );

  /**
   * Списывает кредиты
   */
  const deduct = useCallback(
    async (amount = GENERATION_COST) => {
      if (!user) {
        return { success: false, newBalance: credits, error: 'User not authenticated' };
      }

      setIsLoading(true);
      try {
        const result = await deductUserCredits(user.uid, amount);
        if (result.success) {
          setCredits(result.newBalance);
        }
        return result;
      } catch (error) {
        console.error('Failed to deduct credits:', error);
        return { success: false, newBalance: credits, error: error.message };
      } finally {
        setIsLoading(false);
      }
    },
    [user, credits]
  );

  /**
   * Добавляет кредиты
   */
  const add = useCallback(
    async (amount) => {
      if (!user) {
        return { success: false, newBalance: credits };
      }

      setIsLoading(true);
      try {
        const result = await addUserCredits(user.uid, amount);
        if (result.success) {
          setCredits(result.newBalance);
        }
        return result;
      } catch (error) {
        console.error('Failed to add credits:', error);
        return { success: false, newBalance: credits };
      } finally {
        setIsLoading(false);
      }
    },
    [user, credits]
  );

  /**
   * Обновляет баланс напрямую (используется при загрузке из Firestore)
   */
  const setBalance = useCallback((newBalance) => {
    setCredits(newBalance);
  }, []);

  return {
    credits,
    hasEnough,
    deduct,
    add,
    setBalance,
    isLoading,
  };
}

