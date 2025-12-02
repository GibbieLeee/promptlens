import React from "react";
import { X } from "lucide-react";

export default function SettingsModal({ title, isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h3>{title}</h3>
          <button className="settings-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="settings-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

