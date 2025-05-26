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



export async function valoresPercentuaisDashboard(quem, setor, data) {
  const container = document.getElementById('dashboard-valores');
  if (!container) return;

  container.innerHTML = 'Carregando…';

  const quemSan = sanitize(quem);
  const setorSan = sanitize(setor);
  const dataSan = sanitize(data);

  const docRef = doc(db, 'historico', quemSan, setorSan, dataSan);
  const itensRef = collection(docRef, 'itens');

  try {
    const snapshot = await getDocs(itensRef);

    let totalValor = 0;
    const mapaValor = {};

    snapshot.forEach((d) => {
      const dados = d.data();
      const qtd = parseFloat(dados.quantidade);
      if (isNaN(qtd)) return;

      const precoStr = typeof dados.preco === 'string'
        ? dados.preco.replace('R$', '').trim().replace(',', '.')
        : dados.preco;
      const precoUnit = parseFloat(precoStr);
      if (isNaN(precoUnit)) return;

      let nomeItem = dados.produto ? dados.produto.toLowerCase() : '';

      let multiplicador = 1;
      if (nomeItem.includes('cup')) multiplicador = 30;
      else if (nomeItem.match(/nissin|ufo|snickers|500g|bifum|raffaello|ferrero|nutella|hanuta|kinder|tronky|bala fini/gi))
        multiplicador = 50;

      const valorItem = qtd * precoUnit * multiplicador;
      totalValor += valorItem;
      mapaValor[nomeItem] = (mapaValor[nomeItem] || 0) + valorItem;
    });

    if (totalValor === 0) {
      container.innerHTML = 'Sem registros para hoje.';
      return;
    }

    const listaOrdenada = Object.entries(mapaValor)
      .sort((a, b) => b[1] - a[1]);

    container.innerHTML = '';
    const titulo = document.createElement('h3');
    titulo.textContent = 'Participação no valor total abastecido hoje';
    container.appendChild(titulo);

    listaOrdenada.forEach(([nome, valor]) => {
      const pct = (valor / totalValor) * 100;

      const linha = document.createElement('div');
      linha.classList.add('valor-bar');

      const bg = document.createElement('div');
      bg.classList.add('valor-bar-bg');
      bg.style.width = pct.toFixed(1) + '%';
      linha.appendChild(bg);

      // Criar container interno vertical com 3 linhas: nome, preço, porcentagem
      const textoContainer = document.createElement('div');
      textoContainer.classList.add('valor-bar-label'); // classe base

      const nomeDiv = document.createElement('div');
      nomeDiv.classList.add('valor-bar-label', 'nome');
      nomeDiv.textContent = nome;

      const precoDiv = document.createElement('div');
      precoDiv.classList.add('valor-bar-label', 'preco');
      precoDiv.textContent = valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });

      const pctDiv = document.createElement('div');
      pctDiv.classList.add('valor-bar-label', 'pct');
      pctDiv.textContent = `${pct.toFixed(1)}%`;

      // Agrupar verticalmente
      textoContainer.appendChild(nomeDiv);
      textoContainer.appendChild(precoDiv);
      textoContainer.appendChild(pctDiv);

      linha.appendChild(textoContainer);
      container.appendChild(linha);
    });

  } catch (err) {
    console.error('❌ Erro no dashboard de valores:', err);
    container.innerHTML = 'Erro ao carregar valores.';
  }
}





export async function caixasPercentuaisDashboard(quem, setor, data) {
  const container = document.getElementById('dashboard-totalcaixas');
  if (!container) return;

  container.innerHTML = 'Carregando…';

  const quemSan = sanitize(quem);
  const setorSan = sanitize(setor);
  const dataSan = sanitize(data);

  const docRef = doc(db, 'historico', quemSan, setorSan, dataSan);
  const itensRef = collection(docRef, 'itens');

  try {
    const snap = await getDocs(itensRef);

    let totalCaixas = 0;
    const mapa = {};

    snap.forEach((d) => {
      const reg = d.data();
      const qtd = parseFloat(reg.quantidade);
      if (isNaN(qtd)) return;

      totalCaixas += qtd;

      const nome = reg.produto ? reg.produto.toLowerCase() : '';
      mapa[nome] = (mapa[nome] || 0) + qtd;
    });

    if (totalCaixas === 0) {
      container.innerHTML = 'Sem registros para hoje.';
      return;
    }

    const lista = Object.entries(mapa).sort((a, b) => b[1] - a[1]);

    container.innerHTML = '';
    const titulo = document.createElement('h3');
    titulo.textContent = 'Participação de caixas abastecidas hoje';
    container.appendChild(titulo);

    lista.forEach(([nome, qtd]) => {
      const pct = (qtd / totalCaixas) * 100;

      const linha = document.createElement('div');
      linha.classList.add('caixa-bar');

      const bg = document.createElement('div');
      bg.classList.add('caixa-bar-bg');
      bg.style.width = pct.toFixed(1) + '%';
      linha.appendChild(bg);

      const texto = document.createElement('div');
      texto.classList.add('caixa-bar-label');

      const nomeDiv = document.createElement('div');
      nomeDiv.classList.add('caixa-bar-label', 'nome');
      nomeDiv.textContent = nome;

      const qtdDiv = document.createElement('div');
      qtdDiv.classList.add('caixa-bar-label', 'qtd');
      qtdDiv.textContent = `${qtd} caixa${qtd === 1 ? '' : 's'}`;

      const pctDiv = document.createElement('div');
      pctDiv.classList.add('caixa-bar-label', 'pct');
      pctDiv.textContent = `${pct.toFixed(1)}%`;

      texto.appendChild(nomeDiv);
      texto.appendChild(qtdDiv);
      texto.appendChild(pctDiv);

      linha.appendChild(texto);
      container.appendChild(linha);
    });

  } catch (err) {
    console.error('❌ Erro no dashboard de caixas:', err);
    container.innerHTML = 'Erro ao carregar caixas.';
  }
}

