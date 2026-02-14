import { historico, db } from './firebase.js';
import { getMultiplicador } from './multiplicadores.js';
import { el, toque } from './utils.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let produtosCache = [];

async function carregarProdutos() {
    if (produtosCache.length > 0) return produtosCache;
    try {
        const categoriasSnap = await getDocs(collection(db, 'produtos'));
        const promessas = categoriasSnap.docs.map(async (categoriaDoc) => {
            const categoria = categoriaDoc.id;
            const itensSnap = await getDocs(collection(db, 'produtos', categoria, 'itens'));
            return itensSnap.docs.map(doc => ({ ...doc.data(), categoria: categoria }));
        });
        const resultados = await Promise.all(promessas);
        produtosCache = resultados.flat();
        const datalist = el('lista-itens');
        if (datalist) datalist.innerHTML = produtosCache.map(p => `<option value="${p.nome}">`).join('');
        return produtosCache;
    } catch (e) { return []; }
}

export function abastecer_screen() {
    const btnAdd = el('buttonadd');
    if (btnAdd) btnAdd.onclick = adicionarAbastecimento;
    carregarProdutos().then(() => renderizarTabelaLocal());
}

async function adicionarAbastecimento() {
    const inputNome = el('abastecer_item');
    const inputQtd = el('quantidade_abastecer');
    const inputUn = el('unabastecer');
    const btn = el('buttonadd');

    const nomeDigitado = inputNome.value.trim();
    const qtd = inputQtd.value;
    const un = inputUn.value;

    const produtoValidado = produtosCache.find(p => p.nome.toLowerCase() === nomeDigitado.toLowerCase());

    if (!produtoValidado) {
        alert("❌ PRODUTO NÃO ENCONTRADO NO ESTOQUE!");
        return;
    }

    btn.disabled = true;
    btn.innerText = "...";

    try {
        const userData = JSON.parse(localStorage.getItem('cadastros'));
        const usuario = userData ? userData.nome : 'desconhecido';
        const mult = getMultiplicador(produtoValidado.nome);
        const unidadesTotais = un === 'CX' ? Number(qtd) * mult : Number(qtd);

        const ok = await historico(usuario, produtoValidado.nome, qtd, un, produtoValidado.categoria, 'Geral', `Abasteceu ${unidadesTotais} un`, produtoValidado.preco);

        if (ok) {
            const registro = { id: Date.now(), nome: produtoValidado.nome, qtd, un, data: new Date().toLocaleTimeString('pt-BR') };
            const salvos = JSON.parse(localStorage.getItem('abastecimentos')) || [];
            salvos.push(registro);
            localStorage.setItem('abastecimentos', JSON.stringify(salvos));
            toque('mario_coin_s');
            inputNome.value = ""; inputQtd.value = "";
            renderizarTabelaLocal();
        }
    } catch (e) { console.error(e); }
    setTimeout(() => { btn.disabled = false; btn.innerText = "ADICIONAR"; }, 1000);
}

function renderizarTabelaLocal() {
    const tbody = el('tbody');
    if (!tbody) return;
    const dados = JSON.parse(localStorage.getItem('abastecimentos')) || [];
    tbody.innerHTML = '';
    [...dados].reverse().forEach(item => {
        const tr = document.createElement('tr');
        tr.ondblclick = () => {
            if (confirm(`Remover ${item.nome}?`)) {
                localStorage.setItem('abastecimentos', JSON.stringify(dados.filter(d => d.id !== item.id)));
                renderizarTabelaLocal();
                toque('decide_s');
            }
        };
        tr.innerHTML = `<td>${item.data}</td><td>${item.nome}</td><td style="text-align:right">${item.qtd}${item.un}</td>`;
        tbody.appendChild(tr);
    });
}