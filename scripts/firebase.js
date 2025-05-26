import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import {
  collection, doc, setDoc, getDocs
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

import { valordashboard, valoresPercentuaisDashboard,caixasPercentuaisDashboard} from './dashboard.js';

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
  function sanitize(value) {
    return value.replace(/\//g, "_");
  }

  const horaSP = new Date().toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour12: false
  });

  let nomeItem = produto.toLowerCase();
  let multiplicador = 1;

  if (nomeItem.includes('cup')) multiplicador = 30;
  else if (nomeItem.includes('nissin')) multiplicador = 50;
  else if (nomeItem.includes('ufo')) multiplicador = 50;
  else if (nomeItem.includes('snickers')) multiplicador = 50;
  else if (nomeItem.includes('espaguete 5')) multiplicador = 50;
  else if (nomeItem.includes('500g')) multiplicador = 50;
  else if (nomeItem.includes('galinha caipira')) multiplicador = 50;
  else if (nomeItem.includes('bifum')) multiplicador = 50;
  else if (nomeItem.includes('raffaello 3 unidades')) multiplicador = 50;
  else if (nomeItem.includes('raffaello 15 unidades')) multiplicador = 50;
  else if (nomeItem.includes('raffaello t9')) multiplicador = 50;
  else if (nomeItem.includes('chocolate ferrero')) multiplicador = 50;
  else if (nomeItem.includes('bombom ferrero collection')) multiplicador = 50;
  else if (nomeItem.includes('bombom ferrero rocher 24')) multiplicador = 50;
  else if (nomeItem.includes('bombom ferrero rocher 3')) multiplicador = 50;
  else if (nomeItem.includes('bombom ferrero rocher 4')) multiplicador = 50;
  else if (nomeItem.includes('bombom ferrero rocher 8')) multiplicador = 50;
  else if (nomeItem.includes('nutella pote 140g')) multiplicador = 50;
  else if (nomeItem.includes('nutella pote 650g')) multiplicador = 50;
  else if (nomeItem.includes('creme de avelã nutella')) multiplicador = 50;
  else if (nomeItem.includes('wafer nutella b-ready')) multiplicador = 50;
  else if (nomeItem.includes('hanuta')) multiplicador = 50;
  else if (nomeItem.includes('chocolate kinder bueno')) multiplicador = 50;
  else if (nomeItem.includes('chocolate kinder ovo')) multiplicador = 50;
  else if (nomeItem.includes('chocolate kinder joy')) multiplicador = 50;
  else if (nomeItem.includes('tronky')) multiplicador = 50;
  else if (nomeItem.includes('snickers variedades')) multiplicador = 50;
  else if (nomeItem.includes('bala fini 80g')) multiplicador = 50;
  else if (nomeItem.includes('bala fini tubes 27g')) multiplicador = 50;
  else if (nomeItem.includes('bala fini tubes 15g')) multiplicador = 50;
  else if (nomeItem.includes('bala fini tubes 80g')) multiplicador = 50;

  let unidades = 0;
  if (un === 'un') {
    unidades = parseFloat(quantidade);
    multiplicador = 1;
  } else {
    unidades = parseFloat(quantidade) * multiplicador;
  }

  const item = {
    produto,
    quantidade,
    unidade: un,
    categoria,
    data: new Date().toLocaleDateString(),
    hora: horaSP,
    vencimento,
    preco,
    multiplicador,
    unidades
  };

  const hoje = new Date().toISOString().split('T')[0];
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

    await valordashboard(quem, setor, hojeSan);
    await valoresPercentuaisDashboard(quem, setor, hojeSan);
    await caixasPercentuaisDashboard(quem, setor, hojeSan);


  } catch (err) {
    console.error("❌ Erro ao registrar no Firestore:", err);
  }
}
