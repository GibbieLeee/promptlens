// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Проверка наличия всех необходимых переменных окружения
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    '%c⚠️ Firebase Configuration Missing!',
    'color: #ef4444; font-size: 16px; font-weight: bold;'
  );
  console.log(
    '%cPlease configure Firebase in your .env file.\n\n' +
    'Required variables:\n' +
    'VITE_FIREBASE_API_KEY\n' +
    'VITE_FIREBASE_AUTH_DOMAIN\n' +
    'VITE_FIREBASE_PROJECT_ID\n' +
    'VITE_FIREBASE_STORAGE_BUCKET\n' +
    'VITE_FIREBASE_MESSAGING_SENDER_ID\n' +
    'VITE_FIREBASE_APP_ID\n\n' +
    'See README.md for setup instructions',
    'color: #f59e0b; font-size: 14px;'
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
