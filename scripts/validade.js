import { el, hojeISO, toque } from './utils.js';
import { db, historico } from './firebase.js';
import { getConfigs } from './configs.js';
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { Filesystem, FileOpener, LocalNotifications } = window.Capacitor?.Plugins || {};

export async function validadesfunc() {
    el('buttonadd_vldd').onclick = adicionarValidade;
    el('imprimir_pdf').onclick = gerarPDF;
    renderizarValidadesFirebase();
}

async function adicionarValidade() {
    const s = JSON.parse(localStorage.getItem('sessao_ikeda'));
    const nome = el('add_item_validade').value.trim();
    const qtd = el('quantidade_itens_validade').value;
    const data = el('validade_item_add').value;

    if (!s || !nome || !data) return alert("Preencha tudo!");

    const id = Date.now();
    const novo = { id, nome, quantidade: qtd, validade: data, criadoEm: hojeISO() };

    await setDoc(doc(db, "usuarios", s.nome, "validades", String(id)), novo);
    await historico(s.nome, nome, qtd, 'un', 'Validade', 'Geral', `Vencimento: ${data}`, 0);

    el('add_item_validade').value = ''; el('quantidade_itens_validade').value = '';
    renderizarValidadesFirebase();
}

async function renderizarValidadesFirebase() {
    const s = JSON.parse(localStorage.getItem('sessao_ikeda'));
    const tbody = el('tbody_vldd');
    if (!tbody || !s) return;

    tbody.innerHTML = "Carregando...";
    const snap = await getDocs(collection(db, "usuarios", s.nome, "validades"));
    const dados = snap.docs.map(d => d.data()).sort((a,b) => new Date(a.validade) - new Date(b.validade));
    
    tbody.innerHTML = '';
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    dados.forEach(item => {
        const dias = Math.ceil((new Date(item.validade + 'T12:00:00') - hoje) / 86400000);
        const tr = document.createElement('tr');
        if (dias < 0) tr.style.backgroundColor = '#ffcccc';
        else if (dias <= 7) tr.style.backgroundColor = '#fff3cd';

        tr.ondblclick = async () => {
            if (confirm("Excluir?")) {
                await deleteDoc(doc(db, "usuarios", s.nome, "validades", String(item.id)));
                renderizarValidadesFirebase();
            }
        };

        tr.innerHTML = `<td>${item.nome}</td><td>${item.quantidade}</td><td>${item.validade.split('-').reverse().join('/')}</td><td style="color:${dias<0?'red':'black'}"><b>${dias<0?'VENCIDO':dias+'d'}</b></td>`;
        tbody.appendChild(tr);
    });
}
// ... (Função gerarPDF permanece a mesma que salva no CACHE)