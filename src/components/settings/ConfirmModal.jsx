import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false 
}) {
  if (!isOpen) return null;

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header">
          {danger && (
            <div className="confirm-modal-icon">
              <AlertTriangle size={24} />
            </div>
          )}
          <h3>{title}</h3>
        </div>
        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>
        <div className="confirm-modal-footer">
          <button 
            className="confirm-modal-btn confirm-modal-btn-cancel"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            className={`confirm-modal-btn confirm-modal-btn-confirm ${danger ? "danger" : ""}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

