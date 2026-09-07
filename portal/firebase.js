// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCX_ZC18wviACEbGwTLBQiD95HVZg2oxDY",
  authDomain: "great-stand-consult.firebaseapp.com",
  projectId: "great-stand-consult",
  storageBucket: "great-stand-consult.firebasestorage.app",
  messagingSenderId: "759290092567",
  appId: "1:759290092567:web:4e873f1ad166cb54d11052",
  measurementId: "G-BPTN65KHK7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
