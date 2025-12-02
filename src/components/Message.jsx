import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Copy, ChevronDown, ChevronUp, Loader2, Heart } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";

function Message({ type = "system", prompt, status, onCopy, onExpand, onToggleSave, isSaved }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const messageRef = useRef(null);

  const isSystem = type === "system";
  const isGenerating = status === "generating";
  const isStopped = status === "stopped";
  const isError = status === "error";
  const isDone = status === "done";

  const handleCopy = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (prompt) {
      onCopy?.(prompt);
    }
    // Немедленно убираем фокус
    if (e.currentTarget) {
      e.currentTarget.blur();
    }
    return false;
  }, [prompt, onCopy]);

  const handleMouseDown = useCallback((e) => {
    // Предотвращаем активацию focus на элементе
    e.preventDefault();
  }, []);

  const shouldShowExpand = useMemo(() => {
    return prompt && prompt.length > 250;
  }, [prompt]);

  // Автоматический скролл при раскрытии сообщения
  useEffect(() => {
    if (expanded && messageRef.current && onExpand) {
      // Небольшая задержка для завершения анимации раскрытия
      setTimeout(() => {
        onExpand(messageRef.current);
      }, 100);
    }
  }, [expanded, onExpand]);

  const handleExpandToggle = useCallback((e) => {
    e.stopPropagation();
    setExpanded(prev => !prev);
    e.currentTarget.blur();
  }, []);

  const handleSaveToggle = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onToggleSave) {
      onToggleSave();
    }
    e.currentTarget.blur();
  }, [onToggleSave]);

  return (
    <div
      ref={messageRef}
      className={`message ${isSystem ? "system" : "user"}`}
    >
      {/* Кнопка сохранения справа сверху снаружи карточки */}
      {isSystem && onToggleSave && isDone && (
        <button
          className={`message-save-btn ${isSaved ? "saved" : ""}`}
          onClick={handleSaveToggle}
          onMouseDown={(e) => e.preventDefault()}
          aria-label={isSaved ? t("removeFromSaved") : t("savePrompt")}
          title={isSaved ? t("removeFromSaved") : t("savePrompt")}
        >
          <Heart size={20} className={isSaved ? "filled" : ""} />
        </button>
      )}

      {/* Блок сообщения */}
      <div
        className={`bubble ${isGenerating ? "bubble-generating" : ""} ${!isGenerating && isSystem ? "bubble-clickable" : ""}`}
        onClick={!isGenerating && isSystem ? handleCopy : undefined}
        onMouseDown={!isGenerating && isSystem ? handleMouseDown : undefined}
        tabIndex={-1}
        role={!isGenerating && isSystem ? "button" : undefined}
        style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
      >
        {/* Заголовок - показываем только если не generating */}
        {!isGenerating && (
          <div className="bubble-header">
            <strong>{t("yourPrompt")}</strong>
            <div className="bubble-copy-hint">
              <Copy size={14} />
              <span>{t("copy")}</span>
            </div>
          </div>
        )}

        {/* Содержимое */}
        {isGenerating && (
          <div className="generating-text">
            <Loader2 className="generating-loader" size={16} />
            <span>{prompt || t("generating")}</span>
          </div>
        )}

        {isStopped && (
          <div className="message-status message-status-stopped">⏸ {t("generationStopped")}</div>
        )}

        {isError && <div className="message-status message-status-error">{prompt}</div>}

        {!isGenerating && !isStopped && !isError && (
          <>
            <div className={`promptText ${expanded ? "expanded" : "collapsed"}`}>
              {prompt || "No prompt yet."}
            </div>

            {shouldShowExpand && (
              <button
                onClick={handleExpandToggle}
                className="expandLink"
                aria-label={expanded ? t("showLess") : t("showMore")}
              >
                {expanded ? t("showLess") : t("showMore")}
                {expanded ? (
                  <ChevronUp size={14} className="expandIcon" />
                ) : (
                  <ChevronDown size={14} className="expandIcon" />
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default React.memo(Message);
