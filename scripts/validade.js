
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

// Imagem fallback (ic_stat_name.png dentro de drawable)
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
            .sort((a, b) => (cfgMarcas[a.id]?.ordem ?? 999) - (cfgMarcas[b.id]?.ordem ?? 999));

        let nomesEncontrados = [];
        for (const marca of marcasAtivas) {
            const itensSnap = await getDocs(collection(db, 'produtos', marca.id, 'itens'));
            itensSnap.forEach(docItem => { if (docItem.data().nome) nomesEncontrados.push(docItem.data().nome); });
        }
        datalist.innerHTML = [...new Set(nomesEncontrados)].map(nome => `<option value="${nome}">`).join('');
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

    if (!nome || !validade) return alert('Preencha os campos!');

    btn.innerText = "LOCALIZANDO...";
    btn.disabled = true;

    let urlImagemFirebase = "";
    try {
        const categoriasSnap = await getDocs(collection(db, 'produtos'));
        for (const catDoc of categoriasSnap.docs) {
            const q = query(collection(db, 'produtos', catDoc.id, 'itens'), where("nome", "==", nome));
            const itemSnap = await getDocs(q);
            if (!itemSnap.empty) {
                urlImagemFirebase = itemSnap.docs[0].data().imagem || "";
                break;
            }
        }
    } catch (e) { console.warn("Erro Firebase:", e); }

    let caminhoLocalFinal = FOTO_FALLBACK;
    if (Capacitor?.isNativePlatform() && urlImagemFirebase.startsWith('http')) {
        btn.innerText = "BAIXANDO FOTO...";
        const pathBaixado = await baixarImagemNativa(urlImagemFirebase, nome);
        if (pathBaixado) caminhoLocalFinal = pathBaixado;
    }

    const idUnico = String(Date.now());
    const registro = {
        id: idUnico,
        nome,
        quantidade,
        validade,
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
        alert("Salvo com sucesso!");
// 
        LocalNotifications.schedule({
            notifications: [
                {
                    title: "Confira a novidade!",
                    body: "Esta é a imagem que você queria ver no corpo da mensagem.",
                    id: 1,
                    // É aqui que a mágica acontece:
                    attachments: [
                        {
                            id: 'imagem_id',
                            url: 'ic_stat_name', // No Android ele busca em drawable, no iOS em Assets
                        }
                    ],
                    extra: {
                        // No Android, isso garante que a imagem apareça grande
                        style: 'bigpicture'
                    }
                }
            ]
        });
        // 


    } catch (error) { alert("Erro: " + error.message); }
    finally { btn.innerText = "AGENDAR"; btn.disabled = false; }
}

/* ============================================================
   5. DOWNLOAD NATIVO (Ignora CORS)
============================================================ */
async function baixarImagemNativa(url, nomeProduto) {
    if (!CapacitorHttp) return null;
    try {
        if (Capacitor.getPlatform() === 'android') await Filesystem.requestPermissions();
        const nomeArquivo = nomeProduto.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".jpg";
        const destino = `Ikeda/validades/${nomeArquivo}`;

        const response = await CapacitorHttp.downloadFile({
            url: url,
            path: destino,
            directory: 'DATA',
            recursive: true
        });
        return response.path;
    } catch (err) { return null; }
}

/* ============================================================
   6. LISTAGEM E OUTRAS FUNÇÕES
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
        if (snap.empty) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Vazio.</td></tr>'; return; }
        snap.forEach(docSnap => {
            const item = docSnap.data();
            const dataVal = new Date(item.validade + 'T12:00:00');
            const dias = Math.ceil((dataVal - hoje) / 86400000);
            const tr = document.createElement('tr');
            if (dias < 0) tr.style.backgroundColor = '#ffcccc'; else if (dias <= 7) tr.style.backgroundColor = '#fff3cd';
            tr.ondblclick = () => removerValidade(item.id, item.nome);
            tr.innerHTML = `<td>${item.nome}</td><td style="text-align:center;">${item.quantidade}</td><td style="text-align:center;">${item.validade.split('-').reverse().join('/')}</td><td style="text-align:center; font-weight:bold;">${dias < 0 ? 'VENCIDO' : dias + 'd'}</td>`;
            tbody.appendChild(tr);
        });
    } catch (err) { console.error(err); }
}

async function removerValidade(id, nome) {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (confirm(`Excluir ${nome}?`)) {
        await deleteDoc(doc(db, "usuarios", userSessao.nome, "validades", String(id)));
        carregarValidades(); atualizarListaAgendados();
    }
}

async function gerarPDF() {
    const btn = el('imprimir_pdf');
    btn.innerText = "GERANDO..."; btn.disabled = true;
    try {
        const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
        const snap = await getDocs(query(collection(db, "usuarios", userSessao.nome, "validades"), orderBy("validade", "asc")));
        const container = document.createElement('div');
        container.innerHTML = `<h2>Relatório ${userSessao.nome}</h2>`;
        const opt = { margin: 10, filename: 'Validades.pdf', jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
        if (Capacitor?.isNativePlatform()) {
            const pdfBase64 = await html2pdf().set(opt).from(container).outputPdf('datauristring');
            const result = await Filesystem.writeFile({ path: `Vld_${Date.now()}.pdf`, data: pdfBase64.split(',')[1], directory: 'CACHE' });
            await Plugins.FileOpener.open({ filePath: result.uri, contentType: 'application/pdf' });
        } else { await html2pdf().set(opt).from(container).save(); }
    } catch (e) { alert("Erro PDF"); } finally { btn.innerText = "IMPRIMIR PDF"; btn.disabled = false; }
}

async function agendarAvisosCapacitor(item) {
    if (!LocalNotifications) return;
    const config = await getConfigs();
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') return;
    const dataVal = new Date(item.validade + 'T00:00:00');
    const diffDias = Math.ceil((dataVal - new Date()) / 86400000);
    const caminhoFoto = item.imagemLocal || FOTO_FALLBACK;
    let notifications = [];
    config.horarios.forEach((horaStr) => {
        const [h, m] = horaStr.split(':');
        for (let i = 0; i <= (config.diasAviso || 7); i++) {
            const diasRestantes = diffDias - i;
            if (diasRestantes < 0) continue;
            const dataAlvo = new Date(); dataAlvo.setDate(dataAlvo.getDate() + i); dataAlvo.setHours(parseInt(h), parseInt(m), 0, 0);
            if (dataAlvo > new Date()) {
                notifications.push({
                    title: "⚠️ Alerta de Validade",
                    body: `${item.nome}: Vence em ${diasRestantes} dias`,
                    id: Math.floor(Math.random() * 1000000),
                    schedule: { at: dataAlvo },
                    attachments: [{ id: 'foto', url: caminhoFoto }],
                    android: { importance: 'high', smallIcon: 'ic_stat_name', largeIcon: caminhoFoto, style: 'picture', picture: caminhoFoto, color: '#f39c12' }
                });
            }
        }
    });
    if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
}

async function atualizarListaAgendados() {
    const container = el('lista_notificacoes_agendadas');
    if (!container || !LocalNotifications) return;
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length === 0) { container.innerHTML = "<p>Sem alarmes.</p>"; return; }
    let html = `<div style="padding:10px; border:1px solid #ddd;"><h4>Alarmes (${pending.notifications.length})</h4>`;
    pending.notifications.forEach(n => {
        html += `<div style="display:flex; justify-content:space-between; padding:5px 0; font-size:10px;"><span>${n.title} - ${n.body}</span><button onclick="window.removerAlarmeSistema(${n.id})">X</button></div>`;
    });
    container.innerHTML = html + `<button onclick="window.limparTudoSistema()">LIMPAR TUDO</button></div>`;
}

window.removerAlarmeSistema = async (id) => { await LocalNotifications.cancel({ notifications: [{ id }] }); atualizarListaAgendados(); };
window.limparTudoSistema = async () => { const pending = await LocalNotifications.getPending(); if (pending.notifications.length > 0) await LocalNotifications.cancel(pending); atualizarListaAgendados(); };