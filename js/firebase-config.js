import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBg0u_Se2Od--7wbZFwqWKRdUv_IrYiXw0",
    authDomain: "intranet-igea.firebaseapp.com",
    projectId: "intranet-igea",
    storageBucket: "intranet-igea.appspot.com",
    messagingSenderId: "53285656859",
    appId: "1:53285656859:web:b98b85861bd5d0472e1bbe"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);