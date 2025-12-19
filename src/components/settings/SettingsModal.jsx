import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function SettingsModal({ title, isOpen, onClose, children }) {
  // Блокируем скролл body при открытом модальном окне
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
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
    </div>,
    document.body
  );
}

