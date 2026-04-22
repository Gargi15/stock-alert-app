// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyDoc6FqQl1dmgpgpfTNFkQa9X0WdbTaakA",
    authDomain: "ind-stock-alert-app.firebaseapp.com",
    projectId: "ind-stock-alert-app",
    storageBucket: "ind-stock-alert-app.firebasestorage.app",
    messagingSenderId: "773997317678",
    appId: "1:773997317678:web:57222ce0f32d70bbb819bf"
  };

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// 👇 Important: guard for browser support
export const messagingPromise = isSupported().then((supported) =>
    supported ? getMessaging(app) : null );