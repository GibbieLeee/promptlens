import React, { useEffect, memo, useRef } from "react";
import { createPortal } from "react-dom";
import { RotateCcw } from "lucide-react";

function UndoSnackbar({ message, onUndo, onClose, duration = 5000, isSavedActive = false }) {
  const onCloseRef = useRef(onClose);
  
  // Обновляем ref при изменении onClose
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onCloseRef.current();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  return createPortal(
    <div className={`undo-snackbar ${isSavedActive ? "saved-active" : ""}`}>
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

