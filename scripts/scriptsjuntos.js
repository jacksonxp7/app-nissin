import { el } from './utils.js';

/* ==========================
   LOGIN
========================== */
export function verificar_login() {
  const cadastro = JSON.parse(localStorage.getItem('cadastros'));

  if (cadastro?.nome) return;

  const tela = document.createElement('div');
  tela.id = 'tela-login';

  const titulo = document.createElement('div');
  titulo.textContent = 'Seja bem-vindo';

  const input = document.createElement('input');
  input.placeholder = 'Digite seu nome';

  const btn = document.createElement('button');
  btn.textContent = 'Entrar';

  btn.onclick = () => {
    const nome = input.value.trim();
    if (!nome) return alert('Digite um nome');
    localStorage.setItem('cadastros', JSON.stringify({ nome }));
    location.reload();
  };

  tela.append(titulo, input, btn);
  document.body.appendChild(tela);
}

/* ==========================
   ALERTA DE VALIDADE (PUSH)
========================== */
export function pushvalidade() {
  const container = el('alertas-validade');
  if (!container) return;

  container.innerHTML = '';

  const validades = JSON.parse(localStorage.getItem('validades')) || [];
  const hoje = new Date();

  let existeAlerta = false;

  validades.forEach(item => {
    const [d, m, a] = item.validade.split('/');
    const data = new Date(`${a}-${m}-${d}`);
    const dias = Math.ceil((data - hoje) / 86400000);

    if (dias <= 10) {
      const div = document.createElement('div');
      div.className = dias <= 0 ? 'alerta-validade-venceu' : 'alerta-validade';
      div.textContent =
        dias <= 0
          ? `❌ ${item.nome} vencido`
          : `⚠️ ${item.nome} vence em ${dias} dia(s)`;
      container.appendChild(div);
      existeAlerta = true;
    }
  });

  if (!existeAlerta) {
    container.textContent = '✅ Nenhum item próximo do vencimento';
  }
}

/* ==========================
   SOM
========================== */
export function toque(id) {
  const som = el(id);
  if (!som) return;
  som.currentTime = 0;
  som.play();
}


import { db } from './firebase.js';
import { el } from './utils.js';
import { toque } from './login.js';

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

/* ==============================
   FUNÇÃO PRINCIPAL
============================== */
export async function itens() {
  const container = el('itens');
  if (!container) {
    console.error('❌ Container "itens" não encontrado');
    return;
  }

  container.innerHTML = '';
  console.log('🔄 Iniciando carregamento do estoque...');

  try {
    // 🔥 BUSCA CATEGORIAS
    const categoriasSnap = await getDocs(
      collection(db, 'produtos')
    );

    console.log(`📦 Categorias encontradas: ${categoriasSnap.size}`);
    console.log('📋 IDs das categorias:', categoriasSnap.docs.map(doc => doc.id));

    if (categoriasSnap.empty) {
      console.warn('⚠️ Nenhuma categoria encontrada em /produtos');
      return;
    }

    for (const categoriaDoc of categoriasSnap.docs) {
      const categoria = categoriaDoc.id;
      console.log(`📍 Processando categoria: ${categoria}`);

      criarCategoria(container, categoria);
      await carregarItens(categoria);
    }

    ativarToggleCategorias();
    console.log('✅ Estoque carregado com sucesso!');

  } catch (err) {
    console.error('❌ Erro ao carregar estoque:', err);
    console.error('Stack:', err.stack);
  }
}

/* ==============================
   CRIA CATEGORIA
============================== */
function criarCategoria(container, nome) {
  const titulo = document.createElement('div');
  titulo.className = 'class_categoria';
  titulo.dataset.target = nome;
  titulo.textContent = nome;

  const lista = document.createElement('div');
  lista.className = 'class_produto diminuir';
  lista.id = nome;

  container.append(titulo, lista);
}

/* ==============================
   CARREGA ITENS (CORRETO)
============================== */
async function carregarItens(categoria) {
  const lista = el(categoria);
  if (!lista) {
    console.warn(`⚠️ Lista com ID "${categoria}" não encontrada`);
    return;
  }

  console.log(`🔍 Buscando itens em: /produtos/${categoria}/itens`);

  const snap = await getDocs(
    collection(db, 'produtos', categoria, 'itens')
  );

  console.log(`📊 Itens encontrados em "${categoria}": ${snap.size}`);
  console.log(`📝 IDs dos itens:`, snap.docs.map(doc => doc.id));

  if (snap.empty) {
    console.warn(`⚠️ Nenhum item encontrado em /produtos/${categoria}/itens`);
    return;
  }

  snap.forEach((doc, index) => {
    const itemData = doc.data();
    console.log(`Item ${index + 1} (${doc.id}):`, itemData);
    lista.appendChild(criarItem(itemData));
  });

  console.log(`✅ ${snap.size} itens adicionados para "${categoria}"`);
}

/* ==============================
   CRIA ITEM
============================== */
function criarItem(item) {
  const div = document.createElement('div');
  div.className = 'produto';

  console.log('🏷️ Criando item com dados:', item);

  if (!item.nome || !item.imagem || !item.preco) {
    console.warn('⚠️ Item incompleto - faltam campos:', {
      nome: item.nome,
      imagem: item.imagem,
      preco: item.preco
    });
  }

  div.innerHTML = `
    <p class="texto_descritivo">${item.nome || 'Sem nome'}</p>
    <img src="${item.imagem || ''}" alt="${item.nome || 'Produto'}" onerror="console.log('❌ Erro ao carregar imagem: ${item.imagem}')">
    <p>${formatarPreco(item.preco) || 'Sem preço'}</p>
  `;

  return div;
}

/* ==============================
   TOGGLE
============================== */
function ativarToggleCategorias() {
  document.querySelectorAll('.class_categoria').forEach(botao => {
    botao.onclick = () => alternarCategoria(botao);
  });
}

function alternarCategoria(botao) {
  const alvo = el(botao.dataset.target);
  if (!alvo) return;

  const aberto = alvo.classList.contains('crescer');

  alvo.classList.toggle('crescer', !aberto);
  alvo.classList.toggle('diminuir', aberto);
  botao.classList.toggle('pulsar', !aberto);

  toque(aberto ? 'cursor_s' : 'decide_s');
}

/* ==============================
   PREÇO
============================== */
function formatarPreco(valor) {
  if (typeof valor === 'number') {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }
  return valor;
}
export async function listarTodosItens() {
  console.log('🔍 Buscando todos os itens no Firestore...');

  try {
    const categoriasSnap = await getDocs(collection(db, 'produtos'));

    categoriasSnap.forEach(doc => {
      console.log(`📦 ${doc.id}:`, doc.data());
    });

    console.log('✅ Listagem concluída!');
  } catch (err) {
    console.error('❌ Erro ao listar itens:', err);
  }
}


import { header } from './header.js';
import { layout } from './layout.js';
import { abastecer_screen } from './abastecimento.js';
import { verificar_login, pushvalidade } from './login.js';
import { validadesfunc } from './validade.js';
import { listarTodosItens } from './estoque.js';

header();
layout();
verificar_login();
listarTodosItens();
abastecer_screen();   // ✅ abastecimento funciona
validadesfunc();
pushvalidade();

const nome = localStorage.getItem('cadastros');
document.getElementById('nomelogado').innerText =
  nome ? `login: ${JSON.parse(nome).nome}` : 'Faça login';
import { el, parseDataBR, hojeISO, sanitize } from './utils.js';
import { historico } from './firebase.js';

/* ==============================
   FUNÇÃO PRINCIPAL
============================== */
export function validadesfunc() {
  const btnAdd = el('buttonadd_vldd');
  const btnPrint = el('print_vldd');

  if (btnAdd) btnAdd.addEventListener('click', adicionarValidade);
  if (btnPrint) btnPrint.addEventListener('click', gerarPDF);

  carregarValidades();
}

/* ==============================
   ADICIONAR VALIDADE
============================== */
function adicionarValidade() {
  const nome = el('nome_vldd')?.value.trim();
  const validade = el('validade_vldd')?.value;
  const setor = el('setor_vldd')?.value || 'geral';

  if (!nome || !validade) {
    alert('Preencha todos os campos');
    return;
  }

  const registro = {
    nome,
    validade,
    setor,
    criadoEm: hojeISO()
  };

  const salvos = JSON.parse(localStorage.getItem('validades')) || [];
  salvos.push(registro);
  localStorage.setItem('validades', JSON.stringify(salvos));

  registrarHistorico(nome, validade, setor);
  limparCampos();
  carregarValidades();
}

/* ==============================
   HISTÓRICO FIREBASE
============================== */
async function registrarHistorico(nome, validade, setor) {
  const usuario = JSON.parse(localStorage.getItem('cadastros'))?.nome || 'desconhecido';

  await historico(
    usuario,
    nome,
    0,
    'un',
    'validade',
    setor,
    validade,
    0
  );
}

/* ==============================
   LISTAGEM
============================== */
function carregarValidades() {
  const lista = el('lista_validades');
  if (!lista) return;

  const dados = JSON.parse(localStorage.getItem('validades')) || [];
  lista.innerHTML = '';

  dados.forEach((item, index) => {
    const dataVal = parseDataBR(item.validade);
    const hoje = new Date();
    const dias = Math.ceil((dataVal - hoje) / 86400000);

    const linha = document.createElement('div');
    linha.className = 'linha_validade';

    let status = 'ok';
    if (dias <= 0) status = 'vencido';
    else if (dias <= 10) status = 'alerta';

    linha.classList.add(status);

    linha.innerHTML = `
      <span>${item.nome}</span>
      <span>${item.validade}</span>
      <span>${dias <= 0 ? 'Vencido' : dias + ' dias'}</span>
      <button data-i="${index}">X</button>
    `;

    linha.querySelector('button').onclick = () => removerValidade(index);
    lista.appendChild(linha);
  });
}

/* ==============================
   REMOVER
============================== */
function removerValidade(index) {
  const dados = JSON.parse(localStorage.getItem('validades')) || [];
  dados.splice(index, 1);
  localStorage.setItem('validades', JSON.stringify(dados));
  carregarValidades();
}

/* ==============================
   PDF / APP INVENTOR
============================== */
function gerarPDF() {
  const dados = JSON.parse(localStorage.getItem('validades')) || [];
  if (!dados.length) return alert('Nenhuma validade para imprimir');

  const linhas = dados.map(v => {
    const dias = Math.ceil((parseDataBR(v.validade) - new Date()) / 86400000);
    return `${v.nome} | ${v.validade} | ${dias <= 0 ? 'Vencido' : dias + ' dias'}`;
  });

  const texto = linhas.join('\n');

  if (window.AppInventor) {
    window.AppInventor.setWebViewString(`validades:${texto}`);
  } else {
    console.log(texto);
  }
}

/* ==============================
   UTIL
============================== */
function limparCampos() {
  el('nome_vldd').value = '';
  el('validade_vldd').value = '';
}


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
