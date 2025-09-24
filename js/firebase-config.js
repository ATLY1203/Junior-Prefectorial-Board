// Firebase Configuration
// Modular Firebase config used by the app. This file exports initialized
// `auth` and `db` instances so all modules use the same Firebase app.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyA51FUrXWFy9YcwLCpRvnJrbA-M4NO4Nhk",
    authDomain: "junior-prefectorial-board-shs.firebaseapp.com",
    projectId: "junior-prefectorial-board-shs",
    storageBucket: "junior-prefectorial-board-shs.firebasestorage.app",
    messagingSenderId: "739590294045",
    appId: "1:739590294045:web:cae43d90faf0dd72dc14f4",
    measurementId: "G-VTZRBC1Q6N"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;