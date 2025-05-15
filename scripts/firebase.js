import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import {
  collection,doc, addDoc, setDoc, getDocs
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

import {valordashboard} from './dashboard.js'

const firebaseConfig = {
  apiKey: "AIzaSyDghvHq___IIj1sXHAfvn54GqKTuPnHUmU",
  authDomain: "ikeda-e5dae.firebaseapp.com",
  projectId: "ikeda-e5dae",
  storageBucket: "ikeda-e5dae.firebasestorage.app",
  messagingSenderId: "681767727108",
  appId: "1:681767727108:web:d222673b031509ed464551",
  measurementId: "G-5ZETJJ4TWF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

export async function historico(quem, produto, quantidade, un, categoria, setor, vencimento, preco) {
  const app = initializeApp(firebaseConfig);




  function sanitize(value) {
    return value.replace(/\//g, "_");
  }

  const horaSP = new Date().toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour12: false
  });

  const item = {
    produto,
    quantidade,
    unidade: un,
    categoria,
    data: new Date().toLocaleDateString(),
    hora: horaSP,
    vencimento,
    preco
  };

  const hoje = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  const quemSan = sanitize(quem);
  const setorSan = sanitize(setor);
  const hojeSan = sanitize(hoje);

  const docRef = doc(db, 'historico', quemSan, setorSan, hojeSan);
  const itensRef = collection(docRef, 'itens');

  try {
    const snapshot = await getDocs(itensRef);
    const novoId = (snapshot.size + 1).toString();
    const novoDocRef = doc(itensRef, novoId);

    await setDoc(novoDocRef, item);
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`✅ Abastecimento registrado com ID ${novoId} para ${quem}`, item);

    // Atualiza o dashboard após registrar
    await valordashboard(quem, setor, hojeSan);

  } catch (err) {
    console.error("❌ Erro ao registrar no Firestore:", err);
  }
}
