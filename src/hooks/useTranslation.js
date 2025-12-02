import { useSettings } from "../contexts/SettingsContext";
import { t } from "../i18n/translations";

/**
 * Хук для получения переводов с учетом текущего языка из настроек
 */
export function useTranslation() {
  const { getSetting } = useSettings();
  const lang = getSetting("appearance", "language") || "en";

  const translate = (key, params = {}) => {
    return t(key, lang, params);
  };

  return {
    t: translate,
    lang,
  };
}
