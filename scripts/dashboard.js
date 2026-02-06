import { db } from './firebase.js';
import { getMultiplicador } from './multiplicadores.js';
import { sanitize, el } from './utils.js';

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

/* ==============================
   FUNÇÃO BASE
============================== */
async function buscarItens(quem, setor, data) {
  const ref = collection(
    db,
    'historico',
    sanitize(quem),
    sanitize(setor),
    sanitize(data),
    'itens'
  );

  const snap = await getDocs(ref);
  return snap.docs.map(d => d.data());
}

/* ==============================
   TOTAL GERAL
============================== */
export async function valordashboard(quem, setor, data) {
  const itens = await buscarItens(quem, setor, data);
  if (!itens.length) return;

  let total = 0;

  itens.forEach(item => {
    const mult = getMultiplicador(item.produto);
    const unidades = item.unidade === 'un'
      ? Number(item.quantidade)
      : Number(item.quantidade) * mult;

    total += unidades * Number(item.preco || 0);
  });

  const elTotal = el('valor_total');
  if (elTotal) {
    elTotal.innerText = total.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }
}

/* ==============================
   PERCENTUAL POR CATEGORIA
============================== */
export async function valoresPercentuaisDashboard(quem, setor, data) {
  const itens = await buscarItens(quem, setor, data);
  if (!itens.length) return;

  const categorias = {};
  let totalGeral = 0;

  itens.forEach(item => {
    const mult = getMultiplicador(item.produto);
    const unidades = item.unidade === 'un'
      ? Number(item.quantidade)
      : Number(item.quantidade) * mult;

    const valor = unidades * Number(item.preco || 0);
    totalGeral += valor;

    categorias[item.categoria] = (categorias[item.categoria] || 0) + valor;
  });

  const container = el('percentual_categoria');
  if (!container) return;

  container.innerHTML = '';

  Object.entries(categorias).forEach(([cat, valor]) => {
    const perc = ((valor / totalGeral) * 100).toFixed(1);

    const div = document.createElement('div');
    div.className = 'linha_dashboard';
    div.innerHTML = `
      <span>${cat}</span>
      <span>${perc}%</span>
    `;

    container.appendChild(div);
  });
}

/* ==============================
   CAIXAS x UNIDADES
============================== */
export async function caixasPercentuaisDashboard(quem, setor, data) {
  const itens = await buscarItens(quem, setor, data);
  if (!itens.length) return;

  let totalCx = 0;
  let totalUn = 0;

  itens.forEach(item => {
    if (item.unidade === 'un') {
      totalUn += Number(item.quantidade);
    } else {
      totalCx += Number(item.quantidade);
    }
  });

  const total = totalCx + totalUn || 1;

  const cxPerc = ((totalCx / total) * 100).toFixed(1);
  const unPerc = ((totalUn / total) * 100).toFixed(1);

  const elCx = el('perc_caixa');
  const elUn = el('perc_unidade');

  if (elCx) elCx.innerText = `${cxPerc}%`;
  if (elUn) elUn.innerText = `${unPerc}%`;
}
