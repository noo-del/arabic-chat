// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHu4c63hEGa-3EG7aL8V6ISXtk5hv_fGc",
  authDomain: "arabi-chat-new.firebaseapp.com",
  projectId: "arabi-chat-new",
  storageBucket: "arabi-chat-new.firebasestorage.app",
  messagingSenderId: "931413479287",
  appId: "1:931413479287:web:3d5a2c286d8286949edb72",
  measurementId: "G-D1G6NDFGBF"
};

// Initialize Firebase (Safely checks if already initialized to prevent duplicate app errors)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export { 
  auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  signOut,
  onAuthStateChanged
};
