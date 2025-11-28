import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/setup#config-object
const firebaseConfig = {
    apiKey: "AIzaSyB9HbBmfDnswXJPXJCqIF8VqMADnBbWy1U",
    authDomain: "joys-e2cb2.firebaseapp.com",
    projectId: "joys-e2cb2",
    storageBucket: "joys-e2cb2.firebasestorage.app",
    messagingSenderId: "485778341590",
    appId: "1:485778341590:web:558b2941e87129b5769377",
    measurementId: "G-DCC7C8Q0JY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
