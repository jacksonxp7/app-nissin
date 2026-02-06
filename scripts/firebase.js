
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDghvHq___IIj1sXHAfvn54GqKTuPnHUmU",
  authDomain: "ikeda-e5dae.firebaseapp.com",
  projectId: "ikeda-e5dae",
  storageBucket: "ikeda-e5dae.firebasestorage.app",
  messagingSenderId: "681767727108",
  appId: "1:681767727108:web:d222673b031509ed464551"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/* ==========================
   HISTÓRICO CENTRALIZADO
========================== */
export async function historico(
  usuario,
  produto,
  quantidade,
  unidade,
  categoria,
  setor,
  data,
  preco
) {
  if (!usuario) return;

  try {
    await addDoc(
      collection(db, 'historico', usuario, setor, data, 'itens'),
      {
        produto,
        quantidade,
        unidade,
        categoria,
        preco,
        timestamp: new Date()
      }
    );
  } catch (err) {
    console.error('❌ Erro ao salvar histórico:', err);
  }
}