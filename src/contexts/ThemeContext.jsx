import { createContext, useContext, useEffect, useState } from "react";
import { safeGetString, safeSetString } from "../utils/storage";

const ThemeContext = createContext();

const THEME_STORAGE_KEY = "app-theme";
const THEMES = {
  DARK: "dark",
  LIGHT: "light",
  SYSTEM: "system",
};

// Получить системную тему
const getSystemTheme = () => {
  if (typeof window === "undefined") return THEMES.DARK;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? THEMES.DARK
    : THEMES.LIGHT;
};

// Получить реальную тему для применения (dark или light)
const getEffectiveTheme = (themePreference) => {
  if (themePreference === THEMES.SYSTEM) {
    return getSystemTheme();
  }
  return themePreference;
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Загружаем сохраненную тему из localStorage или используем system по умолчанию
    const savedTheme = safeGetString(THEME_STORAGE_KEY, THEMES.SYSTEM);
    const validThemes = [THEMES.DARK, THEMES.LIGHT, THEMES.SYSTEM];
    const initialTheme = validThemes.includes(savedTheme) ? savedTheme : THEMES.SYSTEM;
    
    // Применяем тему синхронно при инициализации
    if (typeof document !== "undefined") {
      const effectiveTheme = getEffectiveTheme(initialTheme);
      const root = document.documentElement;
      if (effectiveTheme === THEMES.LIGHT) {
        root.classList.add("light-theme");
        root.classList.remove("dark-theme");
      } else {
        root.classList.add("dark-theme");
        root.classList.remove("light-theme");
      }
    }
    
    return initialTheme;
  });

  // Отслеживаем изменение системной темы (только когда выбрана SYSTEM)
  useEffect(() => {
    if (theme !== THEMES.SYSTEM || typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = (e) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add("dark-theme");
        root.classList.remove("light-theme");
      } else {
        root.classList.add("light-theme");
        root.classList.remove("dark-theme");
      }
    };

    // Устанавливаем начальную тему при монтировании
    handleChange(mediaQuery);

    // Добавляем слушатель изменений системной темы
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      // Fallback для старых браузеров
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme]);

  // Применяем тему при изменении (для всех тем, включая SYSTEM при инициализации)
  useEffect(() => {
    const root = document.documentElement;
    const effectiveTheme = getEffectiveTheme(theme);
    
    if (effectiveTheme === THEMES.LIGHT) {
      root.classList.add("light-theme");
      root.classList.remove("dark-theme");
    } else {
      root.classList.add("dark-theme");
      root.classList.remove("light-theme");
    }
    
    // Сохраняем предпочтение темы в localStorage (SYSTEM, DARK или LIGHT)
    safeSetString(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      if (prevTheme === THEMES.DARK) return THEMES.LIGHT;
      if (prevTheme === THEMES.LIGHT) return THEMES.SYSTEM;
      return THEMES.DARK;
    });
  };

  const setThemeMode = (newTheme) => {
    if (newTheme === THEMES.LIGHT || newTheme === THEMES.DARK || newTheme === THEMES.SYSTEM) {
      setTheme(newTheme);
    }
  };

  // Получаем эффективную тему для отображения
  const effectiveTheme = theme === THEMES.SYSTEM ? getSystemTheme() : theme;

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      effectiveTheme,
      toggleTheme, 
      setThemeMode, 
      themes: THEMES 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

