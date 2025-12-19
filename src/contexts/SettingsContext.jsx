import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { safeGetItem, safeSetItem } from "../utils/storage";
import { useAuth } from "./AuthContext";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const SettingsContext = createContext();

const SETTINGS_STORAGE_KEY = "app-settings";
const SETTINGS_FIRESTORE_KEY = "settings"; // Поле в документе пользователя

// Значения по умолчанию для всех настроек
const DEFAULT_SETTINGS = {
  appearance: {
    theme: "system", // Уже управляется ThemeContext
    language: "en",
  },
  generation: {
    outputPromptType: "universal",
    autoSavePrompts: false,
    askBeforeSpendingCredits: true,
  },
  history: {
    maxHistorySize: 50,
    autoClear: "never",
  },
  images: {
    highQualityPreview: true,
    compressUploads: false,
  },
};

// Допустимые значения для настроек
export const SETTINGS_OPTIONS = {
  languages: [
    { value: "en", label: "English" },
    { value: "ru", label: "Русский" },
  ],
  promptTypes: [
    { value: "universal", label: "Universal" },
    { value: "midjourney", label: "Midjourney" },
    { value: "stable-diffusion", label: "Stable Diffusion" },
    { value: "sdxl", label: "SDXL (Stable Diffusion XL)" },
    { value: "flux", label: "Flux" },
    { value: "flux-2", label: "FLUX.2" },
    { value: "dalle", label: "DALL·E" },
    { value: "nano-banana", label: "Nano Banana" },
    { value: "nano-banana-pro", label: "Nano Banana Pro" },
    { value: "ideogram", label: "Ideogram" },
    { value: "leonardo", label: "Leonardo AI" },
    { value: "playground", label: "Playground AI" },
    { value: "fooocus", label: "Fooocus" },
    { value: "kandinsky", label: "Kandinsky" },
  ],
  maxHistorySizes: [
    { value: 20, label: "20" },
    { value: 50, label: "50" },
    { value: 100, label: "100" },
    { value: -1, label: "Unlimited" },
  ],
  autoClearOptions: [
    { value: "1 day", label: "1 day" },
    { value: "7 days", label: "7 days" },
    { value: "30 days", label: "30 days" },
    { value: "never", label: "Never" },
  ],
};

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(() => {
    // Загружаем из localStorage при инициализации
    return safeGetItem(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  });
  const [isLoading, setIsLoading] = useState(true);

  // Загрузка настроек из Firestore для авторизованных пользователей
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data()[SETTINGS_FIRESTORE_KEY]) {
          const firestoreSettings = userSnap.data()[SETTINGS_FIRESTORE_KEY];
          // Объединяем с дефолтными настройками
          const mergedSettings = {
            ...DEFAULT_SETTINGS,
            ...firestoreSettings,
            appearance: {
              ...DEFAULT_SETTINGS.appearance,
              ...firestoreSettings.appearance,
            },
            generation: {
              ...DEFAULT_SETTINGS.generation,
              ...firestoreSettings.generation,
            },
            history: {
              ...DEFAULT_SETTINGS.history,
              ...firestoreSettings.history,
            },
            images: {
              ...DEFAULT_SETTINGS.images,
              ...firestoreSettings.images,
            },
          };
          setSettings(mergedSettings);
          // Сохраняем в localStorage для быстрого доступа
          safeSetItem(SETTINGS_STORAGE_KEY, mergedSettings);
        }
      } catch (error) {
        console.error("Failed to load settings from Firestore:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  // Сохранение настроек
  const saveSettings = useCallback(
    async (newSettings) => {
      const mergedSettings = {
        ...settings,
        ...newSettings,
      };
      setSettings(mergedSettings);

      // Сохраняем в localStorage всегда
      safeSetItem(SETTINGS_STORAGE_KEY, mergedSettings);

      // Сохраняем в Firestore для авторизованных пользователей
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          await setDoc(
            userRef,
            {
              [SETTINGS_FIRESTORE_KEY]: mergedSettings,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (error) {
          console.error("Failed to save settings to Firestore:", error);
        }
      }
    },
    [settings, user]
  );

  // Обновление конкретной настройки
  const updateSetting = useCallback(
    async (category, key, value) => {
      await saveSettings({
        [category]: {
          ...settings[category],
          [key]: value,
        },
      });
    },
    [settings, saveSettings]
  );

  // Получение значения настройки
  const getSetting = useCallback(
    (category, key) => {
      if (!settings[category] || settings[category][key] === undefined) {
        return DEFAULT_SETTINGS[category]?.[key];
      }
      return settings[category][key];
    },
    [settings]
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateSetting,
        saveSettings,
        getSetting,
        defaultSettings: DEFAULT_SETTINGS,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

