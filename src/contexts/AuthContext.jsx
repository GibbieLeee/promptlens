import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase";
import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  getRedirectResult
} from "firebase/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); 
  const [redirectChecked, setRedirectChecked] = useState(false);

  // 1. Handle Google redirect result (MOBILE FIX)
  useEffect(() => {
    async function checkRedirect() {
      try {
        const provider = new GoogleAuthProvider();
        const result = await getRedirectResult(auth);

        if (result && result.user) {
          setUser(result.user);
        }
      } catch (e) {
        console.error("Redirect login error:", e);
      } finally {
        setRedirectChecked(true);
      }
    }

    checkRedirect();
  }, []);

  // 2. Normal Firebase listener
  useEffect(() => {
    if (!redirectChecked) return;

    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsub();
  }, [redirectChecked]);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
