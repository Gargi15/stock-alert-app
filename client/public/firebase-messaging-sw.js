/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");



firebase.initializeApp({
    apiKey: "AIzaSyDoc6FqQl1dmgpgpfTNFkQa9X0WdbTaakA",
    authDomain: "ind-stock-alert-app.firebaseapp.com",
    projectId: "ind-stock-alert-app",
    storageBucket: "ind-stock-alert-app.firebasestorage.app",
    messagingSenderId: "773997317678",
    appId: "1:773997317678:web:57222ce0f32d70bbb819bf"
  });



const messaging = firebase.messaging();