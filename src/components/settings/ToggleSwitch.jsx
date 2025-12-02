import React, { useCallback } from "react";

export default function ToggleSwitch({ checked, onChange, disabled = false, label }) {
  const handleMouseDown = useCallback((e) => {
    // Останавливаем всплытие события к родителю
    e.stopPropagation();
  }, []);

  const handleTouchStart = useCallback((e) => {
    // Останавливаем всплытие события к родителю
    e.stopPropagation();
  }, []);

  // Если есть label, используем старый формат (для обратной совместимости)
  if (label) {
    return (
      <label 
        className="settings-toggle"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <span className="settings-toggle-label">{label}</span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => {
            e.stopPropagation();
            onChange(e.target.checked);
          }}
          disabled={disabled}
          className="settings-toggle-input"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />
        <span className="settings-toggle-slider"></span>
      </label>
    );
  }

  // Новый формат без label (для использования в SettingsRow)
  return (
    <label 
      className="settings-toggle-inline"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.checked);
        }}
        disabled={disabled}
        className="settings-toggle-input"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      />
      <span className="settings-toggle-slider"></span>
    </label>
  );
}

