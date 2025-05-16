import { historico } from "./firebase.js";
import { valordashboard } from './dashboard.js'
import { getFirestore, collection, doc, addDoc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { db } from './firebase.js';
import { toque } from './login.js'

export function abastecer_screen() {

  const tabela = document.getElementById('tabela');
  const buttonadd = document.getElementById('buttonadd');
  const listaitens = document.getElementById('lista-itens');
  const quantidade_abastecer = document.getElementById('quantidade_abastecer');
  const unabastecer = document.getElementById('unabastecer');
  const abastecer_item = document.getElementById('abastecer_item');
  const tbody = document.getElementById('tbody');
  const datalist = document.getElementById('lista-itens');

  // Carrega produtos no datalist
  fetch('teste.json')
    .then(response => response.json())
    .then(produtos => {
      const product = Object.values(produtos)
      product.forEach(lista => {
        lista.forEach(item => {
          const option = document.createElement('option');
          if (item.nome.includes('Macarrão Instantâneo')) {
            item.nome = item.nome.replace('Macarrão Instantâneo', '').trim();

          }
          option.value = item.nome;
          datalist.appendChild(option);
        });
      });
    })
    .catch(error => {
      console.error('Erro ao carregar produtos:', error);
    });

  console.log('Abastecer screen activated');

  const cadastroStored = JSON.parse(localStorage.getItem('cadastros')) || {};




  function sanitize(value) {
    return value.replace(/\//g, "_");
  }
  const hoje = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

  valordashboard(cadastroStored.nome, 'abastecimento', sanitize(hoje))
  async function adicionarlinha() {
    const item_semlower = abastecer_item.value.trim();
    if (!item_semlower) {
      console.log('⚠️ Escreva um item');
      return;
    }

    // Buscar o preço do item
    let precoitem = '';
    try {
      const response = await fetch('teste.json');
      const produtos = await response.json();
      const productList = Object.values(produtos).flat();

      const produtoEncontrado = productList.find(item => item.nome.toLowerCase().includes(item_semlower.toLowerCase()));

      if (produtoEncontrado) {
        precoitem = produtoEncontrado.preco;
        console.log(precoitem, 'preco1');
      } else {
        console.log('❌ Produto não encontrado');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error);
      return;
    }

    console.log(precoitem, 'preço2');

    // Determinar a categoria com base em palavras-chave
    const categorias = ['lamen', 'ferrero', 'kinder', 'm&m', 'snickers', 'fini', 'santa helena', 'ajinomoto', 'ingleza', 'rafaello', 'bala', 'uau', 'Crokíssimo', 'grelhaditos', 'mendorato'];
    const categoria = categorias.find(cat => item_semlower.toLowerCase().includes(cat)) || 'outros';

    // Adicionar nova categoria na tabela se ainda não existir
    let categoriaRow = Array.from(tbody.querySelectorAll('tr')).find(row => row.dataset.categoria === categoria);
    if (!categoriaRow) {
      categoriaRow = document.createElement('tr');
      const categoriaCell = document.createElement('td');
      categoriaCell.colSpan = 6;
      categoriaCell.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);
      categoriaCell.classList.add('categoria-row', `${categoria}_rowz`);
      categoriaRow.dataset.categoria = categoria;
      categoriaRow.appendChild(categoriaCell);
      tbody.appendChild(categoriaRow);
    }

    // Montar a linha do produto
    const linha = document.createElement('tr');
    const pedido = [item_semlower, quantidade_abastecer.value || 1, unabastecer.value];
    const resultado = ['...', '...', '...'];

    [...pedido, ...resultado].forEach((texto, index) => {
      const celula = document.createElement('td');
      celula.textContent = texto;
      celula.classList.add(index < 3 ? 'pedido' : 'resultado');
      linha.appendChild(celula);
    });

    tbody.insertBefore(linha, categoriaRow.nextSibling);

    const item = {
      nome: pedido[0],
      quantidade: pedido[1],
      unidade: pedido[2],
      categoria: categoria,
      preco: precoitem
    };

    // Buscar nome salvo localmente
    const cadastroStored = JSON.parse(localStorage.getItem('cadastros')) || {};

    // Registrar no histórico (Firebase)
    await historico(cadastroStored['nome'], pedido[0], pedido[1], pedido[2], categoria, 'abastecimento', 'não determinado', precoitem);


    // Salvar localmente
    const itensSalvos = JSON.parse(localStorage.getItem('abastecimento')) || [];
    itensSalvos.push(item);
    localStorage.setItem('abastecimento', JSON.stringify(itensSalvos));


    // Limpar campos
    abastecer_item.value = "";
    quantidade_abastecer.value = "";

    // Permitir remoção por duplo clique
    linha.ondblclick = removerlinha;

    // Efeito sonoro
    toque('mario_coin_s');




  }


  function removerlinha(event) {
    const linhaSelecionada = event.target.closest('tr');
    if (!linhaSelecionada || linhaSelecionada.classList.contains('categoria-row')) return;

    const nome = linhaSelecionada.children[0].textContent;
    const quantidade = linhaSelecionada.children[1].textContent;
    const unidade = linhaSelecionada.children[2].textContent;

    let itensSalvos = JSON.parse(localStorage.getItem('abastecimento')) || [];
    itensSalvos = itensSalvos.filter(item =>
      !(item.nome === nome && item.quantidade == quantidade && item.unidade === unidade)
    );
    localStorage.setItem('abastecimento', JSON.stringify(itensSalvos));

    linhaSelecionada.remove();

    const categoriaRow = linhaSelecionada.previousElementSibling?.classList.contains('categoria-row')
      ? linhaSelecionada.previousElementSibling
      : Array.from(tbody.querySelectorAll('.categoria-row')).find(row => row.nextElementSibling === linhaSelecionada);

    if (categoriaRow) {
      let proxima = categoriaRow.nextElementSibling;
      if (!proxima || proxima.classList.contains('categoria-row')) {
        categoriaRow.remove();
      }
    }

    carregarLinhasSalvas();
    toque('z_s');
  }



  function carregarLinhasSalvas() {
    tbody.innerHTML = '';
    let itensSalvos = JSON.parse(localStorage.getItem('abastecimento')) || [];
    const categoriasAdicionadas = {};

    itensSalvos.forEach(item => {
      if (!categoriasAdicionadas[item.categoria]) {
        const categoriaRow = document.createElement('tr');
        const categoriaCell = document.createElement('td');
        categoriaCell.colSpan = 6;
        categoriaCell.innerHTML = item.categoria.charAt(0).toUpperCase() + item.categoria.slice(1);
        categoriaCell.classList.add('categoria-row', item.categoria + '_rowz');

        categoriaRow.appendChild(categoriaCell);
        categoriaRow.classList.add('categoria-row');
        categoriaRow.dataset.categoria = item.categoria;

        tbody.appendChild(categoriaRow);
        categoriasAdicionadas[item.categoria] = categoriaRow;
      }

      const linha = document.createElement('tr');
      linha.innerHTML = `
        <td class="pedido">${item.nome}</td>
        <td class="pedido">${item.quantidade}</td>
        <td class="pedido">${item.unidade}</td>
        <td class="resultado">...</td>
        <td class="resultado">...</td>
        <td class="resultado">...</td>
      `;
      linha.ondblclick = removerlinha;

      const categoriaRow = categoriasAdicionadas[item.categoria];
      tbody.insertBefore(linha, categoriaRow.nextSibling);
    });
  }



  window.onload = carregarLinhasSalvas;
  tbody.addEventListener('dblclick', removerlinha);
  buttonadd.addEventListener('click', adicionarlinha);

}