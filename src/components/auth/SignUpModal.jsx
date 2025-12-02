import { useState } from "react";
import { auth, db, googleProvider } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

export default function SignUpModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // -------------------------------
  // Email + Password Sign Up
  // -------------------------------
  const handleEmailSignUp = async () => {
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      // Создаем пользователя
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // Создаем Firestore документ
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        credits: 10000, // Начальный баланс для тестирования
        createdAt: serverTimestamp(),
      });

      onClose();
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  // -------------------------------
  // Google Sign Up
  // -------------------------------
  const handleGoogleSignUp = async (e) => {
    // Предотвращаем стандартное поведение, если это нужно
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setError("");
    setLoading(true);
    
    // Используем экспортированный провайдер и настраиваем его
    const provider = googleProvider;
    
    // Добавляем scope для получения email и профиля
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    // Detect if mobile browser → popup will fail
    // Более точная детекция: проверяем только реальные мобильные устройства
    const userAgent = navigator.userAgent || '';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent) && 
                     !/Windows Phone|Mobile/i.test(userAgent) && 
                     window.innerWidth < 768; // Дополнительная проверка по ширине экрана

    try {
      if (isMobile) {
        // Mobile browsers block popups → use redirect
        await signInWithRedirect(auth, provider);
        // Note: onClose() is not called here because redirect will navigate away
      } else {
        // Desktop works fine with popup
        const userCred = await signInWithPopup(auth, provider);
        const user = userCred.user;

        // Проверяем, существует ли документ
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          await setDoc(ref, {
            email: user.email,
            displayName: user.displayName || null,
            photoURL: user.photoURL || null,
            credits: 10000, // Начальный баланс для тестирования
            createdAt: serverTimestamp(),
          });
        }

        // Небольшая задержка, чтобы AuthContext успел обработать пользователя
        await new Promise(resolve => setTimeout(resolve, 100));
        setLoading(false);
        onClose();
      }
    } catch (err) {
      setLoading(false);
      console.error('Google sign-up error:', err);
      
      // Better error message for redirect_uri_mismatch
      if (err.code === "auth/redirect-uri-mismatch" || err.message?.includes("redirect_uri_mismatch")) {
        setError("OAuth configuration error. Please contact the developer. Error: redirect_uri_mismatch");
      } else if (err.code === "auth/popup-blocked") {
        setError("Popup was blocked. Please allow popups for this site and try again.");
      } else if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-up was cancelled. Please try again.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Google sign-in is not enabled. Please contact the developer.");
      } else if (err.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized for Google sign-in. Please contact the developer.");
      } else {
        setError(err.message || `Failed to sign up with Google. Error: ${err.code || 'unknown'}`);
      }
    }
  };

  return (
    <div className="modal">
      <div className="modal-content auth-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <span className="sr-only">Close</span>
        </button>

        <h2>Create your account</h2>
        <p className="modal-subtitle">Start generating prompts with 10,000 free credits.</p>

        {error && <div className="modal-error">{error}</div>}

        <label className="modal-field">
          <span>Email</span>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="modal-input"
          />
        </label>

        <label className="modal-field">
          <span>Password</span>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="modal-input"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <label className="modal-field">
          <span>Confirm password</span>
          <div className="password-field">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="modal-input"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <button
          className="modal-btn primary"
          onClick={handleEmailSignUp}
          disabled={loading}
        >
          {loading ? "Creating account…" : "Create account"}
        </button>

        <div className="modal-divider">
          <span>or sign up with</span>
        </div>

        <button 
          type="button"
          className="modal-btn secondary" 
          onClick={handleGoogleSignUp}
          disabled={loading}
        >
          {loading ? "Signing up…" : "Continue with Google"}
        </button>
      </div>
    </div>
  );
}
