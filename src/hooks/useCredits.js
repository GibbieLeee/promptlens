import { useState, useEffect, useCallback } from "react";
import {
  loadCredits,
  deductCredits as deductCreditsUtil,
  addCredits as addCreditsUtil,
  hasEnoughCredits as hasEnoughCreditsUtil,
  GENERATION_COST,
} from "../utils/credits";

/**
 * Хук для управления кредитами
 * @returns {Object} Объект с состоянием и методами для работы с кредитами
 */
export function useCredits() {
  const [credits, setCredits] = useState(() => loadCredits());

  /**
   * Проверяет, достаточно ли кредитов
   */
  const hasEnough = useCallback(
    (required = GENERATION_COST) => {
      return hasEnoughCreditsUtil(required, credits);
    },
    [credits]
  );

  /**
   * Списывает кредиты
   */
  const deduct = useCallback(
    (amount = GENERATION_COST) => {
      const result = deductCreditsUtil(amount);
      if (result.success) {
        setCredits(result.newBalance);
      }
      return result;
    },
    []
  );

  /**
   * Добавляет кредиты
   */
  const add = useCallback((amount) => {
    const result = addCreditsUtil(amount);
    if (result.success) {
      setCredits(result.newBalance);
    }
    return result;
  }, []);

  /**
   * Обновляет баланс из localStorage
   */
  const refresh = useCallback(() => {
    setCredits(loadCredits());
  }, []);

  return {
    credits,
    hasEnough,
    deduct,
    add,
    refresh,
  };
}

