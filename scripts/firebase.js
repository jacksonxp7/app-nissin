import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

export async function historico(usuario, produto, quantidade, unidade, categoria, setor, infoAdicional, preco) {
    if (!usuario) return false;
    try {
        const dataHoje = new Date().toISOString().split('T')[0];
        await addDoc(collection(db, 'historico', usuario, setor || "Geral", dataHoje, 'itens'), {
            produto, quantidade: Number(quantidade), unidade,
            categoria, preco: Number(preco) || 0, detalhes: infoAdicional, timestamp: new Date()
        });
        return true;
    } catch (err) { return false; }
}