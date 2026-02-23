
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
   1. ACESSO AOS PLUGINS NATIVOS
============================================================ */
const Plugins = window.Capacitor?.Plugins;
const Filesystem = Plugins?.Filesystem;
const LocalNotifications = Plugins?.LocalNotifications;
const CapacitorHttp = Plugins?.CapacitorHttp; 
const Capacitor = window.Capacitor;

// Imagem que está na pasta android/app/src/main/res/drawable/ic_stat_name.png
const FOTO_FALLBACK = "res://ic_stat_name";

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
   3. BUSCAR PRODUTOS PARA AUTOCOMPLETE
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
    } catch (err) { console.error(err); }
}

/* ============================================================
   4. ADICIONAR VALIDADE E BAIXAR FOTO (COM FALLBACK NATIVO)
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

    btn.innerText = "LOCALIZANDO...";
    btn.disabled = true;

    // 1. Localizar a imagem no Firebase
    let urlImagemFirebase = "";
    try {
        const categoriasSnap = await getDocs(collection(db, 'produtos'));
        for (const catDoc of categoriasSnap.docs) {
            const itensRef = collection(db, 'produtos', catDoc.id, 'itens');
            const q = query(itensRef, where("nome", "==", nome));
            const itemSnap = await getDocs(q);
            if (!itemSnap.empty) {
                urlImagemFirebase = itemSnap.docs[0].data().imagem || "";
                break;
            }
        }
    } catch (e) { console.warn("Erro no Firebase"); }

    // 2. Tentar download ou usar Fallback (ic_stat_name)
    let caminhoLocalFinal = FOTO_FALLBACK;

    if (Capacitor?.isNativePlatform()) {
        if (urlImagemFirebase && urlImagemFirebase.startsWith('http')) {
            btn.innerText = "BAIXANDO FOTO...";
            const pathBaixado = await baixarImagemNativa(urlImagemFirebase, nome);
            if (pathBaixado) {
                caminhoLocalFinal = pathBaixado;
                console.log("Sucesso no download, usando path: " + caminhoLocalFinal);
            } else {
                console.log("Falha no download, usando ic_stat_name como fallback.");
            }
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
        await agendarAvisosCapacitor(registro);

        toque('mario_coin_s');
        nomeInput.value = ''; qtdInput.value = ''; validadeInput.value = '';
        carregarValidades();
        atualizarListaAgendados(); 
        alert("Validade salva com sucesso!");
    } catch (error) {
        alert("Erro ao salvar: " + error.message);
    } finally {
        btn.innerText = "AGENDAR";
        btn.disabled = false;
    }
}

/* ============================================================
   5. DOWNLOAD NATIVO (By-passing CORS)
============================================================ */
async function baixarImagemNativa(url, nomeProduto) {
    if (!CapacitorHttp) return null;

    try {
        if (Capacitor.getPlatform() === 'android') {
            await Filesystem.requestPermissions();
        }

        const nomeArquivo = nomeProduto.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".jpg";
        const destino = `Ikeda/validades/${nomeArquivo}`;

        const options = {
            url: url,
            path: destino,
            directory: 'DATA',
            recursive: true
        };

        const response = await CapacitorHttp.downloadFile(options);
        return response.path; 

    } catch (err) {
        console.error("Erro no download nativo:", err);
        return null; // Retorna null para disparar o fallback
    }
}

/* ============================================================
   6. LISTAGEM DE VALIDADES
============================================================ */
async function carregarValidades() {
    const tbody = el('tbody_vldd');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!tbody || !userSessao) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Sincronizando...</td></tr>';
    try {
        const q = query(collection(db, "usuarios", userSessao.nome, "validades"), orderBy("validade", "asc"));
        const snap = await getDocs(q);
        tbody.innerHTML = '';
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:gray;">Nenhum item.</td></tr>';
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
            tr.innerHTML = `<td style="padding:12px; border-bottom:1px solid #eee;">${item.nome}</td><td style="text-align:center;">${item.quantidade}</td><td style="text-align:center;">${item.validade.split('-').reverse().join('/')}</td><td style="text-align:center; font-weight:bold; color:${dias < 0 ? 'red' : 'inherit'}">${dias < 0 ? 'VENCIDO' : dias + ' dias'}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error(err); }
}

/* ============================================================
   7. REMOVER VALIDADE
============================================================ */
async function removerValidade(id, nome) {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return;
    if (confirm(`Excluir permanentemente "${nome}"?`)) {
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
   9. AGENDAR NOTIFICAÇÕES (IMAGEM BAIXADA OU RES://)
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
    
    // Caminho da foto pode ser file://... (baixada) ou res://... (fallback drawable)
    const caminhoFoto = item.imagemLocal || FOTO_FALLBACK;

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
                    attachments: [{ id: 'foto', url: caminhoFoto }],
                    android: { 
                        importance: 'high', 
                        smallIcon: 'ic_stat_name', 
                        largeIcon: caminhoFoto, 
                        style: 'picture', 
                        picture: caminhoFoto, 
                        color: '#f39c12' 
                    }
                });
            }
        }
    });
    if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
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
            container.innerHTML = "<p style='text-align:center; color:gray; font-size:12px;'>Nenhum alarme ativo no sistema.</p>";
            return;
        }
        let html = `<div style="padding:10px; background:#fff; border-radius:8px; border:1px solid #ddd; margin-top:10px;"><h4 style="margin:0 0 10px 0;">Alarmes Ativos (${pending.notifications.length})</h4>`;
        pending.notifications.forEach(n => {
            const dataAg = n.schedule?.at ? new Date(n.schedule.at).toLocaleString() : '---';
            html += `<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding:8px 0;"><div style="font-size:11px; flex:1;"><strong>${n.title}</strong><br>${n.body}<br><small>⏰ ${dataAg}</small></div><button style="background:red; color:white; border:none; padding:6px; border-radius:4px; font-weight:bold;" onclick="window.removerAlarmeSistema(${n.id})">APAGAR</button></div>`;
        });
        html += `<button style="width:100%; margin-top:10px; padding:10px; background:#333; color:white; border:none; border-radius:5px; font-weight:bold;" onclick="window.limparTudoSistema()">CANCELAR TODOS OS ALARMES</button></div>`;
        container.innerHTML = html;
    } catch (err) { console.error(err); }
}

window.removerAlarmeSistema = async (id) => {
    await LocalNotifications.cancel({ notifications: [{ id }] });
    atualizarListaAgendados();
};

window.limparTudoSistema = async () => {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) await LocalNotifications.cancel(pending);
    atualizarListaAgendados();
};