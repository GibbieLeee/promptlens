import React from "react";

export default function SettingsGroup({ title, children, description }) {
  return (
    <div className="settings-group">
      {title && <h3 className="settings-group-title">{title}</h3>}
      {description && <p className="settings-group-description">{description}</p>}
      <div className="settings-group-content">
        {children}
      </div>
    </div>
  );
}

