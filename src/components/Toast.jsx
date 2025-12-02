import React, { useEffect, memo } from "react";
import { createPortal } from "react-dom";

function Toast({ message, onClose, isFavoritesActive = false }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2000); // уведомление исчезает через 2 сек

    return () => clearTimeout(timer);
  }, [onClose]);

  return createPortal(
    <div className={`toast ${isFavoritesActive ? "favorites-active" : ""}`}>
      {message}
    </div>,
    document.body
  );
}

export default memo(Toast);
