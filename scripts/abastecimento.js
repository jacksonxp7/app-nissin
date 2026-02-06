import { historico } from './firebase.js';
import { getMultiplicador } from './multiplicadores.js';
import { el } from './utils.js';

import { db } from './firebase.js';
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let produtosCache = [];

/* ==============================
   CARREGAMENTO DE PRODUTOS (FIRESTORE)
============================== */
async function carregarProdutos() {
  if (produtosCache.length) return produtosCache;

  const categoriasSnap = await getDocs(
    collection(db, 'produtos')
  );

  for (const categoriaDoc of categoriasSnap.docs) {
    const categoria = categoriaDoc.id;

    const itensSnap = await getDocs(
      collection(db, 'produtos', categoria, 'itens')
    );

    itensSnap.forEach(doc => {
      produtosCache.push({
        ...doc.data(),
        categoria
      });
    });
  }

  criarDatalist(produtosCache);
  return produtosCache;
}

/* ==============================
   CRIA LISTA SUSPENSA
============================== */
function criarDatalist(produtos) {
  let datalist = el('listaProdutos');

  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = 'listaProdutos';
    document.body.appendChild(datalist);
  }

  datalist.innerHTML = '';

  produtos.forEach(produto => {
    const opt = document.createElement('option');
    opt.value = produto.nome;
    datalist.appendChild(opt);
  });
}

/* ==============================
   INTERFACE PRINCIPAL
============================== */
export function abastecer_screen() {
  const container = el('abastecimento');
  if (!container) return;

  carregarProdutos().then(montarInterface);
  window.addEventListener('load', carregarLinhasSalvas);
}

/* ==============================
   MONTAGEM DA TELA
============================== */
function montarInterface(produtos) {
  const lista = el('lista_abastecimento');
  if (!lista) return;

  lista.innerHTML = '';

  produtos.forEach(produto => {
    const linha = document.createElement('div');
    linha.className = 'linha_abastecimento';

    linha.innerHTML = `
      <input type="text"
             class="produto"
             list="listaProdutos"
             value="${produto.nome}">
      <input type="number" class="quantidade" min="0" placeholder="Qtd">
      <select class="unidade">
        <option value="cx">cx</option>
        <option value="un">un</option>
      </select>
      <button class="btnAdd">+</button>
    `;

    linha.querySelector('.btnAdd').onclick =
      () => salvarLinha(linha, produto);

    lista.appendChild(linha);
  });
}

/* ==============================
   SALVAR ABASTECIMENTO
============================== */
async function salvarLinha(linha, produto) {
  const nome = linha.querySelector('.produto').value.trim();
  const qtd = linha.querySelector('.quantidade').value;
  const un = linha.querySelector('.unidade').value;

  if (!nome || !qtd) {
    alert('Preencha todos os campos');
    return;
  }

  const usuario =
    JSON.parse(localStorage.getItem('cadastros'))?.nome || 'desconhecido';

  const setor = el('setor')?.value || 'geral';

  const multiplicador = getMultiplicador(nome);
  const unidades =
    un === 'un' ? Number(qtd) : Number(qtd) * multiplicador;

  await historico(
    usuario,
    nome,
    qtd,
    un,
    produto.categoria || 'outros',
    setor,
    produto.validade || 'indeterminado',
    produto.preco || 0
  );

  salvarLocal({
    nome,
    qtd,
    un,
    multiplicador,
    unidades
  });

  limparLinha(linha);
}

/* ==============================
   LOCAL STORAGE
============================== */
function salvarLocal(dados) {
  const salvos =
    JSON.parse(localStorage.getItem('abastecimentos')) || [];

  salvos.push(dados);
  localStorage.setItem('abastecimentos', JSON.stringify(salvos));
}

function carregarLinhasSalvas() {
  const dados =
    JSON.parse(localStorage.getItem('abastecimentos')) || [];

  if (!dados.length) return;

  console.log(`🔄 ${dados.length} abastecimentos restaurados`);
}

/* ==============================
   UTILIDADES
============================== */
function limparLinha(linha) {
  linha.querySelector('.quantidade').value = '';
  linha.querySelector('.unidade').value = 'cx';
}
