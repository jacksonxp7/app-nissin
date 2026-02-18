import { db } from './firebase.js'; // Removido registrarHistorico pois não será mais usado aqui
import { getMultiplicador } from './multiplicadores.js';
import { el, toque } from './utils.js';
import { getMarcasConfig } from './configs.js'; // Importando para filtrar marcas ativas
import { collection, getDocs, query, limit, orderBy, addDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let produtosCache = [];

async function carregarProdutos() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return [];

    // 1. Busca as configurações de marcas do usuário (ordem e visibilidade)
    const cfgMarcas = await getMarcasConfig();

    // 2. Busca todas as categorias (marcas) no banco principal
    const categoriasSnap = await getDocs(collection(db, 'produtos'));
    
    // 3. Filtra apenas as marcas que estão visíveis e prepara a ordenação
    const marcasAtivas = categoriasSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(marca => cfgMarcas[marca.id]?.visivel !== false);

    // 4. Ordena as marcas conforme definido nas configurações
    marcasAtivas.sort((a, b) => {
        const ordemA = cfgMarcas[a.id]?.ordem ?? 999;
        const ordemB = cfgMarcas[b.id]?.ordem ?? 999;
        return ordemA - ordemB;
    });

    // 5. Busca os itens apenas das marcas ativas/ordenadas
    const promessas = marcasAtivas.map(async (marca) => {
        const itensSnap = await getDocs(collection(db, 'produtos', marca.id, 'itens'));
        return itensSnap.docs.map(d => ({ ...d.data(), categoria: marca.id }));
    });

    const resultados = await Promise.all(promessas);
    produtosCache = resultados.flat();

    // 6. Alimenta o datalist apenas com produtos das marcas ativas e na ordem correta
    const datalist = el('lista-itens');
    if (datalist) {
        datalist.innerHTML = produtosCache.map(p => `<option value="${p.nome}">`).join('');
    }
    
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

    // Salva APENAS na lista de atividades do usuário (Firebase)
    try {
        await addDoc(collection(db, "usuarios", userSessao.nome, "abastecimentos"), {
            nome: produto.nome,
            qtd: inputQtd.value,
            un: inputUn.value,
            data: new Date().toLocaleTimeString('pt-BR'),
            timestamp: new Date(),
            unidadesTotais: unidadesTotais,
            categoria: produto.categoria
        });

        toque('mario_coin_s');
        inputNome.value = ""; 
        inputQtd.value = "";
        renderizarTabelaNuvem();
    } catch (e) {
        console.error("Erro ao salvar:", e);
        alert("Erro ao salvar abastecimento.");
    } finally {
        btn.disabled = false; 
        btn.innerText = "ADICIONAR";
    }
}

async function renderizarTabelaNuvem() {
    const tbody = el('tbody');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!tbody || !userSessao) return;

    // Busca os últimos 20 abastecimentos ordenados pelo timestamp (mais recentes primeiro)
    const q = query(
        collection(db, "usuarios", userSessao.nome, "abastecimentos"), 
        orderBy("timestamp", "desc"), 
        limit(20)
    );
    
    const snap = await getDocs(q);

    tbody.innerHTML = '';
    snap.forEach(d => {
        const item = d.data();
        const tr = document.createElement('tr');
        
        // Clique duplo para deletar
        tr.ondblclick = async () => {
            if (confirm(`Remover registro de ${item.nome}?`)) {
                await deleteDoc(doc(db, "usuarios", userSessao.nome, "abastecimentos", d.id));
                renderizarTabelaNuvem();
            }
        };

        tr.innerHTML = `
            <td>${item.data}</td>
            <td>${item.nome}</td>
            <td style="text-align:right">${item.qtd}${item.un}</td>
        `;
        tbody.appendChild(tr);
    });
}