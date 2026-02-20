

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
    orderBy 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

/* ============================================================
   1. ACESSO AOS PLUGINS NATIVOS (CAPACITOR)
============================================================ */
const Plugins = window.Capacitor?.Plugins;
const Filesystem = Plugins?.Filesystem;
const FileOpener = Plugins?.FileOpener;
const LocalNotifications = Plugins?.LocalNotifications;
const Capacitor = window.Capacitor;

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
   3. BUSCAR PRODUTOS (FILTRADO POR MARCAS ATIVAS)
============================================================ */
async function carregarSugestoesParaValidade() {
    const datalist = el('lista-itens');
    if (!datalist) return;

    try {
        const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
        if (!userSessao) return;

        const cfgMarcas = await getMarcasConfig();
        const categoriasSnap = await getDocs(collection(db, 'produtos'));
        
        const marcasAtivas = categoriasSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(marca => cfgMarcas[marca.id]?.visivel !== false)
            .sort((a, b) => {
                const ordemA = cfgMarcas[a.id]?.ordem ?? 999;
                const ordemB = cfgMarcas[b.id]?.ordem ?? 999;
                return ordemA - ordemB;
            });

        let nomesEncontrados = [];

        for (const marca of marcasAtivas) {
            const itensSnap = await getDocs(collection(db, 'produtos', marca.id, 'itens'));
            itensSnap.forEach(docItem => {
                const data = docItem.data();
                if (data.nome) nomesEncontrados.push(data.nome);
            });
        }

        const unicos = [...new Set(nomesEncontrados)];
        datalist.innerHTML = unicos.map(nome => `<option value="${nome}">`).join('');
        
    } catch (err) {
        console.error("Erro ao carregar sugestões:", err);
    }
}

/* ============================================================
   4. ADICIONAR VALIDADE E BAIXAR IMAGEM
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

    if (!nome || !validade) {
        alert('Preencha o nome do produto e a data de vencimento!');
        return;
    }

    btn.innerText = "BAIXANDO FOTO...";
    btn.disabled = true;

    // 1. Buscar URL da imagem no Firebase
    let urlImagemFirebase = "";
    try {
        const categoriasSnap = await getDocs(collection(db, 'produtos'));
        for (const catDoc of categoriasSnap.docs) {
            const itensSnap = await getDocs(collection(db, 'produtos', catDoc.id, 'itens'));
            const itemMatch = itensSnap.docs.find(d => d.data().nome.toLowerCase() === nome.toLowerCase());
            if (itemMatch) {
                urlImagemFirebase = itemMatch.data().imagem || "";
                break;
            }
        }
    } catch (e) { console.warn("Erro ao buscar no Firebase."); }

    // 2. Baixar para o celular
    let caminhoLocalFinal = "";
    if (Capacitor?.isNativePlatform()) {
        if (urlImagemFirebase && urlImagemFirebase.startsWith('http')) {
            caminhoLocalFinal = await baixarImagemDaURL(urlImagemFirebase, nome);
        } else {
            caminhoLocalFinal = "www/img/logo.png";
        }
    }

    const idUnico = String(Date.now());
    const registro = {
        id: idUnico,
        nome: nome,
        quantidade: quantidade,
        validade: validade,
        imagemLocal: caminhoLocalFinal,
        criadoEm: hojeISO(),
        usuario: userSessao.nome
    };

    try {
        await setDoc(doc(db, "usuarios", userSessao.nome, "validades", idUnico), registro);

        // 3. Agendar Notificação
        await agendarAvisosCapacitor(registro);

        toque('mario_coin_s');
        nomeInput.value = ''; 
        qtdInput.value = ''; 
        validadeInput.value = '';
        
        carregarValidades();
        atualizarListaAgendados(); 
        alert("Agendamento e Foto salvos com sucesso!");

    } catch (error) {
        alert("Erro: " + error.message);
    } finally {
        btn.innerText = "AGENDAR";
        btn.disabled = false;
    }
}

/* ============================================================
   5. FUNÇÃO DE DOWNLOAD (CORRIGIDA)
============================================================ */
async function baixarImagemDaURL(url, nomeProduto) {
    try {
        // Solicita permissão de escrita/leitura (necessário em algumas versões do Android)
        if (Capacitor.getPlatform() === 'android') {
            await Filesystem.requestPermissions();
        }

        const nomeArquivo = nomeProduto.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".jpg";
        const pasta = "Ikeda/validades";
        const caminhoCompleto = `${pasta}/${nomeArquivo}`;

        // Baixa a imagem
        const response = await fetch(url);
        const blob = await response.blob();

        // Converte para Base64
        const converterBase64 = (blob) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        const base64Raw = await converterBase64(blob);
        const base64Data = base64Raw.split(',')[1];

        // Grava o arquivo (recursive: true cria as pastas Ikeda e validades automaticamente)
        const salvamento = await Filesystem.writeFile({
            path: caminhoCompleto,
            data: base64Data,
            directory: 'DATA', // DATA é a pasta interna segura que o sistema lê rápido
            recursive: true
        });

        console.log("Arquivo salvo em:", salvamento.uri);
        return salvamento.uri; 

    } catch (err) {
        console.error("Erro no download da imagem:", err);
        return "www/img/logo.png"; // Fallback
    }
}

/* ============================================================
   6. LISTAGEM
============================================================ */
async function carregarValidades() {
    const tbody = el('tbody_vldd');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!tbody || !userSessao) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Carregando...</td></tr>';

    try {
        const q = query(collection(db, "usuarios", userSessao.nome, "validades"), orderBy("validade", "asc"));
        const snap = await getDocs(q);

        tbody.innerHTML = '';
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:gray;">Vazio.</td></tr>';
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
                <td style="padding:12px; border-bottom:1px solid #eee;">${item.nome}</td>
                <td style="text-align:center;">${item.quantidade}</td>
                <td style="text-align:center;">${item.validade.split('-').reverse().join('/')}</td>
                <td style="text-align:center; font-weight:bold; color:${dias < 0 ? 'red' : 'inherit'}">${dias < 0 ? 'VENCIDO' : dias + ' dias'}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

/* ============================================================
   7. REMOVER VALIDADE
============================================================ */
async function removerValidade(id, nome) {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return;

    if (confirm(`Excluir validade de "${nome}"?`)) {
        try {
            await deleteDoc(doc(db, "usuarios", userSessao.nome, "validades", String(id)));
            toque('decide_s');
            carregarValidades();
            atualizarListaAgendados(); 
        } catch (e) { alert("Erro ao deletar."); }
    }
}

/* ============================================================
   8. GERAÇÃO DE PDF
============================================================ */
async function gerarPDF() {
    if (typeof html2pdf === 'undefined') return alert("Biblioteca PDF não carregada.");
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    const btn = el('imprimir_pdf');
    btn.innerText = "GERANDO...";
    btn.disabled = true;

    try {
        const snap = await getDocs(query(collection(db, "usuarios", userSessao.nome, "validades"), orderBy("validade", "asc")));
        if (snap.empty) return alert("Sem dados.");

        const containerPdf = document.createElement('div');
        containerPdf.style.padding = "20px";
        let linhasHtml = "";
        snap.forEach(d => {
            const item = d.data();
            linhasHtml += `<tr><td style="border:1px solid #ccc; padding:8px;">${item.nome}</td><td style="border:1px solid #ccc; padding:8px; text-align:center;">${item.quantidade}</td><td style="border:1px solid #ccc; padding:8px; text-align:center;">${item.validade.split('-').reverse().join('/')}</td></tr>`;
        });

        containerPdf.innerHTML = `<h2>Relatório de Validades - ${userSessao.nome}</h2><table style="width:100%; border-collapse:collapse;"><thead><tr style="background:#eee;"><th>Produto</th><th>Qtd</th><th>Vencimento</th></tr></thead><tbody>${linhasHtml}</tbody></table>`;

        const opt = { margin: 10, filename: `Validades.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };

        if (Capacitor?.isNativePlatform()) {
            const pdfBase64 = await html2pdf().set(opt).from(containerPdf).outputPdf('datauristring');
            const result = await Filesystem.writeFile({ path: `Validades_${Date.now()}.pdf`, data: pdfBase64.split(',')[1], directory: 'CACHE' });
            await FileOpener.open({ filePath: result.uri, contentType: 'application/pdf' });
        } else {
            await html2pdf().set(opt).from(containerPdf).save();
        }
    } catch (err) { alert("Erro no PDF."); } finally { btn.innerText = "IMPRIMIR PDF"; btn.disabled = false; }
}

/* ============================================================
   9. NOTIFICAÇÕES (USANDO A FOTO LOCAL)
============================================================ */
async function agendarAvisosCapacitor(item) {
    if (!LocalNotifications) return;

    const config = await getConfigs();
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') return;

    const dataVal = new Date(item.validade + 'T00:00:00');
    const hoje = new Date();
    const diffDias = Math.ceil((dataVal - hoje) / 86400000);
    const limiteAviso = config.diasAviso || 7;

    // Garante que o caminho da imagem seja compatível com a notificação
    let caminhoNotificacao = item.imagemLocal || "www/img/logo.png";

    let notifications = [];

    config.horarios.forEach((horaStr) => {
        const [h, m] = horaStr.split(':');
        for (let i = 0; i <= limiteAviso; i++) {
            const diasRestantes = diffDias - i;
            if (diasRestantes < 0) continue;
            const dataAlvo = new Date();
            dataAlvo.setDate(dataAlvo.getDate() + i);
            dataAlvo.setHours(parseInt(h), parseInt(m), 0, 0);

            if (dataAlvo > new Date()) {
                notifications.push({
                    title: "⚠️ Alerta de Validade",
                    body: `${item.nome}: Vence em ${diasRestantes} dias (${item.validade.split('-').reverse().join('/')})`,
                    id: Math.floor(Math.random() * 1000000),
                    schedule: { at: dataAlvo },
                    attachments: [{ id: 'foto', url: caminhoNotificacao }],
                    android: { 
                        importance: 'high', 
                        smallIcon: 'ic_stat_name', 
                        largeIcon: caminhoNotificacao,
                        style: 'picture',
                        picture: caminhoNotificacao,
                        color: '#f39c12'
                    }
                });
            }
        }
    });

    if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
    }
}

/* ============================================================
   10. DIV DE GERENCIAMENTO DE ALARMES
============================================================ */
async function atualizarListaAgendados() {
    const container = el('lista_notificacoes_agendadas');
    if (!container || !LocalNotifications) return;

    try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length === 0) {
            container.innerHTML = "<p style='text-align:center; color:gray;'>Nenhum alarme agendado no Android.</p>";
            return;
        }

        let html = `<div style="padding:10px; background:#fff; border-radius:8px; border:1px solid #ddd;">
                    <h4 style="margin:0 0 10px 0;">Alarmes Ativos (${pending.notifications.length})</h4>`;
        
        pending.notifications.forEach(n => {
            const dataAg = n.schedule?.at ? new Date(n.schedule.at).toLocaleString() : '---';
            html += `<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding:8px 0;">
                        <div style="font-size:11px;"><strong>${n.title}</strong><br>${n.body}<br><small>${dataAg}</small></div>
                        <button style="background:red; color:white; border:none; padding:5px; border-radius:4px;" onclick="window.removerAlarmeSistema(${n.id})">X</button>
                    </div>`;
        });

        html += `<button style="width:100%; margin-top:10px; padding:10px; background:#333; color:white; border:none; border-radius:5px;" onclick="window.limparTudoSistema()">LIMPAR TUDO</button></div>`;
        container.innerHTML = html;
    } catch (err) { console.error(err); }
}

window.removerAlarmeSistema = async (id) => {
    if (confirm("Remover este alarme?")) {
        await LocalNotifications.cancel({ notifications: [{ id }] });
        atualizarListaAgendados();
    }
};

window.limparTudoSistema = async () => {
    if (confirm("Limpar todos os alarmes do sistema?")) {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) await LocalNotifications.cancel(pending);
        atualizarListaAgendados();
    }
};