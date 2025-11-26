import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  getRedirectResult,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------
  // Handle signInWithRedirect() result
  // ---------------------------------------
  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);

        if (result && result.user) {
          const u = result.user;

          // Ensure Firestore doc exists
          const ref = doc(db, "users", u.uid);
          const snap = await getDoc(ref);

          if (!snap.exists()) {
            await setDoc(ref, {
              email: u.email,
              credits: 20,
              createdAt: serverTimestamp(),
            });
          }
        }
      } catch (err) {
        console.error("Redirect error:", err);
      }
    };

    checkRedirectResult();
  }, []);

  // ---------------------------------------
  // Track auth state
  // ---------------------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
