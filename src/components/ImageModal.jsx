import React, { useEffect, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

function ImageModal({ imageSrc, onClose }) {
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleClose = useCallback((e) => {
    e.stopPropagation();
    onClose();
  }, [onClose]);

  // Закрытие по нажатию Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    // Блокируем скролл body при открытом модальном окне
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!imageSrc) return null;

  return createPortal(
    <div className="image-modal-backdrop" onClick={handleBackdropClick}>
      <div className="image-modal-content">
        <button
          className="image-modal-close"
          onClick={handleClose}
          aria-label="Close"
        >
          <X size={24} />
        </button>
        <img
          src={imageSrc}
          alt="Full size preview"
          className="image-modal-img"
        />
      </div>
    </div>,
    document.body
  );
}

export default memo(ImageModal);

