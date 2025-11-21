import React, { useCallback, useEffect, useRef, useState } from "react";
import { Upload, RotateCw, Copy, Heart } from "lucide-react";
import { ChatActive, ChatInactive } from "./components/icons/ChatIcon";
import { FavoritesActive, FavoritesInactive } from "./components/icons/FavoritesIcon";
import { SettingsActive, SettingsInactive } from "./components/icons/SettingsIcon";
import "./styles.css";
import ImageUploader from "./components/ImageUploader";
import Message from "./components/Message";
import Toast from "./components/Toast";
import ImageModal from "./components/ImageModal";
import UndoSnackbar from "./components/UndoSnackbar";
import { formatCredits, GENERATION_COST } from "./utils/credits";
import { useCredits } from "./hooks/useCredits";
import { VALID_TYPES, MAX_SIZE, STORAGE_KEYS, GENERATION_STATUS, TABS } from "./constants";
import { safeGetItem, safeSetItem } from "./utils/storage";

function generatePromptFromImageMock(file, { signal, onPhase }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject({ type: "aborted" });
    }

    // Массив для хранения ID таймеров для очистки
    const timers = [];
    let isRejected = false;

    const checkAborted = () => {
      if (signal?.aborted || isRejected) {
        // Очищаем все таймеры при abort
        timers.forEach(clearTimeout);
        if (!isRejected) {
          isRejected = true;
          reject({ type: "aborted" });
        }
        return true;
      }
      return false;
    };

    // Обработчик abort сигнала
    const abortHandler = () => {
      checkAborted();
    };

    signal?.addEventListener?.('abort', abortHandler);

    const schedulePhase = (phase, delay) => {
      const timerId = setTimeout(() => {
        if (checkAborted()) return;
        onPhase?.(phase);
      }, delay);
      timers.push(timerId);
      return timerId;
    };

    const scheduleResolve = (result, delay) => {
      const timerId = setTimeout(() => {
        if (checkAborted()) return;
        // Убираем обработчик abort перед resolve
        signal?.removeEventListener?.('abort', abortHandler);
        resolve(result);
      }, delay);
      timers.push(timerId);
      return timerId;
    };

    // Запускаем фазы генерации
    schedulePhase("Analysing image…", 600);
    schedulePhase("Finding objects…", 1400);
    schedulePhase("Generating prompt…", 2200);

    scheduleResolve(`A solitary white plastic chair is positioned in the center-left of the frame, bathed in a spotlight. The chair is simple in design, with a woven backrest and armrests. The background is a stark contrast, with a dark, almost black wall and corner on the right, and a gray wall on the left. The lighting creates a dramatic effect, with strong shadows cast from the chair onto the floor. The overall style is photographic, high contrast, cinematic.`, 3800);
  });
}

function loadHistory() {
  return safeGetItem(STORAGE_KEYS.HISTORY, []);
}

function saveHistory(history) {
  safeSetItem(STORAGE_KEYS.HISTORY, history);
}

function loadSavedPrompts() {
  return safeGetItem(STORAGE_KEYS.SAVED_PROMPTS, []);
}

function saveSavedPrompts(saved) {
  safeSetItem(STORAGE_KEYS.SAVED_PROMPTS, saved);
}

export default function App() {
  const [history, setHistory] = useState(() => loadHistory());
  const [savedPrompts, setSavedPrompts] = useState(() => loadSavedPrompts());
  const [activeTab, setActiveTab] = useState(TABS.CHAT);
  const [toastMsg, setToastMsg] = useState("");
  const [statusPhase, setStatusPhase] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
  const [modalImage, setModalImage] = useState(null);
  const [undoData, setUndoData] = useState(null); // { item, action: 'delete' }
  const { credits, hasEnough, deduct, add } = useCredits();
  const controllerRef = useRef(null);
  const chatRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Очистка состояния генерации при размонтировании компонента
  useEffect(() => {
    return () => {
      controllerRef.current?.abort?.();
      setIsGenerating(false);
      setIsRegenerating(false);
      setStatusPhase("");
    };
  }, []);

  useEffect(() => saveHistory(history), [history]);
  useEffect(() => saveSavedPrompts(savedPrompts), [savedPrompts]);

  // Автоматический скролл вниз при изменениях (как в Telegram/WhatsApp)
  useEffect(() => {
    // Скроллим только если активна вкладка Chat
    if (activeTab !== TABS.CHAT) return;

    const scrollToBottom = () => {
      if (chatRef.current) {
        const chat = chatRef.current;
        // Используем scrollTo для более плавной работы
        chat.scrollTo({
          top: chat.scrollHeight,
          behavior: 'auto' // мгновенный скролл для лучшего UX
        });
      }
    };

    // Немедленный скролл
    scrollToBottom();
    
    // Дополнительные попытки для надежности (на случай загрузки изображений и т.д.)
    const timeouts = [
      setTimeout(scrollToBottom, 0),
      setTimeout(scrollToBottom, 50),
      setTimeout(scrollToBottom, 150)
    ];

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [history, statusPhase, activeTab]);

  async function handleFile(file) {
    if (!file) return;
    if (!VALID_TYPES.includes(file.type)) {
      setToastMsg("Unsupported file format. Use JPG/PNG/WEBP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setToastMsg("File too large (max 10MB).");
      return;
    }
    if (isOffline) {
      setToastMsg("You're offline. Try later.");
      return;
    }

    // Проверяем наличие кредитов перед генерацией
    if (!hasEnough(GENERATION_COST)) {
      setToastMsg(`Not enough credits. You need ${GENERATION_COST} credits to generate a prompt.`);
      return;
    }

    // Списываем кредиты
    const deductionResult = deduct(GENERATION_COST);
    if (!deductionResult.success) {
      setToastMsg("Failed to deduct credits. Please try again.");
      return;
    }

    const id = Date.now().toString();
    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result;
      const newEntry = {
        id,
        image: imageData,
        prompt: null,
        status: GENERATION_STATUS.GENERATING,
        phases: [],
      };
      setHistory((p) => [...p, newEntry]);
      setIsRegenerating(false);
      startGeneration(file, id);
    };
    reader.onerror = () => {
      setToastMsg("Failed to read file. Please try again.");
      // Возвращаем кредиты при ошибке чтения файла
      add(GENERATION_COST);
    };
    reader.readAsDataURL(file);
  }

  function startGeneration(file, id) {
    controllerRef.current?.abort?.();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsGenerating(true);
    setStatusPhase("Analysing image…");

    generatePromptFromImageMock(file, {
      signal: controller.signal,
      onPhase: (phase) => {
        setStatusPhase(phase);
        setHistory((prev) =>
          prev.map((h) =>
            h.id === id ? { ...h, phases: [...(h.phases || []), phase] } : h
          )
        );
      },
    })
      .then((text) => {
        setHistory((prev) =>
          prev.map((h) =>
            h.id === id ? { ...h, prompt: text, status: GENERATION_STATUS.DONE } : h
          )
        );
        setStatusPhase("");
        controllerRef.current = null;
        setIsGenerating(false);
        setIsRegenerating(false);
      })
      .catch((err) => {
        // Всегда сбрасываем состояние генерации
        controllerRef.current = null;
        setIsGenerating(false);
        setIsRegenerating(false);

        if (err?.type === "aborted") {
          setHistory((prev) =>
            prev.map((h) =>
              h.id === id
                ? { ...h, status: GENERATION_STATUS.STOPPED, prompt: "Generation stopped" }
                : h
            )
          );
          setStatusPhase("Generation stopped");
          // При отмене возвращаем кредиты
          add(GENERATION_COST);
          return;
        }

        const msg =
          err?.type === "network"
            ? "Something went wrong. Try again?"
            : "Could not generate prompt from this image.";

        setHistory((prev) =>
          prev.map((h) =>
            h.id === id ? { ...h, status: GENERATION_STATUS.ERROR, prompt: msg } : h
          )
        );
        setStatusPhase("");
        // При ошибке возвращаем кредиты
        add(GENERATION_COST);
      });
  }

  function handleRegenerate(id) {
    const entry = history.find((h) => h.id === id);
    if (!entry) return;

    // Проверяем наличие кредитов перед регенерацией
    if (!hasEnough(GENERATION_COST)) {
      setToastMsg(`Not enough credits. You need ${GENERATION_COST} credits to regenerate.`);
      return;
    }

    // Списываем кредиты
    const deductionResult = deduct(GENERATION_COST);
    if (!deductionResult.success) {
      setToastMsg("Failed to deduct credits. Please try again.");
      return;
    }

    const file = dataURLtoFile(entry.image, `regen-${id}.png`);
    if (!file) {
      setToastMsg("Failed to regenerate. Please try uploading again.");
      // Возвращаем кредиты при ошибке
      add(GENERATION_COST);
      return;
    }
    setHistory((prev) =>
      prev.map((h) =>
        h.id === id
          ? { ...h, status: GENERATION_STATUS.GENERATING, prompt: null, phases: [] }
          : h
      )
    );
    setIsRegenerating(true);
    startGeneration(file, id);
  }

  const handleCopy = useCallback(async (text) => {
    if (!text || typeof text !== "string") {
      console.warn("Invalid text for copy:", text);
      return;
    }
    
    // Метод 1: Современный Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setToastMsg("Copied to clipboard");
        return;
      } catch (err) {
        console.warn("Clipboard API failed, trying fallback:", err);
      }
    }
    
    // Метод 2: Fallback через временный textarea с document.execCommand
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "2em";
    textarea.style.height = "2em";
    textarea.style.padding = "0";
    textarea.style.border = "none";
    textarea.style.outline = "none";
    textarea.style.boxShadow = "none";
    textarea.style.background = "transparent";
    textarea.style.opacity = "0";
    
    document.body.appendChild(textarea);
    
    try {
      textarea.focus();
      textarea.select();
    } catch (focusErr) {
      // Если focus не работает, пробуем без него
      textarea.select();
    }
    
    try {
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      
      if (successful) {
        setToastMsg("Copied to clipboard");
      } else {
        throw new Error("execCommand('copy') returned false");
      }
    } catch (err) {
      document.body.removeChild(textarea);
      console.error("Copy failed:", err);
      setToastMsg("Could not copy");
    }
  }, []);

  const handleMessageExpand = useCallback((messageElement) => {
    if (!chatRef.current || !messageElement) return;
    
    // Даем время на раскрытие, затем проверяем видимость
    setTimeout(() => {
      if (!chatRef.current || !messageElement) return;
      
      const chat = chatRef.current;
      const messageRect = messageElement.getBoundingClientRect();
      const chatRect = chat.getBoundingClientRect();
      
      // Нижняя граница видимой области (с учетом footer)
      const footerHeight = 100;
      const visibleBottom = chatRect.bottom - footerHeight;
      
      // Если низ сообщения ниже видимой области
      if (messageRect.bottom > visibleBottom) {
        // Прокручиваем ровно настолько, чтобы низ был виден
        const overflow = messageRect.bottom - visibleBottom;
        chat.scrollBy({ top: overflow + 20, behavior: 'smooth' });
      }
    }, 50);
  }, []);

  const handleNewChat = useCallback(() => {
    // Отменяем текущую генерацию, если она идет
    controllerRef.current?.abort?.();
    controllerRef.current = null;
    setIsGenerating(false);
    setIsRegenerating(false);
    setStatusPhase("");
    // Очищаем историю
    setHistory([]);
  }, []);

  const toggleSave = useCallback((id) => {
    const entry = history.find((h) => h.id === id);
    if (!entry || !entry.prompt || entry.status !== GENERATION_STATUS.DONE) return;

    setSavedPrompts((prev) => {
      const existingIndex = prev.findIndex((p) => p.id === id);
      if (existingIndex >= 0) {
        // Удаляем из избранного
        return prev.filter((p) => p.id !== id);
      } else {
        // Добавляем в избранное
        return [
          ...prev,
          {
            id: entry.id,
            image: entry.image,
            prompt: entry.prompt,
            timestamp: Date.now(),
          },
        ];
      }
    });
  }, [history]);

  const deleteSaved = useCallback((id) => {
    const itemIndex = savedPrompts.findIndex((p) => p.id === id);
    if (itemIndex === -1) return;
    
    const item = savedPrompts[itemIndex];
    
    // Сохраняем для Undo: элемент и его позицию
    setUndoData({ item, index: itemIndex, action: "delete" });
    setSavedPrompts((prev) => prev.filter((p) => p.id !== id));
  }, [savedPrompts]);

  const handleUndo = useCallback(() => {
    if (!undoData || undoData.action !== "delete") return;
    
    // Восстанавливаем удаленный элемент на его прежнее место
    setSavedPrompts((prev) => {
      // Проверяем, что элемент еще не существует
      const exists = prev.some((p) => p.id === undoData.item.id);
      if (exists) return prev;
      
      // Восстанавливаем элемент на его прежнюю позицию
      const newPrompts = [...prev];
      const insertIndex = Math.min(undoData.index, newPrompts.length);
      newPrompts.splice(insertIndex, 0, undoData.item);
      return newPrompts;
    });
    
    setUndoData(null);
  }, [undoData, setSavedPrompts]);

  const openImageModal = useCallback((imageSrc) => {
    setModalImage(imageSrc);
  }, []);

  const closeImageModal = useCallback(() => {
    setModalImage(null);
  }, []);

  function dataURLtoFile(dataurl, filename) {
    if (!dataurl) return null;
    try {
      const arr = dataurl.split(",");
      if (arr.length < 2) return null;
      const mimeMatch = arr[0].match(/:(.*?);/);
      if (!mimeMatch) return null;
      const mime = mimeMatch[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      return new File([u8arr], filename, { type: mime });
    } catch (error) {
      console.error("Error converting dataURL to File:", error);
      return null;
    }
  }

  return (
    <div className="app">
      <div className={`header ${history.length === 0 && activeTab === TABS.CHAT ? "header-centered" : ""}`}>
        <div className="header-left">
          <span className="header-credits">{formatCredits(credits)} credits</span>
        </div>
        {history.length > 0 && activeTab === TABS.CHAT && (
          <button
            className="header-new-chat-btn"
            onClick={handleNewChat}
            aria-label="New chat"
            title="New chat"
          >
            <span>New chat</span>
          </button>
        )}
      </div>

      {/* Chat Tab */}
      {activeTab === TABS.CHAT && (
        <div ref={chatRef} className={`chat ${history.length === 0 ? "chat-empty" : ""}`}>
          {history.length === 0 && (
            <div className="uploader-block">
              <ImageUploader onFile={handleFile} />
              {isOffline && <div className="offline-hint">You're offline.</div>}
            </div>
          )}

          {history.length > 0 && <div className="chat-spacer" />}

          {history.map((item) => {
            const isSaved = savedPrompts.some((p) => p.id === item.id);
            return (
              <React.Fragment key={item.id}>
                {/* user message */}
                <div className="message-row user">
                  <div className="message user-msg">
                    {item.image && (
                      <img
                        src={item.image}
                        alt="Uploaded image preview"
                        className="preview"
                      />
                    )}
                  </div>
                </div>

                {/* system message */}
                <div className="message-row system">
                  <div className="message">
                    <Message
                      type="system"
                      prompt={
                        item.status === GENERATION_STATUS.GENERATING
                          ? item.phases[item.phases.length - 1] || "Analysing…"
                          : item.prompt
                      }
                      status={item.status}
                      onCopy={handleCopy}
                      onExpand={handleMessageExpand}
                      onToggleSave={() => toggleSave(item.id)}
                      isSaved={isSaved}
                    />
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Saved Tab */}
      {activeTab === TABS.FAVORITES && (
        <div className="saved-view">
          {savedPrompts.length === 0 ? (
            <div className="saved-empty">
              <p>No saved prompts yet</p>
              <p className="saved-empty-hint">
                Click the heart icon next to any prompt in Chat to save it here
              </p>
            </div>
          ) : (
            <div className="saved-grid">
              {savedPrompts.map((item) => (
                <div key={item.id} className="saved-card">
                  <button
                    className="saved-delete-btn"
                    onClick={() => deleteSaved(item.id)}
                    aria-label="Remove from saved"
                  >
                    <Heart 
                      size={16} 
                      fill="#ef4444" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      style={{ color: '#ef4444' }}
                    />
                  </button>
                  {item.image && (
                    <img
                      src={item.image}
                      alt="Saved prompt preview"
                      className="saved-image"
                      onClick={() => openImageModal(item.image)}
                    />
                  )}
                  <div 
                    className="saved-prompt-area"
                    onClick={() => handleCopy(item.prompt)}
                  >
                    <div className="saved-prompt">{item.prompt}</div>
                    <button
                      className="saved-copy-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(item.prompt);
                      }}
                      aria-label="Copy prompt"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Container with buttons and navigation */}
      <div className="bottom-container">
        {history.length > 0 && activeTab === TABS.CHAT && (
          <div className="footer">
            <div className="controls">
              <button
                className="btn btn-upload"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload image"
              >
                <Upload size={18} />
                <span>Upload image</span>
              </button>

              <input
                ref={fileInputRef}
                className="fileInput"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  handleFile(f);
                  e.target.value = "";
                }}
                aria-label="File input"
              />

              <button
                className="btn btn-regenerate"
                onClick={() => {
                  const last = history[history.length - 1];
                  if (last) handleRegenerate(last.id);
                }}
                disabled={history.length === 0 || isGenerating}
                aria-label={isGenerating ? (isRegenerating ? "Regenerating..." : "Generating...") : "Regenerate last prompt"}
              >
                <RotateCw size={18} className={isGenerating ? "rotating" : ""} />
                <span>
                  {isGenerating 
                    ? (isRegenerating ? "Regenerating..." : "Generating...") 
                    : "Regenerate"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar */}
        <div className="bottom-navbar">
        <button
          className={`bottom-nav-tab ${activeTab === TABS.FAVORITES ? "active" : ""}`}
          onClick={() => setActiveTab(TABS.FAVORITES)}
        >
          {activeTab === TABS.FAVORITES ? (
            <FavoritesActive width={20} height={20} />
          ) : (
            <FavoritesInactive width={20} height={20} />
          )}
          <span>Saved</span>
        </button>
        <button
          className={`bottom-nav-tab ${activeTab === TABS.CHAT ? "active" : ""}`}
          onClick={() => setActiveTab(TABS.CHAT)}
        >
          {activeTab === TABS.CHAT ? (
            <ChatActive width={20} height={20} />
          ) : (
            <ChatInactive width={20} height={20} />
          )}
          <span>Chat</span>
        </button>
        <button
          className={`bottom-nav-tab ${activeTab === TABS.SETTINGS ? "active" : ""}`}
          onClick={() => setActiveTab(TABS.SETTINGS)}
        >
          {activeTab === TABS.SETTINGS ? (
            <SettingsActive width={20} height={20} />
          ) : (
            <SettingsInactive width={20} height={20} />
          )}
          <span>Settings</span>
        </button>
        </div>
      </div>

      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg("")} />}
      
      {undoData && (
        <UndoSnackbar
          message="Removed from saved"
          onUndo={handleUndo}
          onClose={() => setUndoData(null)}
        />
      )}
      
      {modalImage && (
        <ImageModal imageSrc={modalImage} onClose={closeImageModal} />
      )}
    </div>
  );
}
