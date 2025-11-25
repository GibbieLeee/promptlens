import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDZX432nUwS2nR6HK-TaoK42Jl8k_hZWjg",
  authDomain: "promptlens-gibbie.firebaseapp.com",
  projectId: "promptlens-gibbie",
  storageBucket: "promptlens-gibbie.firebasestorage.app",
  messagingSenderId: "1079422322442",
  appId: "1:1079422322442:web:ba706a753be431a6981cf3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
