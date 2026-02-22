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
   1. ACESSO AOS PLUGINS E DETECÇÃO DE PLATAFORMA
============================================================ */
const Plugins = window.Capacitor?.Plugins;
const Filesystem = Plugins?.Filesystem;
const LocalNotifications = Plugins?.LocalNotifications;
const Capacitor = window.Capacitor;

// Interface do Motor Nativo (Android Studio)
const AndroidNative = window.AndroidInterface;

/* ============================================================
   2. INICIALIZAÇÃO DA TELA
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
    } catch (err) { console.error("Erro autocomplete:", err); }
}

/* ============================================================
   4. ADICIONAR VALIDADE (DOWNLOAD + ALARME NATIVO)
============================================================ */
async function adicionarValidade() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return alert("Você precisa estar logado!");

    const nomeInput = el('add_item_validade');
    const qtdInput = el('quantidade_itens_validade');
    const validadeInput = el('validade_item_add');
    const btn = el('buttonadd_vldd');

    const nome = nomeInput.value.trim();
    const quantidade = qtdInput.value || 0;
    const validade = validadeInput.value; 

    if (!nome || !validade) return alert('Preencha Nome e Data!');

    btn.innerText = "PROCESSANDO...";
    btn.disabled = true;

    // Buscar imagem no banco de dados para a notificação
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
    } catch (e) { console.warn("Erro imagem:", e); }

    // --- LÓGICA MOTOR NATIVO (ANDORID STUDIO) ---
    if (AndroidNative) {
        // Baixa a imagem para a pasta Pictures/Ikeda/Validade e mostra notificação imediata
        if (urlImagem) {
            AndroidNative.downloadAndNotify(urlImagem, nome);
        }

        // Agenda o alarme para as 09:00 da manhã do dia do vencimento
        const timestampAlerta = new Date(validade + 'T09:00:00').getTime();
        AndroidNative.scheduleNotification(
            "⚠️ Produto Vence Hoje!",
            `${nome} (${quantidade} un) está vencendo.`,
            timestampAlerta,
            nome
        );
    } 
    // --- LÓGICA CAPACITOR (BACKUP) ---
    else if (Capacitor?.isNativePlatform() && LocalNotifications) {
        await agendarAvisosCapacitor(nome, validade);
    }

    // Salvar registro no Firebase
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
        alert("Erro ao salvar: " + error.message);
    } finally {
        btn.innerText = "AGENDAR";
        btn.disabled = false;
    }
}

/* ============================================================
   5. LISTAGEM COM CORREÇÃO DE CLIQUE DUPLO (MOBILE)
============================================================ */
async function carregarValidades() {
    const tbody = el('tbody_vldd');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!tbody || !userSessao) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando...</td></tr>';
    
    try {
        const snap = await getDocs(query(collection(db, "usuarios", userSessao.nome, "validades"), orderBy("validade", "asc")));
        tbody.innerHTML = '';
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum item agendado.</td></tr>';
            return;
        }

        snap.forEach(docSnap => {
            const item = docSnap.data();
            const dataVal = new Date(item.validade + 'T12:00:00');
            const dias = Math.ceil((dataVal - hoje) / 86400000);
            
            const tr = document.createElement('tr');
            if (dias < 0) tr.style.backgroundColor = '#ffcccc'; // Vencido
            else if (dias <= 7) tr.style.backgroundColor = '#fff3cd'; // Alerta

            tr.innerHTML = `
                <td>${item.nome}</td>
                <td style="text-align:center;">${item.quantidade}</td>
                <td style="text-align:center;">${item.validade.split('-').reverse().join('/')}</td>
                <td style="text-align:center; font-weight:bold;">${dias < 0 ? 'VENCIDO' : dias + 'd'}</td>
                <td style="text-align:center;"><button class="btn-excluir" style="background:none; border:none; cursor:pointer;">❌</button></td>
            `;

            // Clique simples no X para excluir (Melhor para celular)
            tr.querySelector('.btn-excluir').onclick = () => removerValidade(item.id, item.nome);
            
            // Clique duplo na linha (Para PC)
            tr.ondblclick = () => removerValidade(item.id, item.nome);

            tbody.appendChild(tr);
        });
    } catch (err) { console.error("Erro carregar:", err); }
}

async function removerValidade(id, nome) {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (confirm(`Deseja excluir ${nome} da lista?`)) {
        try {
            await deleteDoc(doc(db, "usuarios", userSessao.nome, "validades", String(id)));
            carregarValidades();
            atualizarListaAgendados();
        } catch (e) { alert("Erro ao excluir."); }
    }
}

/* ============================================================
   6. GERAR PDF (CORREÇÃO PARA ANDROID NATIVO)
============================================================ */
async function gerarPDF() {
    const btn = el('imprimir_pdf');
    btn.innerText = "GERANDO..."; btn.disabled = true;
    
    try {
        const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
        const snap = await getDocs(query(collection(db, "usuarios", userSessao.nome, "validades"), orderBy("validade", "asc")));
        
        const divTemp = document.createElement('div');
        divTemp.style.padding = "20px";
        let tabela = `<h2 style="text-align:center;">Relatório de Validades - ${userSessao.nome}</h2>
                      <table border="1" style="width:100%; border-collapse:collapse;">
                      <thead><tr><th>Produto</th><th>Qtd</th><th>Data Validade</th></tr></thead><tbody>`;
        
        snap.forEach(d => {
            const i = d.data();
            tabela += `<tr><td>${i.nome}</td><td style="text-align:center;">${i.quantidade}</td><td style="text-align:center;">${i.validade}</td></tr>`;
        });
        tabela += `</tbody></table>`;
        divTemp.innerHTML = tabela;

        const opt = { 
            margin: 10, 
            filename: `Ikeda_Validades_${userSessao.nome}.pdf`, 
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
        };

        if (AndroidNative) {
            // Gera o PDF, converte para base64 limpa e envia para o Java salvar e abrir
            const pdfDataUri = await html2pdf().set(opt).from(divTemp).outputPdf('datauristring');
            const puraBase64 = pdfDataUri.split(',')[1];
            AndroidNative.saveAndOpenPDF(puraBase64, `Validades_${userSessao.nome}.pdf`);
        } else {
            // Download comum (Capacitor ou Web)
            await html2pdf().set(opt).from(divTemp).save();
        }
    } catch (e) {
        alert("Erro ao gerar PDF: " + e.message);
    } finally {
        btn.innerText = "IMPRIMIR PDF"; 
        btn.disabled = false;
    }
}

/* ============================================================
   7. AUXILIARES E ALARMES CAPACITOR
============================================================ */
async function agendarAvisosCapacitor(nome, validade) {
    if (!LocalNotifications) return;
    const dataAlvo = new Date(validade + 'T09:00:00');
    if (dataAlvo > new Date()) {
        await LocalNotifications.schedule({
            notifications: [{
                title: "⚠️ Produto Vencendo",
                body: `${nome} vence hoje!`,
                id: Math.floor(Math.random() * 100000),
                schedule: { at: dataAlvo },
                android: { smallIcon: 'ic_stat_name' }
            }]
        });
    }
}

async function atualizarListaAgendados() {
    const container = el('lista_notificacoes_agendadas');
    if (!container) return;
    
    if (AndroidNative) {
        container.innerHTML = "<p style='font-size:12px; color:green;'>✅ Gerenciado pelo Android Nativo</p>";
        return;
    }

    if (LocalNotifications) {
        const pending = await LocalNotifications.getPending();
        container.innerHTML = `<p style='font-size:12px;'>Agendamentos ativos: ${pending.notifications.length}</p>`;
    }
}

// Expõe funções para o escopo global se necessário
window.removerAlarmeSistema = async (id) => { 
    if (LocalNotifications) {
        await LocalNotifications.cancel({ notifications: [{ id }] }); 
        atualizarListaAgendados(); 
    }
};