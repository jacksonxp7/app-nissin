
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
   4. ADICIONAR VALIDADE E BAIXAR IMAGEM DA URL
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

    btn.innerText = "PROCESSANDO...";
    btn.disabled = true;

    // 1. Buscar a URL da imagem no Firebase
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

    // 2. Tentar baixar a imagem da URL para o celular (apenas se estiver no App)
    let caminhoLocalFinal = "";
    if (window.Capacitor?.isNativePlatform()) {
        if (urlImagemFirebase && urlImagemFirebase.startsWith('http')) {
            btn.innerText = "BAIXANDO FOTO...";
            caminhoLocalFinal = await baixarImagemDaURL(urlImagemFirebase, nome);
        } else {
            // Se não tem URL no firebase, tentamos usar o logo local da pasta www
            caminhoLocalFinal = "www/img/logo.png";
        }
    }

    const idUnico = String(Date.now());
    const registro = {
        id: idUnico,
        nome: nome,
        quantidade: quantidade,
        validade: validade,
        imagemLocal: caminhoLocalFinal, // Salva o caminho do arquivo baixado (ex: file://...)
        criadoEm: hojeISO(),
        usuario: userSessao.nome
    };

    try {
        await setDoc(doc(db, "usuarios", userSessao.nome, "validades", idUnico), registro);

        // Agenda avisos no celular usando a imagem baixada
        await agendarAvisosCapacitor(registro);

        toque('mario_coin_s');
        nomeInput.value = ''; 
        qtdInput.value = ''; 
        validadeInput.value = '';
        
        carregarValidades();
        atualizarListaAgendados(); 
        alert("Agendamento concluído!");

    } catch (error) {
        alert("Erro: " + error.message);
    } finally {
        btn.innerText = "AGENDAR";
        btn.disabled = false;
    }
}

/* ============================================================
   5. FUNÇÃO PARA BAIXAR IMAGEM DA URL (HTTP -> BASE64 -> FILE)
============================================================ */
async function baixarImagemDaURL(url, nomeProduto) {
    try {
        // Gera nome de arquivo limpo
        const nomeArquivo = nomeProduto.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".jpg";
        const path = `ikeda/validades/${nomeArquivo}`;

        // Faz o download da imagem (URL do Firebase/Web)
        const response = await fetch(url);
        const blob = await response.blob();

        // Converte o Blob para Base64
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });

        // Grava no sistema de arquivos do celular (Pasta DATA é a mais segura para notificações)
        const salvamento = await Filesystem.writeFile({
            path: path,
            data: base64Data.split(',')[1], // Remove o prefixo data:image/jpeg;base64,
            directory: 'DATA',
            recursive: true
        });

        console.log("Imagem baixada e salva em:", salvamento.uri);
        return salvamento.uri; // Retorna o link interno file://...

    } catch (err) {
        console.error("Erro ao baixar imagem da URL:", err);
        return "www/img/logo.png"; // Fallback para o logo se der erro
    }
}

/* ============================================================
   6. LISTAGEM DAS VALIDADES
============================================================ */
async function carregarValidades() {
    const tbody = el('tbody_vldd');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!tbody || !userSessao) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Carregando dados...</td></tr>';

    try {
        const q = query(collection(db, "usuarios", userSessao.nome, "validades"), orderBy("validade", "asc"));
        const snap = await getDocs(q);

        tbody.innerHTML = '';
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:gray;">Nenhuma validade cadastrada.</td></tr>';
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
                <td style="text-align:center; font-weight:bold; color:${dias < 0 ? 'red' : 'inherit'}">
                    ${dias < 0 ? 'VENCIDO' : dias + ' dias'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" style="color:red;">Erro ao carregar dados.</td></tr>';
        console.error(err);
    }
}

/* ============================================================
   7. REMOVER VALIDADE
============================================================ */
async function removerValidade(id, nome) {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return;

    if (confirm(`Deseja excluir permanentemente a validade de "${nome}"?`)) {
        try {
            await deleteDoc(doc(db, "usuarios", userSessao.nome, "validades", String(id)));
            toque('decide_s');
            carregarValidades();
            atualizarListaAgendados(); 
        } catch (e) {
            alert("Erro ao deletar.");
        }
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
        if (snap.empty) {
            alert("Não há dados para gerar relatório.");
            return;
        }

        const containerPdf = document.createElement('div');
        containerPdf.style.padding = "20px";

        let linhasHtml = "";
        snap.forEach(d => {
            const item = d.data();
            linhasHtml += `
                <tr>
                    <td style="border:1px solid #ccc; padding:8px;">${item.nome}</td>
                    <td style="border:1px solid #ccc; padding:8px; text-align:center;">${item.quantidade}</td>
                    <td style="border:1px solid #ccc; padding:8px; text-align:center;">${item.validade.split('-').reverse().join('/')}</td>
                </tr>`;
        });

        containerPdf.innerHTML = `
            <div style="text-align:center; margin-bottom:20px;">
                <h2 style="margin:0;">Distribuidora Francisco Ikeda</h2>
                <h3 style="margin:0;">Relatório de Validades - ${userSessao.nome.toUpperCase()}</h3>
                <p style="font-size:12px;">Gerado em: ${new Date().toLocaleString()}</p>
            </div>
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#f2f2f2;">
                        <th style="border:1px solid #ccc; padding:8px;">Produto</th>
                        <th style="border:1px solid #ccc; padding:8px;">Qtd</th>
                        <th style="border:1px solid #ccc; padding:8px;">Vencimento</th>
                    </tr>
                </thead>
                <tbody>${linhasHtml}</tbody>
            </table>
        `;

        const opt = {
            margin: 10,
            filename: `Validades_${userSessao.nome}.pdf`,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        if (window.Capacitor?.isNativePlatform()) {
            const pdfBase64 = await html2pdf().set(opt).from(containerPdf).outputPdf('datauristring');
            const result = await Filesystem.writeFile({
                path: `Validades_${Date.now()}.pdf`,
                data: pdfBase64.split(',')[1],
                directory: 'CACHE'
            });
            await FileOpener.open({ filePath: result.uri, contentType: 'application/pdf' });
        } else {
            await html2pdf().set(opt).from(containerPdf).save();
        }
    } catch (err) {
        console.error(err);
        alert("Erro ao gerar PDF.");
    } finally {
        btn.innerText = "IMPRIMIR PDF";
        btn.disabled = false;
    }
}

/* ============================================================
   9. AGENDAR NOTIFICAÇÕES COM A IMAGEM BAIXADA
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

    // Se o download falhou por algum motivo, usa o logo interno
    const caminhoFoto = item.imagemLocal || "www/img/logo.png";

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
                    // Attachments para iOS
                    attachments: [ { id: 'pic', url: caminhoFoto } ],
                    android: { 
                        importance: 'high', 
                        smallIcon: 'ic_stat_name', 
                        largeIcon: caminhoFoto,
                        style: 'picture', // Estilo de imagem grande
                        picture: caminhoFoto, // A foto baixada da URL
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
   10. GERENCIADOR DE ALARMES DO SISTEMA (PARA APAGAR)
============================================================ */
async function atualizarListaAgendados() {
    const container = el('lista_notificacoes_agendadas');
    if (!container || !LocalNotifications) return;

    try {
        const pending = await LocalNotifications.getPending();
        
        if (pending.notifications.length === 0) {
            container.innerHTML = "<p style='padding:10px; color:gray; text-align:center;'>Nenhum alarme ativo no sistema.</p>";
            return;
        }

        let html = `
            <div style="padding:10px; background:#fff; border:1px solid #ddd; border-radius:8px; margin-top:15px;">
                <h4 style="margin:0 0 10px 0; color:#333; border-bottom:2px solid #f39c12; display:inline-block;">Alarmes Agendados (${pending.notifications.length})</h4>
                <div style="max-height:250px; overflow-y:auto;">
        `;

        pending.notifications.forEach(n => {
            const dataAgendada = n.schedule?.at ? new Date(n.schedule.at).toLocaleString() : '---';
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding:10px 0;">
                    <div style="font-size:12px; flex:1; padding-right:10px;">
                        <strong style="color:#d35400;">${n.title}</strong><br>
                        <span>${n.body}</span><br>
                        <small style="color:#888;">⏰ ${dataAgendada}</small>
                    </div>
                    <button 
                        style="background:#e74c3c; color:white; border:none; border-radius:4px; padding:6px 12px; font-size:11px; font-weight:bold; cursor:pointer;"
                        onclick="window.removerAlarmeSistema(${n.id})">
                        APAGAR
                    </button>
                </div>
            `;
        });

        html += `</div>
                 <button style="width:100%; margin-top:15px; padding:12px; background:#2c3e50; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer;" 
                 onclick="window.limparTudoSistema()">CANCELAR TODOS OS ALARMES</button>
                 </div>`;
        container.innerHTML = html;

    } catch (err) {
        console.error("Erro ao ler notificações:", err);
    }
}

window.removerAlarmeSistema = async (id) => {
    if (confirm("Deseja cancelar este alarme?")) {
        await LocalNotifications.cancel({ notifications: [{ id }] });
        atualizarListaAgendados();
    }
};

window.limparTudoSistema = async () => {
    if (confirm("Isso apagará TODOS os lembretes de validade agendados no seu celular. Confirmar?")) {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
            await LocalNotifications.cancel(pending);
        }
        atualizarListaAgendados();
    }
};