import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Upload, RotateCw, Copy, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
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
import { useUserData } from "./hooks/useUserData";
import { VALID_TYPES, MAX_SIZE, GENERATION_STATUS, TABS } from "./constants";
import { copyToClipboard } from "./utils/clipboard";
import { dataURLtoFile } from "./utils/file";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import { useSettings } from "./contexts/SettingsContext";
import { useTranslation } from "./hooks/useTranslation";
import Settings from "./components/settings/Settings";
import Landing from "./components/auth/Landing";
import ConfirmModal from "./components/settings/ConfirmModal";
import { generatePromptFromImage } from "./api/gemini";
import { createThumbnail, compressImage } from "./utils/imageCompression";
import { downloadImageAsFile } from "./utils/firebaseStorage";

export default function App() {
  const { user, loading, logout } = useAuth();
  const { getSetting } = useSettings();
  const { t } = useTranslation();
  
  // Загрузка данных пользователя из Firestore
  const {
    credits: userCredits,
    savedPrompts,
    chatHistory,
    isLoading: isLoadingData,
    addSavedPrompt,
    removeSavedPrompt,
    isPromptSaved,
    addChatMessage,
    updateChatMessage,
    clearChat,
    updateCredits
  } = useUserData();

  // Управление кредитами
  const { credits, hasEnough, deduct, add, setBalance } = useCredits(userCredits);

  // Синхронизация кредитов с Firestore
  useEffect(() => {
    setBalance(userCredits);
  }, [userCredits, setBalance]);

  // Локальное состояние UI
  const [activeTab, setActiveTab] = useState(TABS.CHAT);
  const [toastMsg, setToastMsg] = useState("");
  const [statusPhase, setStatusPhase] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isOffline, setIsOffline] = useState(!(navigator?.onLine ?? true));
  const [modalImage, setModalImage] = useState(null);
  const [undoData, setUndoData] = useState(null);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  
  // История чата в локальном состоянии для быстрого отображения
  const [localHistory, setLocalHistory] = useState([]);
  
  // Состояние для отслеживания развернутых сохраненных промптов
  const [expandedSavedPrompts, setExpandedSavedPrompts] = useState(new Set());
  
  const controllerRef = useRef(null);
  const chatRef = useRef(null);
  const fileInputRef = useRef(null);
  const uploadedFilesRef = useRef(new Map()); // Храним загруженные файлы

  // Синхронизация истории чата из Firestore
  useEffect(() => {
    if (!isLoadingData && chatHistory) {
      // Объединяем локальную историю с историей из Firestore
      // Сохраняем локальные миниатюры, если URL из Storage еще не загружен
      setLocalHistory((prev) => {
        const merged = chatHistory.map((firestoreItem) => {
          const localItem = prev.find((p) => p.id === firestoreItem.id);
          // Если есть локальный элемент с миниатюрой, но нет URL из Storage - сохраняем миниатюру
          if (localItem && localItem.image && !firestoreItem.imageUrl) {
            return { ...firestoreItem, image: localItem.image };
          }
          // Если есть URL из Storage - используем его
          return firestoreItem;
        });
        
        // Добавляем новые локальные элементы, которых еще нет в Firestore
        const newLocalItems = prev.filter(
          (localItem) => !chatHistory.some((fsItem) => fsItem.id === localItem.id)
        );
        
        return [...merged, ...newLocalItems];
      });
    }
  }, [chatHistory, isLoadingData]);

  // Отслеживание статуса подключения
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

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      controllerRef.current?.abort?.();
    };
  }, []);

  // Автоматический скролл вниз при изменениях
  useEffect(() => {
    if (activeTab !== TABS.CHAT || !chatRef.current) return;

    const scrollToBottom = () => {
      chatRef.current?.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: 'auto'
      });
    };

    scrollToBottom();
    const timeout = setTimeout(scrollToBottom, 100);

    return () => clearTimeout(timeout);
  }, [localHistory, statusPhase, activeTab]);

  // Ограничение размера истории
  useEffect(() => {
    const maxSize = getSetting("history", "maxHistorySize");
    if (maxSize === -1) return; // Unlimited
    
    if (localHistory.length > maxSize) {
      const toRemove = localHistory.length - maxSize;
      setLocalHistory((prev) => prev.slice(toRemove));
      
      // Note: Removed items are not deleted from Firestore automatically
      // to preserve user data. They will be cleaned up by autoClear if enabled.
    }
  }, [localHistory.length, getSetting, user]);

  // Автоматическая очистка истории
  useEffect(() => {
    const autoClear = getSetting("history", "autoClear");
    if (autoClear === "never" || !user) return;

    const daysMap = {
      "1 day": 1,
      "7 days": 7,
      "30 days": 30,
    };
    const days = daysMap[autoClear];
    if (!days) return;

    const cutoffDate = Date.now() - days * 24 * 60 * 60 * 1000;
    const toRemove = localHistory.filter((item) => {
      // Предполагаем, что у каждого элемента есть timestamp
      const itemDate = item.createdAt?.toMillis?.() || item.timestamp || 0;
      return itemDate < cutoffDate;
    });

    if (toRemove.length > 0) {
      setLocalHistory((prev) => prev.filter((item) => {
        const itemDate = item.createdAt?.toMillis?.() || item.timestamp || 0;
        return itemDate >= cutoffDate;
      }));
    }
  }, [localHistory, getSetting, user]);

  async function handleFile(file) {
    if (!file) return;
    
    // Валидация
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
    if (!hasEnough(GENERATION_COST)) {
      setToastMsg(`Not enough credits. You need ${GENERATION_COST} credits to generate a prompt.`);
      return;
    }

    // Проверка настройки askBeforeSpendingCredits
    const askBeforeSpending = getSetting("generation", "askBeforeSpendingCredits");
    if (askBeforeSpending) {
      setPendingFile(file);
      setShowCreditConfirm(true);
      return;
    }

    // Продолжаем без подтверждения
    await processFile(file);
  }

  async function processFile(file) {
    // Сжатие изображения, если включено
    let processedFile = file;
    const compressUploads = getSetting("images", "compressUploads");
    if (compressUploads) {
      try {
        const compressedBlob = await compressImage(file, { quality: 0.8 });
        processedFile = new File([compressedBlob], file.name, { type: compressedBlob.type || file.type });
      } catch (error) {
        console.warn("Failed to compress image, using original:", error);
      }
    }

    // Списание кредитов через Firestore
    const deductionResult = await deduct(GENERATION_COST);
    if (!deductionResult.success) {
      setToastMsg("Failed to deduct credits. Please try again.");
      return;
    }
    
    // Обновляем баланс в UI
    updateCredits(deductionResult.newBalance);

    // Чтение файла для предпросмотра
    const id = Date.now().toString();
    
    try {
      // Создаем миниатюру для быстрого отображения
      const quality = getSetting("images", "highQualityPreview") ? 800 : 400;
      const thumbnail = await createThumbnail(processedFile, quality);
      
      // Сохраняем файл для последующей загрузки в Storage
      uploadedFilesRef.current.set(id, processedFile);
      
      const newEntry = {
        id,
        image: thumbnail, // Используем миниатюру для UI
        prompt: null,
        status: GENERATION_STATUS.GENERATING,
        phases: [],
        timestamp: Date.now(),
      };
      
      setLocalHistory((prev) => [...prev, newEntry]);
      setIsRegenerating(false);
      startGeneration(processedFile, id, false);
    } catch (error) {
      setToastMsg("Failed to process image. Please try again.");
      const result = await add(GENERATION_COST);
      updateCredits(result.newBalance);
    }
  }

  async function startGeneration(file, id, isRegenerating = false) {
    controllerRef.current?.abort?.();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsGenerating(true);
    setStatusPhase(t("analysing"));

    generatePromptFromImage(file, {
      signal: controller.signal,
      onPhase: (phase) => {
        setStatusPhase(phase);
        setLocalHistory((prev) =>
          prev.map((h) => h.id === id ? { ...h, phases: [...(h.phases || []), phase] } : h)
        );
      },
    })
      .then(async (text) => {
        // Получаем текущий entry перед обновлением
        const currentEntry = localHistory.find((h) => h.id === id);
        const imageUrl = currentEntry?.imageUrl || currentEntry?.image;
        
        // Обновляем локальное состояние
        setLocalHistory((prev) =>
          prev.map((h) => h.id === id ? { ...h, prompt: text, status: GENERATION_STATUS.DONE } : h)
        );
        
        // Автоматическое сохранение промпта, если включено
        const autoSavePrompts = getSetting("generation", "autoSavePrompts");
        if (autoSavePrompts && text && imageUrl && !isPromptSaved(id)) {
          try {
            await addSavedPrompt({
              id: `${id}-auto`,
              image: imageUrl,
              prompt: text
            });
          } catch (error) {
            console.warn("Failed to auto-save prompt:", error);
          }
        }
        
        // Сохраняем в Firestore с изображением (только если это не регенерация или изображение еще не сохранено)
        const uploadedFile = uploadedFilesRef.current.get(id);
        const entry = localHistory.find((h) => h.id === id);
        const needsImageUpload = uploadedFile && !entry?.imageUrl;
        
        if (needsImageUpload && user) {
          try {
            await addChatMessage({
              id,
              imageFile: uploadedFile,
              prompt: text,
              status: GENERATION_STATUS.DONE,
              phases: []
            });
            // После успешной загрузки, URL из Storage будет обновлен в useUserData
            // Файл можно удалить из памяти, миниатюра останется в localHistory
            uploadedFilesRef.current.delete(id);
          } catch (storageError) {
            // Ошибка загрузки в Storage - показываем предупреждение, но не блокируем работу
            console.warn('Failed to save image to Storage:', storageError);
            if (storageError.message?.includes('CORS')) {
              setToastMsg("⚠️ Image upload failed (CORS). Check Firebase Storage rules. See CORS_FIX.md");
            } else {
              setToastMsg("⚠️ Image upload failed. Prompt saved, but image may not sync.");
            }
            // Продолжаем работу без изображения в Storage
            uploadedFilesRef.current.delete(id);
          }
        } else if (isRegenerating && user) {
          // При регенерации обновляем только промпт, изображение уже есть
          try {
            await updateChatMessage(id, {
              prompt: text,
              status: GENERATION_STATUS.DONE,
              phases: []
            });
          } catch (error) {
            console.warn('Failed to update chat message:', error);
          }
        }
        
        setStatusPhase("");
        controllerRef.current = null;
        setIsGenerating(false);
        setIsRegenerating(false);
      })
      .catch(async (err) => {
        controllerRef.current = null;
        setIsGenerating(false);
        setIsRegenerating(false);

        // Отмена генерации
        if (err?.type === "aborted") {
          setLocalHistory((prev) =>
            prev.map((h) => h.id === id
              ? { ...h, status: GENERATION_STATUS.STOPPED, prompt: "Generation stopped" }
              : h
            )
          );
          setStatusPhase("Generation stopped");
          const result = await add(GENERATION_COST);
          updateCredits(result.newBalance);
          // Очищаем файл из памяти
          uploadedFilesRef.current.delete(id);
          return;
        }

        // Обработка ошибок
        let msg = "Could not generate prompt from this image.";
        if (err?.type === "location_restricted") {
          msg = err.message || "⚠️ Gemini API is not available in your region. Please use a VPN and try again.";
          setToastMsg("Region restricted. Use VPN (US/UK/EU) to access Gemini API.");
        } else if (err?.type === "api_key" || err?.type === "forbidden") {
          msg = "⚠️ API key issue. Please update your Gemini API key.";
          setToastMsg("API key error. Check console for details.");
        } else if (err?.type === "network") {
          msg = "Network error. Please check your connection and try again.";
        }

        setLocalHistory((prev) =>
          prev.map((h) => h.id === id ? { ...h, status: GENERATION_STATUS.ERROR, prompt: msg } : h)
        );
        setStatusPhase("");
        const result = await add(GENERATION_COST);
        updateCredits(result.newBalance);
        // Очищаем файл из памяти
        uploadedFilesRef.current.delete(id);
      });
  }

  async function handleRegenerate(id) {
    const entry = localHistory.find((h) => h.id === id);
    if (!entry) return;

    // Валидация кредитов
    if (!hasEnough(GENERATION_COST)) {
      setToastMsg(`Not enough credits. You need ${GENERATION_COST} credits to regenerate.`);
      return;
    }

    // Проверка настройки askBeforeSpendingCredits
    const askBeforeSpending = getSetting("generation", "askBeforeSpendingCredits");
    if (askBeforeSpending) {
      setPendingFile({ id, isRegenerate: true });
      setShowCreditConfirm(true);
      return;
    }

    // Продолжаем без подтверждения
    await processRegenerate(id);
  }

  async function processRegenerate(id) {
    const entry = localHistory.find((h) => h.id === id);
    if (!entry) return;

    const deductionResult = await deduct(GENERATION_COST);
    if (!deductionResult.success) {
      setToastMsg("Failed to deduct credits. Please try again.");
      return;
    }
    
    // Обновляем баланс в UI
    updateCredits(deductionResult.newBalance);

    // Проверяем, есть ли сохраненный файл
    let file = uploadedFilesRef.current.get(id);
    
    // Если файла нет в памяти, пытаемся загрузить из Storage
    if (!file && entry.imageUrl && user) {
      try {
        file = await downloadImageAsFile(entry.imageUrl, `regen-${id}.webp`);
      } catch (error) {
        console.warn('Failed to load image from Storage:', error);
      }
    }
    
    // Если все еще нет файла, пытаемся использовать миниатюру
    if (!file && entry.image) {
      try {
        // Конвертируем миниатюру обратно в файл
        file = await dataURLtoFile(entry.image, `regen-${id}.png`);
      } catch (error) {
        console.warn('Failed to convert thumbnail to file:', error);
      }
    }
    
    if (!file) {
      setToastMsg("Failed to regenerate. Please try uploading again.");
      const result = await add(GENERATION_COST);
      updateCredits(result.newBalance);
      return;
    }

    // Сохраняем файл для последующей загрузки
    uploadedFilesRef.current.set(id, file);

    setLocalHistory((prev) =>
      prev.map((h) => h.id === id
        ? { ...h, status: GENERATION_STATUS.GENERATING, prompt: null, phases: [] }
        : h
      )
    );
    setIsRegenerating(true);
    await startGeneration(file, id, true); // Передаем флаг регенерации
  }

  const handleCopy = useCallback(async (text) => {
    const success = await copyToClipboard(text);
    setToastMsg(success ? t("copied") : t("couldNotCopy"));
  }, [t]);

  const handleMessageExpand = useCallback((messageElement) => {
    if (!chatRef.current || !messageElement) return;

    setTimeout(() => {
      if (!chatRef.current || !messageElement) return;

      const chat = chatRef.current;
      const messageRect = messageElement.getBoundingClientRect();
      const chatRect = chat.getBoundingClientRect();
      const footerHeight = 100;
      const visibleBottom = chatRect.bottom - footerHeight;

      if (messageRect.bottom > visibleBottom) {
        const overflow = messageRect.bottom - visibleBottom;
        chat.scrollBy({ top: overflow + 20, behavior: 'smooth' });
      }
    }, 50);
  }, []);

  const handleNewChat = useCallback(async () => {
    controllerRef.current?.abort?.();
    controllerRef.current = null;
    setIsGenerating(false);
    setIsRegenerating(false);
    setStatusPhase("");
    
    // Очищаем локальную историю
    setLocalHistory([]);
    
    // Очищаем файлы из памяти
    uploadedFilesRef.current.clear();
    
    // Очищаем историю в Firestore
    if (user) {
      await clearChat();
    }
  }, [user, clearChat]);

  const toggleSave = useCallback(async (id) => {
    const entry = localHistory.find((h) => h.id === id);
    if (!entry || !entry.prompt || entry.status !== GENERATION_STATUS.DONE) return;

    const isSaved = isPromptSaved(id);
    
    if (isSaved) {
      // Удаляем из сохраненных
      await removeSavedPrompt(id);
    } else {
      // Добавляем в сохраненные
      const uploadedFile = uploadedFilesRef.current.get(id);
      // Используем URL из Storage, если есть, иначе миниатюру
      const imageToSave = entry.imageUrl || entry.image || null;
      await addSavedPrompt({
        id: entry.id,
        image: imageToSave,
        imageFile: uploadedFile, // Файл для загрузки в Storage, если еще не загружен
        prompt: entry.prompt
      });
    }
  }, [localHistory, isPromptSaved, addSavedPrompt, removeSavedPrompt]);

  const deleteSaved = useCallback(async (id) => {
    const itemIndex = savedPrompts.findIndex((p) => p.id === id);
    if (itemIndex === -1) return;

    setUndoData({ item: savedPrompts[itemIndex], index: itemIndex, action: "delete" });
    await removeSavedPrompt(id);
  }, [savedPrompts, removeSavedPrompt]);

  const handleUndo = useCallback(async () => {
    if (!undoData || undoData.action !== "delete") return;

    // Восстанавливаем удаленный промпт
    await addSavedPrompt({
      id: undoData.item.id,
      image: undoData.item.imageUrl || undoData.item.image,
      prompt: undoData.item.prompt
    });

    setUndoData(null);
  }, [undoData, addSavedPrompt]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed", error);
      setToastMsg("Could not sign out");
    }
  }, [logout]);

  if (loading || isLoadingData) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh'
      }}>
        <DotLottieReact
          src="https://lottie.host/620b0535-fab7-497b-a959-eaa1aa68c8c7/mxvQ1zMQvz.lottie"
          loop
          autoplay
        />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return (
    <div className={`app ${activeTab === TABS.FAVORITES ? "favorites-active" : ""}`}>
      <div className={`header ${localHistory.length === 0 && activeTab === TABS.CHAT ? "header-centered" : ""}`}>
        <div className="header-left">
          <span className="header-credits">{formatCredits(credits)} {t("credits")}</span>
        </div>
        {localHistory.length > 0 && activeTab === TABS.CHAT && (
          <button
            className="header-new-chat-btn"
            onClick={handleNewChat}
            aria-label={t("newChat")}
            title={t("newChat")}
          >
            <span>{t("newChat")}</span>
          </button>
        )}
      </div>

      {/* Chat Tab */}
      {activeTab === TABS.CHAT && (
        <div ref={chatRef} className={`chat ${localHistory.length === 0 ? "chat-empty" : ""}`}>
          {localHistory.length === 0 && (
            <div className="uploader-block">
              <ImageUploader onFile={handleFile} />
              {isOffline && <div className="offline-hint">{t("offline")}</div>}
            </div>
          )}

          {localHistory.length > 0 && <div className="chat-spacer" />}

          {localHistory.map((item) => {
            const isSaved = isPromptSaved(item.id);
            return (
              <React.Fragment key={item.id}>
                {/* user message */}
                <div className="message-row user">
                  <div className="message user-msg">
                    {(item.image || item.imageUrl) && (
                      <img
                        src={item.imageUrl || item.image}
                        alt="Uploaded image preview"
                        className="preview"
                        onClick={() => setModalImage(item.imageUrl || item.image)}
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
                          ? item.phases[item.phases.length - 1] || t("analysing")
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
              <p>{t("noSavedPrompts")}</p>
              <p className="saved-empty-hint">
                {t("savedPromptsHint")}
              </p>
            </div>
          ) : (
            <div className="saved-grid">
              {savedPrompts.map((item) => (
                <div key={item.id} className="saved-card">
                  <button
                    className="saved-delete-btn"
                    onClick={() => deleteSaved(item.id)}
                    aria-label={t("removeFromSaved")}
                  >
                    <Heart 
                      size={16} 
                      fill="#ef4444" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      style={{ color: '#ef4444' }}
                    />
                  </button>
                  {(item.imageUrl || item.image) && (
                    <img
                      src={item.imageUrl || item.image}
                      alt="Saved prompt preview"
                      className="saved-image"
                      onClick={() => setModalImage(item.imageUrl || item.image)}
                    />
                  )}
                  <div 
                    className="saved-prompt-area"
                    onClick={() => handleCopy(item.prompt)}
                  >
                    <div className={`saved-prompt promptText ${expandedSavedPrompts.has(item.id) ? "expanded" : "collapsed"}`}>
                      {item.prompt}
                    </div>
                    {item.prompt && item.prompt.length > 250 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedSavedPrompts((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(item.id)) {
                              newSet.delete(item.id);
                            } else {
                              newSet.add(item.id);
                            }
                            return newSet;
                          });
                          e.currentTarget.blur();
                        }}
                        className="expandLink saved-expand-link"
                        aria-label={expandedSavedPrompts.has(item.id) ? "Collapse prompt" : "Show full prompt"}
                      >
                        {expandedSavedPrompts.has(item.id) ? t("showLess") : t("showMore")}
                        {expandedSavedPrompts.has(item.id) ? (
                          <ChevronUp size={14} className="expandIcon" />
                        ) : (
                          <ChevronDown size={14} className="expandIcon" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === TABS.SETTINGS && (
        <Settings onLogout={handleLogout} />
      )}

      {/* Credit Confirmation Modal */}
      <ConfirmModal
        isOpen={showCreditConfirm}
        onClose={() => {
          setShowCreditConfirm(false);
          setPendingFile(null);
        }}
        onConfirm={async () => {
          if (pendingFile) {
            if (pendingFile.isRegenerate) {
              await processRegenerate(pendingFile.id);
            } else {
              await processFile(pendingFile);
            }
            setPendingFile(null);
          }
        }}
        title={t("spendCredits")}
        message={t("spendCredits", { cost: GENERATION_COST })}
        confirmText={t("confirm")}
        cancelText={t("cancel")}
        danger={false}
      />

      {/* Bottom Container with buttons and navigation */}
      <div className="bottom-container">
        {localHistory.length > 0 && activeTab === TABS.CHAT && (
          <div className="footer">
            <div className="controls">
              <button
                className="btn btn-upload"
                onClick={() => fileInputRef.current?.click()}
                aria-label={t("uploadImage")}
              >
                <Upload size={18} />
                <span>{t("uploadImage")}</span>
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
                  const last = localHistory[localHistory.length - 1];
                  if (last) handleRegenerate(last.id);
                }}
                disabled={localHistory.length === 0 || isGenerating}
                aria-label={isGenerating ? (isRegenerating ? t("regenerating") : t("generating")) : t("regenerate")}
              >
                <RotateCw size={18} className={isGenerating ? "rotating" : ""} />
                <span>
                  {isGenerating 
                    ? (isRegenerating ? t("regenerating") : t("generating")) 
                    : t("regenerate")}
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
          <span>{t("favorites")}</span>
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
          <span>{t("chat")}</span>
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
          <span>{t("settings")}</span>
        </button>
        </div>
      </div>

      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg("")} isFavoritesActive={activeTab === TABS.FAVORITES} />}
      
      {undoData && (
        <UndoSnackbar
          message="Removed from saved"
          onUndo={handleUndo}
          onClose={() => setUndoData(null)}
        />
      )}
      
      {modalImage && (
        <ImageModal imageSrc={modalImage} onClose={() => setModalImage(null)} />
      )}
    </div>
  );
}
