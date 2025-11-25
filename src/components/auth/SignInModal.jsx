import { useState } from "react";
import { auth } from "../../firebase";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect
} from "firebase/auth";

export default function SignInModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Detect if mobile browser → popup will fail
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

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

  const handleGoogle = async () => {
    const provider = new GoogleAuthProvider();
    setError("");

    try {
      if (isMobile) {
        // Mobile browsers block popups → use redirect  
        await signInWithRedirect(auth, provider);
      } else {
        // Desktop works fine with popup
        await signInWithPopup(auth, provider);
        onClose();
      }
    } catch (err) {
      setError(err.message);
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

        <button className="modal-btn secondary" onClick={handleGoogle}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
