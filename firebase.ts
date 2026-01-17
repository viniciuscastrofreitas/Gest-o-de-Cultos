
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyANSXKdC0Peb8k_ThJ_JWaP7ynQlQQMC2Q",
  authDomain: "relatoriodeculto-b23a4.firebaseapp.com",
  projectId: "relatoriodeculto-b23a4",
  storageBucket: "relatoriodeculto-b23a4.firebasestorage.app",
  messagingSenderId: "231094909067",
  appId: "1:231094909067:web:35208e733ba2e0cc22bc8e",
  measurementId: "G-QE260B3DP2"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e exporta as instâncias dos serviços
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Exporta as funções necessárias para os outros componentes
export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  doc, 
  setDoc, 
  getDoc 
};
