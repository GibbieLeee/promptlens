import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Upload, RotateCw, MessageSquarePlus } from "lucide-react";
import "./styles.css";
import ImageUploader from "./components/ImageUploader";
import Message from "./components/Message";
import Toast from "./components/Toast";

const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function generatePromptFromImageMock(file, { signal, onPhase }) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject({ type: "aborted" });
    }

    const checkAborted = () => {
      if (signal?.aborted) {
        reject({ type: "aborted" });
        return true;
      }
      return false;
    };

    setTimeout(() => {
      if (checkAborted()) return;
      onPhase?.("Analysing image…");
    }, 600);
    setTimeout(() => {
      if (checkAborted()) return;
      onPhase?.("Finding objects…");
    }, 1400);
    setTimeout(() => {
      if (checkAborted()) return;
      onPhase?.("Generating prompt…");
    }, 2200);

    setTimeout(() => {
      if (checkAborted()) return;
      const base = `A solitary white plastic chair is positioned in the center-left of the frame, bathed in a spotlight. The chair is simple in design, with a woven backrest and armrests. The background is a stark contrast, with a dark, almost black wall and corner on the right, and a gray wall on the left. The lighting creates a dramatic effect, with strong shadows cast from the chair onto the floor. The overall style is photographic, high contrast, cinematic.`;
      resolve(base);
    }, 3800);
  });
}

const STORAGE_KEY = "promptlens_history_v1";

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    // Handle quota exceeded or other storage errors silently
    // In production, you might want to show a toast notification
    console.warn("Failed to save history to localStorage:", error);
  }
}

export default function App() {
  const [history, setHistory] = useState(() => loadHistory());
  const [toastMsg, setToastMsg] = useState("");
  const [statusPhase, setStatusPhase] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );
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

  useEffect(() => saveHistory(history), [history]);

  // Автоматический скролл вниз при изменениях (как в Telegram/WhatsApp)
  useEffect(() => {
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
  }, [history, statusPhase]);

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
      setToastMsg("You’re offline. Try later.");
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
        status: "generating",
        phases: [],
      };
      setHistory((p) => [...p, newEntry]);
      setIsRegenerating(false);
      startGeneration(file, id);
    };
    reader.onerror = () => {
      setToastMsg("Failed to read file. Please try again.");
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
            h.id === id ? { ...h, prompt: text, status: "done" } : h
          )
        );
        setStatusPhase("");
        controllerRef.current = null;
        setIsGenerating(false);
        setIsRegenerating(false);
      })
      .catch((err) => {
        if (err?.type === "aborted") {
          setHistory((prev) =>
            prev.map((h) =>
              h.id === id
                ? { ...h, status: "stopped", prompt: "Generation stopped" }
                : h
            )
          );
          setStatusPhase("Generation stopped");
          controllerRef.current = null;
          setIsGenerating(false);
          setIsRegenerating(false);
          return;
        }
        const msg =
          err?.type === "network"
            ? "Something went wrong. Try again?"
            : "Could not generate prompt from this image.";
        setHistory((prev) =>
          prev.map((h) =>
            h.id === id ? { ...h, status: "error", prompt: msg } : h
          )
        );
        setStatusPhase("");
        controllerRef.current = null;
        setIsGenerating(false);
        setIsRegenerating(false);
      });
  }

  function handleRegenerate(id) {
    const entry = history.find((h) => h.id === id);
    if (!entry) return;
    const file = dataURLtoFile(entry.image, `regen-${id}.png`);
    if (!file) {
      setToastMsg("Failed to regenerate. Please try uploading again.");
      return;
    }
    setHistory((prev) =>
      prev.map((h) =>
        h.id === id
          ? { ...h, status: "generating", prompt: null, phases: [] }
          : h
      )
    );
    setIsRegenerating(true);
    startGeneration(file, id);
  }

  const handleCopy = useCallback((text) => {
    if (!text) return;
    navigator.clipboard
      ?.writeText(text)
      .then(() => setToastMsg("Copied to clipboard"))
      .catch(() => setToastMsg("Could not copy"));
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
      <div className={`header ${history.length === 0 ? "header-centered" : ""}`}>
        <span className="header-title">PromptLens</span>
        {history.length > 0 && (
          <button
            className="header-new-chat-btn"
            onClick={handleNewChat}
            aria-label="New chat"
            title="New chat"
          >
            <MessageSquarePlus size={20} />
            <span>New chat</span>
          </button>
        )}
      </div>

      <div ref={chatRef} className={`chat ${history.length === 0 ? "chat-empty" : ""}`}>
        {history.length === 0 && (
          <div className="uploader-block">
            <ImageUploader onFile={handleFile} />
            {isOffline && <div className="offline-hint">You're offline.</div>}
          </div>
        )}

        {history.length > 0 && <div className="chat-spacer" />}

        {history.map((item) => (
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
                  imageSrc={item.image}
                  prompt={
                    item.status === "generating"
                      ? item.phases[item.phases.length - 1] || "Analysing…"
                      : item.prompt
                  }
                  status={item.status}
                  onCopy={handleCopy}
                  onExpand={handleMessageExpand}
                />
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {history.length > 0 && (
        <div className="footer">
          <div className="controls">
            <button
              className="btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload new image"
            >
              <Upload size={18} />
              <span>Upload new image</span>
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
              className="btn"
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

      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg("")} />}
    </div>
  );
}
