// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDqAA7u9uZxQxrvq52QcP8d1Bbe_uVSuYk",
  authDomain: "blooddonationapp-bad7a.firebaseapp.com",
  projectId: "blooddonationapp-bad7a",
  storageBucket: "blooddonationapp-bad7a.appspot.com",
  messagingSenderId: "338279906868",
  appId: "1:338279906868:web:0e96c20e38eca40dda5461"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services you'll use
export const auth = getAuth(app);
export const db = getFirestore(app);
