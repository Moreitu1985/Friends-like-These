// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Replace these with your actual Firebase config values
const firebaseConfig = {
  apiKey: "AIzaSyAUsT6bqAyDu36DkZnwjgHr8U6ITNpo10c",
  authDomain: "thutofunds.firebaseapp.com",
  projectId: "thutofunds",
  storageBucket: "thutofunds.firebasestorage.app",
  messagingSenderId: "1004224987012",
  appId: "1:1004224987012:web:b6172e977c7f30764c27d1",
  measurementId: "G-TLKE55DV1T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Exports
export const db = getFirestore(app);
export const auth = getAuth(app);
