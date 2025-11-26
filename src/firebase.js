// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDZX432nUwS2nR6HK-TaoK42Jl8k_hZWjg",
  authDomain: "promptlens-gibbie.firebaseapp.com",
  projectId: "promptlens-gibbie",
  storageBucket: "promptlens-gibbie.appspot.com",
  messagingSenderId: "1079422322442",
  appId: "1:1079422322442:web:ba706a753be431a6981cf3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
