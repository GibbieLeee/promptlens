import React, { useEffect, memo } from "react";
import { createPortal } from "react-dom";

function Toast({ message, onClose, isSavedActive = false }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2000); // уведомление исчезает через 2 сек

    return () => clearTimeout(timer);
  }, [onClose]);

  return createPortal(
    <div className={`toast ${isSavedActive ? "saved-active" : ""}`}>
      {message}
    </div>,
    document.body
  );
}

export default memo(Toast);
