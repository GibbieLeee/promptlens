import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2000); // уведомление исчезает через 2 сек

    return () => clearTimeout(timer);
  }, [onClose]);

  return createPortal(
    <div className="toast">
      {message}
    </div>,
    document.body
  );
}
