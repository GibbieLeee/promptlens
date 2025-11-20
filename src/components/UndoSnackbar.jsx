import React, { useEffect, memo } from "react";
import { createPortal } from "react-dom";
import { RotateCcw } from "lucide-react";

function UndoSnackbar({ message, onUndo, onClose, duration = 5000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return createPortal(
    <div className="undo-snackbar">
      <span className="undo-snackbar-message">{message}</span>
      <button
        className="undo-snackbar-button"
        onClick={() => {
          onUndo?.();
          onClose();
        }}
        aria-label="Undo"
      >
        <RotateCcw size={16} />
        <span>Undo</span>
      </button>
    </div>,
    document.body
  );
}

export default memo(UndoSnackbar);

