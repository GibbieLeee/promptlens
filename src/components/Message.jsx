import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Copy, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

function Message({ type = "system", imageSrc, prompt, status, onCopy, onExpand }) {
  const [expanded, setExpanded] = useState(false);
  const messageRef = useRef(null);

  const isUser = type === "user";
  const isSystem = type === "system";
  const isGenerating = status === "generating";
  const isStopped = status === "stopped";
  const isError = status === "error";

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

  return (
    <div
      ref={messageRef}
      className={`message ${isUser ? "user" : "system"}`}
    >
      {/* Превью только у пользователя */}
      {isUser && imageSrc && (
        <img
          src={imageSrc}
          alt="preview"
          className="preview"
        />
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
            <strong>Your Prompt</strong>
            <div className="bubble-copy-hint">
              <Copy size={14} />
              <span>Copy</span>
            </div>
          </div>
        )}

        {/* Содержимое */}
        {isGenerating && (
          <div className="generating-text">
            <Loader2 className="generating-loader" size={16} />
            <span>{prompt || "Generating prompt…"}</span>
          </div>
        )}

        {isStopped && (
          <div className="message-status message-status-stopped">⏸ Generation stopped</div>
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
                aria-label={expanded ? "Collapse prompt" : "Show full prompt"}
              >
                {expanded ? "Show less" : "Show more"}
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
