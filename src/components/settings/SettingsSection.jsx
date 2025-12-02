import React from "react";

export default function SettingsSection({ eyebrow, title, description, children }) {
  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div>
          {eyebrow && <p className="settings-eyebrow">{eyebrow}</p>}
          {title && <h2>{title}</h2>}
        </div>
      </div>
      {description && (
        <p className="settings-description">{description}</p>
      )}
      <div className="settings-content">
        {children}
      </div>
    </div>
  );
}

