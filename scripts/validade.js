import { el, hojeISO, toque } from './utils.js';
import { db, registrarHistorico } from './firebase.js';
import { getConfigs } from './configs.js';
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

    // Carrega o autocomplete e a lista vinda da nuvem
    carregarSugestoesParaValidade();
    carregarValidades();
}

/* ============================================================
   3. BUSCAR PRODUTOS DO FIREBASE (AUTOCOMPLETE)
============================================================ */
async function carregarSugestoesParaValidade() {
    const datalist = el('lista-itens');
    if (!datalist) return;

    try {
        const categoriasSnap = await getDocs(collection(db, 'produtos'));
        let nomesEncontrados = [];

        for (const categoriaDoc of categoriasSnap.docs) {
            const itensSnap = await getDocs(collection(db, 'produtos', categoriaDoc.id, 'itens'));
            itensSnap.forEach(doc => {
                const data = doc.data();
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
   4. ADICIONAR VALIDADE (SALVAR NO FIREBASE)
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

    btn.innerText = "SALVANDO...";
    btn.disabled = true;

    // Tenta buscar a imagem do produto no banco global para deixar o registro rico
    let imagemEncontrada = "";
    try {
        const categoriasSnap = await getDocs(collection(db, 'produtos'));
        for (const catDoc of categoriasSnap.docs) {
            const itensSnap = await getDocs(collection(db, 'produtos', catDoc.id, 'itens'));
            const itemMatch = itensSnap.docs.find(d => d.data().nome.toLowerCase() === nome.toLowerCase());
            if (itemMatch) {
                imagemEncontrada = itemMatch.data().imagem || "";
                break;
            }
        }
    } catch (e) { console.warn("Não foi possível buscar imagem do produto."); }

    const idUnico = String(Date.now());
    const registro = {
        id: idUnico,
        nome: nome,
        quantidade: quantidade,
        validade: validade,
        imagem: imagemEncontrada,
        criadoEm: hojeISO()
    };

    try {
        // 1. Salva na nuvem do usuário
        await setDoc(doc(db, "usuarios", userSessao.nome, "validades", idUnico), registro);

        // 2. Registra no histórico geral de atividades
        await registrarHistorico(userSessao.nome, nome, quantidade, 'un', 'Validade', 'Geral', `Vencimento: ${validade}`, 0);

        // 3. Agenda avisos no celular (se for App)
        agendarAvisosCapacitor(registro);

        // Limpeza e Feedback
        toque('mario_coin_s');
        nomeInput.value = ''; qtdInput.value = ''; validadeInput.value = '';
        carregarValidades();
        alert("Validade salva com sucesso na nuvem!");

    } catch (error) {
        alert("Erro ao salvar: " + error.message);
    } finally {
        btn.innerText = "AGENDAR";
        btn.disabled = false;
    }
}

/* ============================================================
   5. LISTAGEM (BUSCANDO DO FIREBASE)
============================================================ */
async function carregarValidades() {
    const tbody = el('tbody_vldd');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!tbody || !userSessao) return;

    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Carregando dados da nuvem...</td></tr>';

    try {
        // Busca as validades ordenadas pela data de vencimento mais próxima
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
            
            // Estilização baseada na urgência
            if (dias < 0) tr.style.backgroundColor = '#ffcccc'; // Vencido
            else if (dias <= 7) tr.style.backgroundColor = '#fff3cd'; // Alerta (7 dias)

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
   6. REMOVER VALIDADE (EXCLUIR DO FIREBASE)
============================================================ */
async function removerValidade(id, nome) {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return;

    if (confirm(`Deseja excluir permanentemente a validade de "${nome}"?`)) {
        try {
            await deleteDoc(doc(db, "usuarios", userSessao.nome, "validades", String(id)));
            toque('decide_s');
            carregarValidades();
        } catch (e) {
            alert("Erro ao deletar: " + e.message);
        }
    }
}

/* ============================================================
   7. GERAÇÃO DE PDF (RELATÓRIO)
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
            btn.innerText = "IMPRIMIR PDF"; btn.disabled = false;
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
   8. NOTIFICAÇÕES LOCAIS (CAPACITOR)
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

    let notifications = [];

    config.horarios.forEach((horaStr, hIdx) => {
        const [h, m] = horaStr.split(':');
        
        // Agenda avisos regressivos (ex: faltam 7 dias, 6 dias... até o dia)
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
                    android: { importance: 'high', smallIcon: 'ic_stat_name', color: '#f39c12' }
                });
            }
        }
    });

    if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
    }
}