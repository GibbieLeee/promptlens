import { useState } from "react";
import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
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
        credits: 20,
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
  const handleGoogleSignUp = async () => {
    setError("");
    const provider = new GoogleAuthProvider();

    try {
      // Desktop → нормальный popup
      if (window.innerWidth > 600) {
        const userCred = await signInWithPopup(auth, provider);
        const user = userCred.user;

        // Проверяем, существует ли документ
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          await setDoc(ref, {
            email: user.email,
            credits: 20,
            createdAt: serverTimestamp(),
          });
        }

        onClose();
        return;
      }

      // Mobile → redirect (popup часто блокируется)
      await signInWithRedirect(auth, provider);
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

        <h2>Create your account</h2>
        <p className="modal-subtitle">Start generating prompts with 20 free credits.</p>

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

        <button className="modal-btn secondary" onClick={handleGoogleSignUp}>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
