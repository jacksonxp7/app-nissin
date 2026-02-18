import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

/**
 * Registra no histórico geral (log de atividades)
 */
export async function registrarHistorico(usuario, produto, quantidade, unidade, categoria, setor, info, preco) {
    if (!usuario) return;
    const dataHoje = new Date().toISOString().split('T')[0];
    try {
        await addDoc(collection(db, 'historico', usuario, setor, dataHoje, 'itens'), {
            produto,
            quantidade: Number(quantidade),
            unidade,
            categoria: categoria || "Outros",
            preco: Number(preco) || 0,
            detalhes: info,
            timestamp: serverTimestamp()
        });
        return true;
    } catch (e) {
        console.error("Erro ao salvar histórico:", e);
        return false;
    }
}