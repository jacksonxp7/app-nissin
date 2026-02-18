import { db, registrarHistorico } from './firebase.js';
import { getMultiplicador } from './multiplicadores.js';
import { el, toque } from './utils.js';
import { collection, getDocs, query, limit, orderBy, addDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let produtosCache = [];

async function carregarProdutos() {
    if (produtosCache.length > 0) return produtosCache;
    const categoriasSnap = await getDocs(collection(db, 'produtos'));
    const promessas = categoriasSnap.docs.map(async (catDoc) => {
        const itensSnap = await getDocs(collection(db, 'produtos', catDoc.id, 'itens'));
        return itensSnap.docs.map(d => ({ ...d.data(), categoria: catDoc.id }));
    });
    const resultados = await Promise.all(promessas);
    produtosCache = resultados.flat();
    const datalist = el('lista-itens');
    if (datalist) datalist.innerHTML = produtosCache.map(p => `<option value="${p.nome}">`).join('');
    return produtosCache;
}

export function abastecer_screen() {
    const btnAdd = el('buttonadd');
    if (btnAdd) btnAdd.onclick = adicionarAbastecimento;
    carregarProdutos().then(() => renderizarTabelaNuvem());
}

async function adicionarAbastecimento() {
    const inputNome = el('abastecer_item');
    const inputQtd = el('quantidade_abastecer');
    const inputUn = el('unabastecer');
    const btn = el('buttonadd');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));

    const produto = produtosCache.find(p => p.nome.toLowerCase() === inputNome.value.trim().toLowerCase());
    if (!produto || !userSessao) return alert("Produto não encontrado ou deslogado!");

    btn.disabled = true;
    btn.innerText = "...";

    const mult = getMultiplicador(produto.nome);
    const unidadesTotais = inputUn.value === 'CX' ? Number(inputQtd.value) * mult : Number(inputQtd.value);

    // 1. Salva no Histórico Geral
    await registrarHistorico(userSessao.nome, produto.nome, inputQtd.value, inputUn.value, produto.categoria, 'Geral', `Abasteceu ${unidadesTotais} un`, produto.preco);

    // 2. Salva na lista de atividades recentes do usuário (Firebase)
    await addDoc(collection(db, "usuarios", userSessao.nome, "abastecimentos_recentes"), {
        nome: produto.nome,
        qtd: inputQtd.value,
        un: inputUn.value,
        data: new Date().toLocaleTimeString('pt-BR'),
        timestamp: new Date()
    });

    toque('mario_coin_s');
    inputNome.value = ""; inputQtd.value = "";
    renderizarTabelaNuvem();
    btn.disabled = false; btn.innerText = "ADICIONAR";
}

async function renderizarTabelaNuvem() {
    const tbody = el('tbody');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!tbody || !userSessao) return;

    // Busca os últimos 20 abastecimentos
    const q = query(collection(db, "usuarios", userSessao.nome, "abastecimentos_recentes"), orderBy("timestamp", "desc"), limit(20));
    const snap = await getDocs(q);
    
    tbody.innerHTML = '';
    snap.forEach(d => {
        const item = d.data();
        const tr = document.createElement('tr');
        tr.ondblclick = async () => {
            if (confirm(`Remover registro de ${item.nome}?`)) {
                await deleteDoc(doc(db, "usuarios", userSessao.nome, "abastecimentos_recentes", d.id));
                renderizarTabelaNuvem();
            }
        };
        tr.innerHTML = `<td>${item.data}</td><td>${item.nome}</td><td style="text-align:right">${item.qtd}${item.un}</td>`;
        tbody.appendChild(tr);
    });
}