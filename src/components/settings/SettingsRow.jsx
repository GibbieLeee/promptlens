import React from "react";
import { ChevronRight } from "lucide-react";

export default function SettingsRow({
  icon: Icon,
  label,
  value,
  onClick,
  rightElement,
  showChevron = false,
  danger = false,
  disabled = false,
}) {
  const handleClick = () => {
    if (onClick && !disabled) {
      onClick();
    }
  };

  const Component = onClick ? "button" : "div";
  const props = onClick
    ? {
        onClick: handleClick,
        disabled: disabled || !onClick,
      }
    : {};

  return (
    <Component
      className={`settings-row ${danger ? "settings-row-danger" : ""}`}
      {...props}
    >
      {Icon && (
        <div className="settings-row-icon">
          <Icon size={20} />
        </div>
      )}
      <span className="settings-row-label">{label}</span>
      {value && <span className="settings-row-value">{value}</span>}
      <div className="settings-row-right">
        {rightElement}
        {showChevron && <ChevronRight size={20} className="settings-row-chevron" />}
      </div>
    </Component>
  );
}

