// admin/js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD7mg5Q99iVUeke0SyChPzMu5ah7oqO5Mg",
  authDomain: "barberiaip.firebaseapp.com",
  projectId: "barberiaip",
  storageBucket: "barberiaip.firebasestorage.app",
  messagingSenderId: "582487679549",
  appId: "1:582487679549:web:e5a41868e61d6ede1e4054",
  measurementId: "G-M2Q86P2C7V"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // Exportamos la DB para que Storage la use