import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Upload, RotateCw, Copy, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { ChatActive, ChatInactive } from "./components/icons/ChatIcon";
import { SavedActive, SavedInactive } from "./components/icons/SavedIcon";
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
import { VALID_TYPES, MAX_SIZE, GENERATION_STATUS, TABS, LOADING_ANIMATION_URL } from "./constants";
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
import logger from "./utils/logger";

export default function App() {
  const { user, loading, logout } = useAuth();
  const { getSetting } = useSettings();
  const { t, lang } = useTranslation();
  
  // Мемоизация переводов для часто используемых строк (оптимизация производительности)
  const translations = useMemo(() => ({
    // Navigation
    chat: t("chat"),
    saved: t("saved"),
    settings: t("settings"),
    
    // Common
    credits: t("credits"),
    copy: t("copy"),
    save: t("save"),
    cancel: t("cancel"),
    confirm: t("confirm"),
    loading: t("loading"),
    
    // Chat
    uploadImage: t("uploadImage"),
    dragDrop: t("dragDrop"),
    generating: t("generating"),
    regenerating: t("regenerating"),
    analysing: t("analysing"),
    copied: t("copied"),
    couldNotCopy: t("couldNotCopy"),
    newChat: t("newChat"),
    regenerate: t("regenerate"),
    yourPrompt: t("yourPrompt"),
    generationStopped: t("generationStopped"),
    
    // Saved
    noSavedPrompts: t("noSavedPrompts"),
    savedPromptsHint: t("savedPromptsHint"),
    showMore: t("showMore"),
    showLess: t("showLess"),
    removeFromSaved: t("removeFromSaved"),
    savePrompt: t("savePrompt"),
    
    // Errors
    fileTooLarge: t("fileTooLarge"),
    unsupportedFormat: t("unsupportedFormat"),
    offline: t("offline"),
  }), [lang]); // Пересчитываем только при смене языка
  
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
    deleteOldMessages,
    updateCredits
  } = useUserData();

  // Управление кредитами
  const { credits, hasEnough, deduct, add, setBalance } = useCredits(userCredits);

  // Синхронизация кредитов с Firestore
  useEffect(() => {
    setBalance(userCredits);
  }, [userCredits]); // setBalance мемоизирован и стабилен

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
      setLocalHistory((prev) => {
        const merged = chatHistory.map((firestoreItem) => {
          const localItem = prev.find((p) => p.id === firestoreItem.id);
          
          // Создаем объединенный элемент с данными из Firestore
          return {
            ...firestoreItem,
            // Сохраняем imageUrl для использования при сохранении в избранное
            imageUrl: firestoreItem.imageUrl || null,
            // Также копируем в image для отображения (для обратной совместимости)
            image: firestoreItem.imageUrl || localItem?.image || null
          };
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
    if (maxSize === -1 || !user) return; // Unlimited или не авторизован
    
    if (localHistory.length > maxSize) {
      const toRemove = localHistory.slice(0, localHistory.length - maxSize);
      const idsToRemove = toRemove.map(item => item.id);
      
      // Удаляем из локального state
      setLocalHistory((prev) => prev.slice(-maxSize));
      
      // Удаляем из Firestore асинхронно
      if (idsToRemove.length > 0) {
        deleteOldMessages(idsToRemove).catch(error => {
          logger.warn('Failed to delete old messages from Firestore:', error);
        });
      }
    }
  }, [localHistory.length, getSetting, user, deleteOldMessages]);

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
      const idsToRemove = toRemove.map(item => item.id);
      
      // Удаляем из локального state
      setLocalHistory((prev) => prev.filter((item) => {
        const itemDate = item.createdAt?.toMillis?.() || item.timestamp || 0;
        return itemDate >= cutoffDate;
      }));
      
      // Удаляем из Firestore асинхронно
      deleteOldMessages(idsToRemove).catch(error => {
        logger.warn('Failed to delete old messages from Firestore:', error);
      });
    }
  }, [localHistory, getSetting, user, deleteOldMessages]);

  async function handleFile(file) {
    if (!file) return;
    
    // Валидация
    if (!VALID_TYPES.includes(file.type)) {
      setToastMsg(translations.unsupportedFormat);
      return;
    }
    if (file.size > MAX_SIZE) {
      setToastMsg(translations.fileTooLarge);
      return;
    }
    if (isOffline) {
      setToastMsg(translations.offline);
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
        logger.warn("Failed to compress image, using original:", error);
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
      
      if (!thumbnail || thumbnail.length < 50) {
        throw new Error('Failed to create thumbnail');
      }
      
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
      logger.error('Failed to process image:', error);
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
    setStatusPhase(translations.analysing);

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
        // Получаем актуальный entry и обновляем state в одном вызове (исправление Race Condition)
        let currentEntry;
        setLocalHistory((prev) => {
          currentEntry = prev.find((h) => h.id === id);
          return prev.map((h) => h.id === id ? { ...h, prompt: text, status: GENERATION_STATUS.DONE } : h);
        });
        
        const imageUrl = currentEntry?.imageUrl || currentEntry?.image;
        const uploadedFile = uploadedFilesRef.current.get(id);
        const needsImageUpload = uploadedFile && !currentEntry?.imageUrl;
        
        if (needsImageUpload && user) {
          try {
            const result = await addChatMessage({
              id,
              imageFile: uploadedFile,
              prompt: text,
              status: GENERATION_STATUS.DONE,
              phases: []
            });
            // После успешной загрузки, URL из Storage будет обновлен в useUserData
            uploadedFilesRef.current.delete(id);
            
            // Автосохранение с URL из Storage или миниатюрой
            const finalImageUrl = result?.imageUrl || imageUrl;
            await autoSavePromptIfNeeded(id, text, finalImageUrl);
          } catch (storageError) {
            // Ошибка загрузки в Storage - показываем предупреждение, но не блокируем работу
            logger.warn('Failed to save image to Storage:', storageError);
            if (storageError.message?.includes('CORS')) {
              setToastMsg("⚠️ Image upload failed (CORS). Check Firebase Storage rules. See CORS_FIX.md");
            } else {
              setToastMsg("⚠️ Image upload failed. Prompt saved, but image may not sync.");
            }
            uploadedFilesRef.current.delete(id);
            
            // Автосохранение с миниатюрой
            await autoSavePromptIfNeeded(id, text, imageUrl);
          }
        } else if (isRegenerating && user) {
          // При регенерации обновляем только промпт, изображение уже есть
          try {
            await updateChatMessage(id, {
              prompt: text,
              status: GENERATION_STATUS.DONE,
              phases: []
            });
            
            // Автосохранение при регенерации
            await autoSavePromptIfNeeded(id, text, imageUrl);
          } catch (error) {
            logger.warn('Failed to update chat message:', error);
          }
        } else {
          // Если изображение уже загружено или пользователь не авторизован
          await autoSavePromptIfNeeded(id, text, imageUrl);
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
        logger.warn('Failed to load image from Storage:', error);
      }
    }
    
    // Если все еще нет файла, пытаемся использовать миниатюру
    if (!file && entry.image) {
      try {
        // Конвертируем миниатюру обратно в файл
        file = await dataURLtoFile(entry.image, `regen-${id}.png`);
      } catch (error) {
        logger.warn('Failed to convert thumbnail to file:', error);
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

  // Автосохранение промпта при включенной настройке
  const autoSavePromptIfNeeded = useCallback(async (id, text, imageUrl) => {
    const autoSavePrompts = getSetting("generation", "autoSavePrompts");
    if (autoSavePrompts && text && imageUrl && !isPromptSaved(id)) {
      try {
        await addSavedPrompt({
          id,
          image: imageUrl,
          prompt: text
        });
      } catch (error) {
        logger.warn("Failed to auto-save prompt:", error);
      }
    }
  }, [getSetting, isPromptSaved, addSavedPrompt]);

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
      // Приоритет: imageUrl (Storage URL) > image (Data URL миниатюра)
      const imageToSave = entry.imageUrl || entry.image || null;
      
      await addSavedPrompt({
        id: entry.id,
        image: imageToSave, // Storage URL или Data URL
        imageFile: uploadedFile, // Файл (если еще в памяти) - для создания копии
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
      logger.error("Logout failed", error);
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
          src={LOADING_ANIMATION_URL}
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
    <div className={`app ${activeTab === TABS.SAVED ? "saved-active" : ""}`}>
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
      <div 
        ref={chatRef} 
        className={`chat ${localHistory.length === 0 ? "chat-empty" : ""} tab-content ${activeTab === TABS.CHAT ? 'tab-active' : 'tab-hidden'}`}
        style={{ display: activeTab === TABS.CHAT ? 'flex' : 'none' }}
      >
          {localHistory.length === 0 && (
            <div className="uploader-block">
              <ImageUploader onFile={handleFile} />
              {isOffline && <div className="offline-hint">{t("offline")}</div>}
            </div>
          )}

          {localHistory.length > 0 && <div className="chat-spacer" />}

          {localHistory.map((item) => {
            const isSaved = isPromptSaved(item.id);
            // Используем image (которое может содержать imageUrl из Firestore или локальную миниатюру)
            const imageSrc = item.image || item.imageUrl;
            
            return (
              <React.Fragment key={item.id}>
                {/* user message */}
                <div className="message-row user">
                  <div className="message user-msg">
                    {imageSrc && (
                      <img
                        src={imageSrc}
                        alt="Uploaded image preview"
                        className="preview"
                        loading="lazy"
                        onClick={() => setModalImage(imageSrc)}
                        onError={(e) => {
                          logger.error('❌ Image failed to load:', { 
                            id: item.id, 
                            srcType: imageSrc.startsWith('data:') ? 'Data URL' : 'Storage URL',
                            srcPreview: imageSrc?.substring(0, 100),
                            error: e.type 
                          });
                        }}
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

      {/* Saved Tab */}
      <div 
        className={`saved-view tab-content ${activeTab === TABS.SAVED ? 'tab-active' : 'tab-hidden'}`}
        style={{ display: activeTab === TABS.SAVED ? 'block' : 'none' }}
      >
          {savedPrompts.length === 0 ? (
            <div className="saved-empty">
              <p>{t("noSavedPrompts")}</p>
              <p className="saved-empty-hint">
                {t("savedPromptsHint")}
              </p>
            </div>
          ) : (
            <div className="saved-grid">
              {savedPrompts.map((item) => {
                const savedImageSrc = item.imageUrl || item.image;
                
                return (
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
                  {savedImageSrc && (
                    <img
                      src={savedImageSrc}
                      alt="Saved prompt preview"
                      className="saved-image"
                      loading="lazy"
                      onClick={() => setModalImage(savedImageSrc)}
                      onError={(e) => {
                        logger.error('❌ Saved image failed to load:', { 
                          id: item.id,
                          srcType: savedImageSrc.startsWith('data:') ? 'Data URL' : 'Storage URL',
                          srcPreview: savedImageSrc?.substring(0, 100),
                          error: e.type 
                        });
                      }}
                    />
                  )}
                  <div 
                    className="saved-prompt-area"
                    onClick={() => handleCopy(item.prompt)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }}
                    onFocus={(e) => e.currentTarget.blur()}
                    tabIndex={-1}
                    style={{ outline: 'none', WebkitTapHighlightColor: 'transparent', background: 'transparent' }}
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
              );
              })}
            </div>
          )}
      </div>

      {/* Settings Tab */}
      {activeTab === TABS.SETTINGS && (
        <Settings 
          onLogout={handleLogout} 
          isActive={activeTab === TABS.SETTINGS}
        />
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
          className={`bottom-nav-tab ${activeTab === TABS.SAVED ? "active" : ""}`}
          onClick={() => setActiveTab(TABS.SAVED)}
        >
          {activeTab === TABS.SAVED ? (
            <SavedActive width={20} height={20} />
          ) : (
            <SavedInactive width={20} height={20} />
          )}
          <span>{t("saved")}</span>
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

      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg("")} isSavedActive={activeTab === TABS.SAVED} />}
      
      {undoData && (
        <UndoSnackbar
          message="Removed from saved"
          onUndo={handleUndo}
          onClose={() => setUndoData(null)}
          isSavedActive={activeTab === TABS.SAVED}
        />
      )}
      
      {modalImage && (
        <ImageModal imageSrc={modalImage} onClose={() => setModalImage(null)} />
      )}
    </div>
  );
}
