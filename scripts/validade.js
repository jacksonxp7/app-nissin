import { el, hojeISO, toque } from './utils.js';
import { getConfigs, getMarcasConfig } from './configs.js';
import { db } from './firebase.js';
import {
    collection,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
    query,
    orderBy,
    where
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

/* ============================================================
   1. CONFIGURAÇÕES E DETECÇÃO DE PLATAFORMA
============================================================ */
const Plugins = window.Capacitor?.Plugins;
const Filesystem = Plugins?.Filesystem;
const LocalNotifications = Plugins?.LocalNotifications;
const Capacitor = window.Capacitor;

// Interface do Android Studio (Motor Nativo)
const AndroidNative = window.AndroidInterface;

/* ============================================================
   2. INICIALIZAÇÃO
============================================================ */
export function validadesfunc() {
    const btnAdd = el('buttonadd_vldd');
    const btnPrint = el('imprimir_pdf');

    if (btnAdd) btnAdd.onclick = adicionarValidade;
    if (btnPrint) btnPrint.onclick = gerarPDF;

    carregarSugestoesParaValidade();
    carregarValidades();
    atualizarListaAgendados();
}

/* ============================================================
   3. AUTOCOMPLETE DE PRODUTOS
============================================================ */
async function carregarSugestoesParaValidade() {
    const datalist = el('lista-itens');
    if (!datalist) return;
    try {
        const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
        if (!userSessao) return;
        const cfgMarcas = await getMarcasConfig();
        const categoriasSnap = await getDocs(collection(db, 'produtos'));
        
        let nomesEncontrados = [];
        for (const marca of categoriasSnap.docs) {
            if (cfgMarcas[marca.id]?.visivel === false) continue;
            const itensSnap = await getDocs(collection(db, 'produtos', marca.id, 'itens'));
            itensSnap.forEach(docItem => { 
                if (docItem.data().nome) nomesEncontrados.push(docItem.data().nome); 
            });
        }
        datalist.innerHTML = [...new Set(nomesEncontrados)].map(nome => `<option value="${nome}">`).join('');
    } catch (err) { console.error("Erro sugestões:", err); }
}

/* ============================================================
   4. ADICIONAR VALIDADE (DOWNLOAD + AGENDAMENTO NATIVO)
============================================================ */
async function adicionarValidade() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return alert("Faça login primeiro!");

    const nomeInput = el('add_item_validade');
    const qtdInput = el('quantidade_itens_validade');
    const validadeInput = el('validade_item_add');
    const btn = el('buttonadd_vldd');

    const nome = nomeInput.value.trim();
    const quantidade = qtdInput.value || 0;
    const validade = validadeInput.value; // Formato YYYY-MM-DD

    if (!nome || !validade) return alert('Nome e Data são obrigatórios!');

    btn.innerText = "AGENDANDO...";
    btn.disabled = true;

    // 1. Buscar URL da imagem no Firebase
    let urlImagem = "";
    try {
        const categoriasSnap = await getDocs(collection(db, 'produtos'));
        for (const catDoc of categoriasSnap.docs) {
            const q = query(collection(db, 'produtos', catDoc.id, 'itens'), where("nome", "==", nome));
            const itemSnap = await getDocs(q);
            if (!itemSnap.empty) {
                urlImagem = itemSnap.docs[0].data().imagem || "";
                break;
            }
        }
    } catch (e) { console.warn("Erro ao buscar imagem:", e); }

    // 2. Lógica Nativa (Android Studio)
    if (AndroidNative) {
        // Baixar imagem e mostrar notificação de confirmação com foto
        if (urlImagem) {
            AndroidNative.downloadAndNotify(urlImagem, nome);
        }

        // Agendar alarme para as 09:00 da manhã do dia do vencimento
        const dataAlvo = new Date(validade + 'T09:00:00').getTime();
        AndroidNative.scheduleNotification(
            "⚠️ Validade Vence Hoje",
            `O produto ${nome} (${quantidade} un) vence hoje!`,
            dataAlvo,
            nome // O motor nativo usará o nome para buscar a foto na pasta Pictures/Ikeda/Validade
        );
    } 
    // 3. Lógica Alternativa (Capacitor)
    else if (Capacitor?.isNativePlatform() && LocalNotifications) {
        await agendarAvisosCapacitor(nome, validade);
    }

    // 4. Salvar no Firestore
    const idUnico = String(Date.now());
    const registro = {
        id: idUnico,
        nome,
        quantidade,
        validade,
        criadoEm: hojeISO(),
        usuario: userSessao.nome
    };

    try {
        await setDoc(doc(db, "usuarios", userSessao.nome, "validades", idUnico), registro);
        toque('mario_coin_s');
        nomeInput.value = ''; qtdInput.value = ''; validadeInput.value = '';
        carregarValidades();
        atualizarListaAgendados();
        if (!AndroidNative) alert("Agendado com sucesso!");
    } catch (error) {
        alert("Erro Firebase: " + error.message);
    } finally {
        btn.innerText = "AGENDAR";
        btn.disabled = false;
    }
}

/* ============================================================
   5. GERAR E ABRIR PDF (NATIVO OU NAVEGADOR)
============================================================ */
async function gerarPDF() {
    const btn = el('imprimir_pdf');
    btn.innerText = "GERANDO..."; btn.disabled = true;
    
    try {
        const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
        const snap = await getDocs(query(collection(db, "usuarios", userSessao.nome, "validades"), orderBy("validade", "asc")));
        
        const container = document.createElement('div');
        container.style.padding = "20px";
        let linhas = "";
        snap.forEach(d => {
            const i = d.data();
            linhas += `<tr><td>${i.nome}</td><td>${i.quantidade}</td><td>${i.validade}</td></tr>`;
        });

        container.innerHTML = `
            <h1>Relatório de Validades - ${userSessao.nome}</h1>
            <table border="1" style="width:100%; border-collapse:collapse;">
                <thead><tr><th>Produto</th><th>Qtd</th><th>Data</th></tr></thead>
                <tbody>${linhas}</tbody>
            </table>
        `;

        const opt = { margin: 10, filename: 'Validades.pdf', jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };

        if (AndroidNative) {
            // Gera PDF em base64 e envia para o motor nativo salvar e abrir
            const pdfBase64 = await html2pdf().set(opt).from(container).outputPdf('datauristring');
            const puraBase64 = pdfBase64.split(',')[1];
            AndroidNative.saveAndOpenPDF(puraBase64, "Relatorio_Ikeda.pdf");
        } else {
            // Download normal pelo navegador ou Capacitor
            await html2pdf().set(opt).from(container).save();
        }
    } catch (e) {
        alert("Erro ao gerar PDF.");
    } finally {
        btn.innerText = "IMPRIMIR PDF";
        btn.disabled = false;
    }
}

/* ============================================================
   6. LISTAGEM E EXCLUSÃO
============================================================ */
async function carregarValidades() {
    const tbody = el('tbody_vldd');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!tbody || !userSessao) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Carregando...</td></tr>';
    
    try {
        const snap = await getDocs(query(collection(db, "usuarios", userSessao.nome, "validades"), orderBy("validade", "asc")));
        tbody.innerHTML = '';
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum agendamento.</td></tr>';
            return;
        }

        snap.forEach(docSnap => {
            const item = docSnap.data();
            const dataVal = new Date(item.validade + 'T12:00:00');
            const dias = Math.ceil((dataVal - hoje) / 86400000);
            
            const tr = document.createElement('tr');
            if (dias < 0) tr.style.backgroundColor = '#ffcccc'; 
            else if (dias <= 7) tr.style.backgroundColor = '#fff3cd';

            tr.ondblclick = () => removerValidade(item.id, item.nome);
            tr.innerHTML = `
                <td>${item.nome}</td>
                <td style="text-align:center;">${item.quantidade}</td>
                <td style="text-align:center;">${item.validade.split('-').reverse().join('/')}</td>
                <td style="text-align:center; font-weight:bold;">${dias < 0 ? 'VENCIDO' : dias + 'd'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error("Erro listagem:", err); }
}

async function removerValidade(id, nome) {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (confirm(`Excluir ${nome}?`)) {
        await deleteDoc(doc(db, "usuarios", userSessao.nome, "validades", String(id)));
        carregarValidades();
        atualizarListaAgendados();
    }
}

/* ============================================================
   7. AGENDAMENTO COMPLEMENTAR (CAPACITOR)
============================================================ */
async function agendarAvisosCapacitor(nome, validade) {
    if (!LocalNotifications) return;
    const dataAlvo = new Date(validade + 'T09:00:00');
    if (dataAlvo > new Date()) {
        await LocalNotifications.schedule({
            notifications: [{
                title: "⚠️ Vencimento Hoje",
                body: `Produto: ${nome}`,
                id: Math.floor(Math.random() * 100000),
                schedule: { at: dataAlvo },
                android: { smallIcon: 'ic_stat_name', style: 'bigpicture' }
            }]
        });
    }
}

async function atualizarListaAgendados() {
    const container = el('lista_notificacoes_agendadas');
    if (!container) return;
    if (AndroidNative) {
        container.innerHTML = "<small>Alarmes gerenciados pelo sistema Android.</small>";
        return;
    }
    if (!LocalNotifications) return;
    const pending = await LocalNotifications.getPending();
    container.innerHTML = `Alarmes ativos: ${pending.notifications.length}`;
}