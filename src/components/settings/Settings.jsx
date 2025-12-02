import React, { useState, useCallback } from "react";
import {
  User,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Globe,
  Sparkles,
  Save,
  Shield,
  History,
  Clock,
  Trash2,
  Image as ImageIcon,
  HardDrive,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useSettings, SETTINGS_OPTIONS } from "../../contexts/SettingsContext";
import { useUserData } from "../../hooks/useUserData";
import { useTranslation } from "../../hooks/useTranslation";
import SettingsGroup from "./SettingsGroup";
import SettingsRow from "./SettingsRow";
import ToggleSwitch from "./ToggleSwitch";
import SettingsModal from "./SettingsModal";
import ConfirmModal from "./ConfirmModal";

export default function Settings({ onLogout }) {
  const { user } = useAuth();
  const { theme, setThemeMode, themes } = useTheme();
  const { settings, updateSetting, getSetting } = useSettings();
  const { clearChat, chatHistory } = useUserData();
  const { t } = useTranslation();
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [modalOpen, setModalOpen] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleClearHistory = useCallback(async () => {
    if (!window.confirm(t("clearHistoryConfirm"))) {
      return;
    }
    setIsClearingHistory(true);
    try {
      await clearChat();
    } catch (error) {
      console.error("Failed to clear history:", error);
    } finally {
      setIsClearingHistory(false);
    }
  }, [clearChat, t]);

  const getThemeLabel = () => {
    switch (theme) {
      case themes.DARK:
        return t("dark");
      case themes.LIGHT:
        return t("light");
      case themes.SYSTEM:
        return t("system");
      default:
        return t("system");
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case themes.DARK:
        return Moon;
      case themes.LIGHT:
        return Sun;
      case themes.SYSTEM:
        return Monitor;
      default:
        return Monitor;
    }
  };

  const getLanguageLabel = () => {
    const lang = getSetting("appearance", "language");
    return SETTINGS_OPTIONS.languages.find((l) => l.value === lang)?.label || "English";
  };

  const getPromptTypeLabel = () => {
    const type = getSetting("generation", "outputPromptType");
    return SETTINGS_OPTIONS.promptTypes.find((t) => t.value === type)?.label || "Universal";
  };

  const getHistorySizeLabel = () => {
    const size = getSetting("history", "maxHistorySize");
    if (size === -1) return t("unlimited");
    return String(size);
  };

  const getAutoClearLabel = () => {
    const autoClear = getSetting("history", "autoClear");
    const option = SETTINGS_OPTIONS.autoClearOptions.find((opt) => opt.value === autoClear);
    if (!option) return t("never");
    // Используем значение напрямую как ключ перевода
    return t(option.value) || option.label;
  };

  return (
    <div className="settings-view">
      {/* Account Group */}
      <SettingsGroup title={t("account")}>
        <div className="settings-group-card">
          <SettingsRow
            icon={User}
            label={t("profile")}
            value={user?.email || t("email")}
            showChevron={false}
          />
          <SettingsRow
            icon={LogOut}
            label={t("logOut")}
            onClick={() => setShowLogoutConfirm(true)}
            danger={true}
          />
        </div>
      </SettingsGroup>

      {/* Appearance Group */}
      <SettingsGroup title={t("appearance")}>
        <div className="settings-group-card">
          <SettingsRow
            icon={getThemeIcon()}
            label={t("theme")}
            value={getThemeLabel()}
            onClick={() => setModalOpen("theme")}
            showChevron={true}
          />
          <SettingsRow
            icon={Globe}
            label={t("language")}
            value={getLanguageLabel()}
            onClick={() => setModalOpen("language")}
            showChevron={true}
          />
        </div>
      </SettingsGroup>

      {/* Generation Group */}
      <SettingsGroup title={t("generation")}>
        <div className="settings-group-card">
          <SettingsRow
            icon={Sparkles}
            label={t("outputPromptType")}
            value={getPromptTypeLabel()}
            onClick={() => setModalOpen("promptType")}
            showChevron={true}
          />
          <div className="settings-row">
            <div className="settings-row-icon">
              <Save size={20} />
            </div>
            <span className="settings-row-label">{t("autoSavePrompts")}</span>
            <div className="settings-row-right">
              <ToggleSwitch
                checked={getSetting("generation", "autoSavePrompts")}
                onChange={(value) => updateSetting("generation", "autoSavePrompts", value)}
              />
            </div>
          </div>
          <div className="settings-row">
            <div className="settings-row-icon">
              <Shield size={20} />
            </div>
            <span className="settings-row-label">{t("askBeforeSpendingCredits")}</span>
            <div className="settings-row-right">
              <ToggleSwitch
                checked={getSetting("generation", "askBeforeSpendingCredits")}
                onChange={(value) => updateSetting("generation", "askBeforeSpendingCredits", value)}
              />
            </div>
          </div>
        </div>
      </SettingsGroup>

      {/* History Group */}
      <SettingsGroup title={t("history")}>
        <div className="settings-group-card">
          <SettingsRow
            icon={History}
            label={t("maxHistorySize")}
            value={getHistorySizeLabel()}
            onClick={() => setModalOpen("historySize")}
            showChevron={true}
          />
          <SettingsRow
            icon={Clock}
            label={t("autoClear")}
            value={getAutoClearLabel()}
            onClick={() => setModalOpen("autoClear")}
            showChevron={true}
          />
          <SettingsRow
            icon={Trash2}
            label={t("clearHistoryNow")}
            onClick={handleClearHistory}
            disabled={isClearingHistory || !chatHistory || chatHistory.length === 0}
            danger={true}
          />
        </div>
      </SettingsGroup>

      {/* Images Group */}
      <SettingsGroup title={t("images")}>
        <div className="settings-group-card">
          <div className="settings-row">
            <div className="settings-row-icon">
              <ImageIcon size={20} />
            </div>
            <span className="settings-row-label">{t("highQualityPreview")}</span>
            <div className="settings-row-right">
              <ToggleSwitch
                checked={getSetting("images", "highQualityPreview")}
                onChange={(value) => updateSetting("images", "highQualityPreview", value)}
              />
            </div>
          </div>
          <div className="settings-row">
            <div className="settings-row-icon">
              <HardDrive size={20} />
            </div>
            <span className="settings-row-label">{t("compressUploads")}</span>
            <div className="settings-row-right">
              <ToggleSwitch
                checked={getSetting("images", "compressUploads")}
                onChange={(value) => updateSetting("images", "compressUploads", value)}
              />
            </div>
          </div>
        </div>
      </SettingsGroup>

      {/* Theme Selection Modal */}
      <SettingsModal
        title={t("theme")}
        isOpen={modalOpen === "theme"}
        onClose={() => setModalOpen(null)}
      >
        <div className="settings-modal-options">
          {[
            { value: themes.DARK, label: t("dark"), icon: Moon },
            { value: themes.LIGHT, label: t("light"), icon: Sun },
            { value: themes.SYSTEM, label: t("system"), icon: Monitor },
          ].map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                className={`settings-modal-option ${theme === option.value ? "active" : ""}`}
                onClick={() => {
                  setThemeMode(option.value);
                  setModalOpen(null);
                }}
              >
                <Icon size={20} />
                <span>{option.label}</span>
                {theme === option.value && <div className="settings-modal-check">✓</div>}
              </button>
            );
          })}
        </div>
      </SettingsModal>

      {/* Language Selection Modal */}
      <SettingsModal
        title={t("language")}
        isOpen={modalOpen === "language"}
        onClose={() => setModalOpen(null)}
      >
        <div className="settings-modal-options">
          {SETTINGS_OPTIONS.languages.map((lang) => {
            const isSelected = getSetting("appearance", "language") === lang.value;
            return (
              <button
                key={lang.value}
                className={`settings-modal-option ${isSelected ? "active" : ""}`}
                onClick={() => {
                  updateSetting("appearance", "language", lang.value);
                  setModalOpen(null);
                }}
              >
                <span>{lang.label}</span>
                {isSelected && <div className="settings-modal-check">✓</div>}
              </button>
            );
          })}
        </div>
      </SettingsModal>

      {/* Prompt Type Selection Modal */}
      <SettingsModal
        title={t("outputPromptType")}
        isOpen={modalOpen === "promptType"}
        onClose={() => setModalOpen(null)}
      >
        <div className="settings-modal-options">
          {SETTINGS_OPTIONS.promptTypes.map((type) => {
            const isSelected = getSetting("generation", "outputPromptType") === type.value;
            return (
              <button
                key={type.value}
                className={`settings-modal-option ${isSelected ? "active" : ""}`}
                onClick={() => {
                  updateSetting("generation", "outputPromptType", type.value);
                  setModalOpen(null);
                }}
              >
                <span>{type.label}</span>
                {isSelected && <div className="settings-modal-check">✓</div>}
              </button>
            );
          })}
        </div>
      </SettingsModal>

      {/* History Size Selection Modal */}
      <SettingsModal
        title={t("maxHistorySize")}
        isOpen={modalOpen === "historySize"}
        onClose={() => setModalOpen(null)}
      >
        <div className="settings-modal-options">
          {SETTINGS_OPTIONS.maxHistorySizes.map((size) => {
            const currentSize = getSetting("history", "maxHistorySize");
            const isSelected = currentSize === size.value;
            return (
              <button
                key={size.value}
                className={`settings-modal-option ${isSelected ? "active" : ""}`}
                onClick={() => {
                  updateSetting("history", "maxHistorySize", size.value);
                  setModalOpen(null);
                }}
              >
                <span>{size.value === -1 ? t("unlimited") : size.label}</span>
                {isSelected && <div className="settings-modal-check">✓</div>}
              </button>
            );
          })}
        </div>
      </SettingsModal>

      {/* Auto Clear Selection Modal */}
      <SettingsModal
        title={t("autoClear")}
        isOpen={modalOpen === "autoClear"}
        onClose={() => setModalOpen(null)}
      >
        <div className="settings-modal-options">
          {SETTINGS_OPTIONS.autoClearOptions.map((opt) => {
            const isSelected = getSetting("history", "autoClear") === opt.value;
            return (
              <button
                key={opt.value}
                className={`settings-modal-option ${isSelected ? "active" : ""}`}
                onClick={() => {
                  updateSetting("history", "autoClear", opt.value);
                  setModalOpen(null);
                }}
              >
                <span>{t(opt.value) || opt.label}</span>
                {isSelected && <div className="settings-modal-check">✓</div>}
              </button>
            );
          })}
        </div>
      </SettingsModal>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={onLogout}
        title={t("logOut")}
        message={t("confirmLogout")}
        confirmText={t("logOut")}
        cancelText={t("cancel")}
        danger={true}
      />
    </div>
  );
}
