import { useState } from "react";
import { auth, googleProvider } from "../../firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  sendPasswordResetEmail
} from "firebase/auth";

export default function SignInModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Detect if mobile browser → popup will fail
  // Более точная детекция: проверяем только реальные мобильные устройства
  const userAgent = navigator.userAgent || '';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent) && 
                   !/Windows Phone|Mobile/i.test(userAgent) && 
                   window.innerWidth < 768; // Дополнительная проверка по ширине экрана

  const handleEmailLogin = async () => {
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      onClose();
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    setResetLoading(true);
    setError("");
    setResetSent(false);

    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else {
        setError(err.message || "Failed to send password reset email.");
      }
    }

    setResetLoading(false);
  };

  const handleGoogle = async (e) => {
    // Предотвращаем стандартное поведение, если это нужно
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Используем экспортированный провайдер и настраиваем его
    const provider = googleProvider;
    
    // Добавляем scope для получения email и профиля
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    setError("");
    setLoading(true);

    try {
      if (isMobile) {
        // Mobile browsers block popups → use redirect  
        await signInWithRedirect(auth, provider);
        // Note: onClose() is not called here because redirect will navigate away
        // Loading state will remain true as component will unmount
      } else {
        // Desktop works fine with popup
        const result = await signInWithPopup(auth, provider);
        // The AuthContext will handle user profile creation via onAuthStateChanged
        if (result && result.user) {
          // Небольшая задержка, чтобы AuthContext успел обработать пользователя
          await new Promise(resolve => setTimeout(resolve, 100));
          setLoading(false);
          onClose();
        } else {
          throw new Error('No user returned from Google sign-in');
        }
      }
    } catch (err) {
      setLoading(false);
      console.error('Google sign-in error:', err);
      
      // Better error message for redirect_uri_mismatch
      if (err.code === "auth/redirect-uri-mismatch" || err.message?.includes("redirect_uri_mismatch")) {
        setError("OAuth configuration error. Please contact the developer. Error: redirect_uri_mismatch");
      } else if (err.code === "auth/popup-blocked") {
        setError("Popup was blocked. Please allow popups for this site and try again.");
      } else if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in was cancelled. Please try again.");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Google sign-in is not enabled. Please contact the developer.");
      } else if (err.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized for Google sign-in. Please contact the developer.");
      } else {
        setError(err.message || `Failed to sign in with Google. Error: ${err.code || 'unknown'}`);
      }
    }
  };

  return (
    <div className="modal">
      <div className="modal-content auth-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <span className="sr-only">Close</span>
        </button>

        <h2>Welcome back</h2>
        <p className="modal-subtitle">Sign in to keep generating and saving prompts.</p>

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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) {
                  handleEmailLogin();
                }
              }}
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

        {resetSent ? (
          <div className="modal-success" style={{ 
            padding: "12px", 
            backgroundColor: "#d1fae5", 
            color: "#065f46", 
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px"
          }}>
            ✓ Password reset email sent! Check your inbox and follow the instructions to reset your password.
          </div>
        ) : (
          <button
            type="button"
            className="modal-link"
            onClick={handleResetPassword}
            disabled={resetLoading || !email}
            style={{
              marginBottom: "16px",
              fontSize: "14px",
              color: "#3b82f6",
              background: "none",
              border: "none",
              cursor: resetLoading || !email ? "not-allowed" : "pointer",
              textDecoration: "underline",
              padding: "8px 0"
            }}
          >
            {resetLoading ? "Sending…" : "Forgot password?"}
          </button>
        )}

        <button
          className="modal-btn primary"
          onClick={handleEmailLogin}
          disabled={loading}
        >
          {loading ? "Signing in…" : "Continue"}
        </button>

        <div className="modal-divider">
          <span>or continue with</span>
        </div>

        <button 
          type="button"
          className="modal-btn secondary" 
          onClick={handleGoogle}
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}
