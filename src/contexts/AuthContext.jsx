import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

const INITIAL_CREDITS = 10000; // Начальный баланс для новых пользователей (для тестирования)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------
  // Функция для создания/проверки профиля пользователя
  // ---------------------------------------
  const ensureUserProfile = async (firebaseUser) => {
    if (!firebaseUser) return;

    try {
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Создаем новый профиль для пользователя
        await setDoc(userRef, {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || null,
          photoURL: firebaseUser.photoURL || null,
          credits: INITIAL_CREDITS,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Failed to ensure user profile:", error);
    }
  };

  // ---------------------------------------
  // Handle signInWithRedirect() result
  // Это должно быть вызвано ПЕРЕД onAuthStateChanged, чтобы правильно обработать redirect
  // ---------------------------------------
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          await ensureUserProfile(result.user);
          // Пользователь будет установлен через onAuthStateChanged
        }
      } catch (err) {
        console.error("AuthContext: Redirect error:", err);
        // Не устанавливаем loading в false здесь, пусть onAuthStateChanged это сделает
      }
    };

    // Проверяем redirect result сразу при монтировании
    checkRedirectResult();
  }, []);

  // ---------------------------------------
  // Track auth state and ensure profile exists
  // ---------------------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Проверяем/создаем профиль при каждом входе
        await ensureUserProfile(firebaseUser);
        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsub();
    };
  }, []);

  // ---------------------------------------
  // Logout function
  // ---------------------------------------
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
