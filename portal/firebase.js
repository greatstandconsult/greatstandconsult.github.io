import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCX_ZC18wviACEZg2oxDY",
  authDomain: "great-stand-consult.firebaseapp.com",
  projectId: "great-stand-consult",
  storageBucket: "great-stand-consult.firebasestorage.app",
  messagingSenderId: "759290092567",
  appId: "1:759290092567:web:4e873f1ad166cb54d11052",
  measurementId: "G-BPTN65KHK7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
