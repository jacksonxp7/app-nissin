import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, doc, addDoc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { db } from './firebase.js';

export async function valordashboard(quem, setor, data) {
  // const app = initializeApp(firebaseConfig);
  // const firebaseConfig = {
  //   apiKey: "AIzaSyDghvHq___IIj1sXHAfvn54GqKTuPnHUmU",
  //   authDomain: "ikeda-e5dae.firebaseapp.com",
  //   projectId: "ikeda-e5dae",
  //   storageBucket: "ikeda-e5dae.firebasestorage.app",
  //   messagingSenderId: "681767727108",
  //   appId: "1:681767727108:web:d222673b031509ed464551",
  //   measurementId: "G-5ZETJJ4TWF"
  // };

  // const db = getFirestore(app);


  const container_ca_em = document.getElementById('ca_em');
  const container_ca_cm = document.getElementById('ca_cm');
  const container_vevt_em = document.getElementById('vevt_em');
  const container_vevt_cm = document.getElementById('vevt_cm');
  const container_mv_em = document.getElementById('mv_em');
  const container_mv_cm = document.getElementById('mv_cm');

  container_mv_em.innerHTML = ''



  const quemSan = sanitize(quem);
  const setorSan = sanitize(setor);
  const dataSan = sanitize(data);

  const docRef = doc(db, 'historico', quemSan, setorSan, dataSan);
  const itensRef = collection(docRef, 'itens');

  try {
    const snapshot = await getDocs(itensRef);

    let totalCaixas = 0;
    let totalvalor = 0;
    const mapa = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const qtd = parseFloat(data.quantidade);
      let precoStr = typeof data.preco === 'string'
        ? data.preco.replace('R$', '').trim().replace(',', '.')
        : data.preco;
      const precoUnitario = parseFloat(precoStr);

      let nomeItem = data.produto ? data.produto.toLowerCase() : '';





      let multiplicador = 1;


      if (nomeItem.includes('cup')) {
        multiplicador = 30;
        nomeItem = `${nomeItem} com ${multiplicador} un`;

      } else if (nomeItem.includes('nissin')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;

      } else if (nomeItem.includes('ufo')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('snickers')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
        
      } else if (nomeItem.includes('Espaguete 5')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;

      } else if (nomeItem.includes('500g')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;

      } else if (nomeItem.includes('galinha caipira leve mais')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('bifum')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;

      } else if (nomeItem.includes('raffaello 3 unidades')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('raffaello 15 unidades')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('raffaello T9')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('chocolate ferrero')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('bombom ferrero collection')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('bombom ferrero rocher 24')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('bombom ferrero rocher 3')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('bombom ferrero rocher 4')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('bombom ferrero rocher 8')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('nutella pote 140g')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('nutella pote 650g')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('Creme de Avelã Nutella sem Glúten Copo 350g')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('Wafer Nutella B-Ready Pacote 22g')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('hanuta')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('Chocolate Kinder Bueno')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('Chocolate Kinder Ovo')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('Chocolate Kinder Joy com Surpresa Caixa C/2 40g')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('Chocolate Kinder Ovo Joy com Surpresa Peça 20g')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('tronky')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('snickers variedades')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('bala fini 80g')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('bala fini tubes 27g')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('bala fini tubes 15g')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      } else if (nomeItem.includes('bala fini tubes 80g')) {
        multiplicador = 50;
        nomeItem = `${nomeItem} x${multiplicador}`;
      }








      if (!isNaN(qtd)) totalCaixas += qtd;

      if (!isNaN(qtd) && !isNaN(precoUnitario)) {
        totalvalor += qtd * precoUnitario * multiplicador;
      }

      if (nomeItem && !isNaN(qtd)) {
        mapa[nomeItem] = (mapa[nomeItem] || 0) + qtd;
      } else {
        console.log("❌ Nome do item ou quantidade inválida:", data);
      }
    });

    const valor = totalvalor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    container_ca_cm.innerHTML = `${totalCaixas} caixas`;
    container_ca_em.innerHTML = 'quantidades de caixas abastecidas hoje';
    container_vevt_em.innerHTML = `${valor}`;
    container_vevt_cm.innerHTML = 'valor total de abastecimento hoje';

    // Gerando top 5 itens por quantidade
    const topItens = Object.entries(mapa)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    console.log("🏆 Top 5 itens abastecidos hoje:");
    topItens.forEach(([nome, total], index) => {
      const dive = document.createElement('div');
      dive.classList.add('dive');
      dive.innerHTML = `${index + 1}. ${nome} - ${total} caixas`;
      container_mv_em.append(dive);
      console.log(`${index + 1}. ${nome} - ${total} caixas`);
    });

  } catch (err) {
    console.error("❌ Erro ao buscar histórico:", err);
  }

}

export function sanitize(value) {
  return value.replace(/\//g, "_");
}