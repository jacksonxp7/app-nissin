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
   1. ACESSO AOS PLUGINS E CONFIGURAÇÕES
============================================================ */
const Plugins = window.Capacitor?.Plugins;
const Filesystem = window.Capacitor?.Plugins?.Filesystem;
const LocalNotifications = window.Capacitor?.Plugins?.LocalNotifications;
const Capacitor = window.Capacitor;

// Interface Nativa (Android Studio)
const AndroidNative = window.AndroidInterface;

/* ============================================================
   2. FUNÇÃO AUXILIAR DE DOWNLOAD (A "FORMA MELHOR")
   Esta função resolve o erro de download do Capacitor baixando os dados
   manualmente e salvando como arquivo local.
============================================================ */
async function baixarESalvarImagem(url, nomeArquivo) {
    if (!url) return;

    // 1. Prioridade: Motor Nativo (Android Studio) - Mais estável
    if (AndroidNative?.downloadAndNotify) {
        AndroidNative.downloadAndNotify(url, nomeArquivo);
        return;
    }

    // 2. Fallback: Capacitor (Fetch + Base64) - Correção para quando o nativo não existir
    if (Capacitor?.isNativePlatform() && Filesystem) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            
            // Converter Blob para Base64
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = reader.result.split(',')[1];
                
                await Filesystem.writeFile({
                    path: `Ikeda/Imagens/${nomeArquivo}.jpg`,
                    data: base64data,
                    directory: 'DOCUMENTS', // Ou 'EXTERNAL_STORAGE' no Android
                    recursive: true
                });
                console.log("Imagem salva via Capacitor");
            };
        } catch (e) {
            console.error("Erro no download Capacitor:", e);
        }
    }
}

/* ============================================================
   3. INICIALIZAÇÃO DA TELA
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
   4. AUTOCOMPLETE DE PRODUTOS
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
   5. ADICIONAR VALIDADE (DOWNLOAD + ALARME NATIVO)
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

    // --- EXECUÇÃO DO DOWNLOAD (USANDO A NOVA FUNÇÃO MELHORADA) ---
    if (urlImagem) {
        await baixarESalvarImagem(urlImagem, `validade_${nome.replace(/\s+/g, '_')}`);
    }

    // --- AGENDAMENTO DE NOTIFICAÇÃO ---
    const timestampAlerta = new Date(validade + 'T09:00:00').getTime();
    
    if (AndroidNative?.scheduleNotification) {
        AndroidNative.scheduleNotification(
            "⚠️ Produto Vence Hoje!",
            `${nome} (${quantidade} un) está vencendo.`,
            timestampAlerta,
            nome
        );
    } else if (Capacitor?.isNativePlatform() && LocalNotifications) {
        await agendarAvisosCapacitor(nome, validade);
    }

    // --- SALVAR NO FIREBASE ---
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
   6. LISTAGEM DE VALIDADES
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
            if (dias < 0) tr.style.backgroundColor = '#ffcccc'; 
            else if (dias <= 7) tr.style.backgroundColor = '#fff3cd'; 

            tr.innerHTML = `
                <td>${item.nome}</td>
                <td style="text-align:center;">${item.quantidade}</td>
                <td style="text-align:center;">${item.validade.split('-').reverse().join('/')}</td>
                <td style="text-align:center; font-weight:bold;">${dias < 0 ? 'VENCIDO' : dias + 'd'}</td>
                <td style="text-align:center;"><button class="btn-excluir" style="background:none; border:none; cursor:pointer;">❌</button></td>
            `;

            tr.querySelector('.btn-excluir').onclick = () => removerValidade(item.id, item.nome);
            tbody.appendChild(tr);
        });
    } catch (err) { console.error("Erro carregar lista:", err); }
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
   7. GERAR PDF (OTIMIZADO)
============================================================ */
async function gerarPDF() {
    const btn = el('imprimir_pdf');
    if (!btn) return;
    btn.innerText = "GERANDO..."; btn.disabled = true;
    
    try {
        const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
        const snap = await getDocs(query(collection(db, "usuarios", userSessao.nome, "validades"), orderBy("validade", "asc")));
        
        const divTemp = document.createElement('div');
        divTemp.style.padding = "20px";
        let tabela = `<h2 style="text-align:center;">Relatório de Validades - ${userSessao.nome}</h2>
                      <table border="1" style="width:100%; border-collapse:collapse;">
                      <thead><tr style="background:#eee;"><th>Produto</th><th>Qtd</th><th>Data Validade</th></tr></thead><tbody>`;
        
        snap.forEach(d => {
            const i = d.data();
            tabela += `<tr><td style="padding:5px;">${i.nome}</td><td style="text-align:center;">${i.quantidade}</td><td style="text-align:center;">${i.validade}</td></tr>`;
        });
        tabela += `</tbody></table>`;
        divTemp.innerHTML = tabela;

        const opt = { 
            margin: 10, 
            filename: `Ikeda_Validades_${userSessao.nome}.pdf`, 
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
        };

        if (AndroidNative?.saveAndOpenPDF) {
            const pdfDataUri = await html2pdf().set(opt).from(divTemp).outputPdf('datauristring');
            const puraBase64 = pdfDataUri.split(',')[1];
            AndroidNative.saveAndOpenPDF(puraBase64, `Validades_${userSessao.nome}.pdf`);
        } else {
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
   8. AUXILIARES CAPACITOR
============================================================ */
async function agendarAvisosCapacitor(nome, validade) {
    if (!LocalNotifications) return;
    const dataAlva = new Date(validade + 'T09:00:00');
    if (dataAlva > new Date()) {
        await LocalNotifications.schedule({
            notifications: [{
                title: "⚠️ Produto Vencendo",
                body: `${nome} vence hoje!`,
                id: Math.floor(Math.random() * 100000),
                schedule: { at: dataAlva },
                android: { smallIcon: 'ic_stat_name', importance: 5 }
            }]
        });
    }
}

async function atualizarListaAgendados() {
    const container = el('lista_notificacoes_agendadas');
    if (!container) return;
    
    if (AndroidNative) {
        container.innerHTML = "<p style='font-size:12px; color:green;'>✅ Gerenciado pelo Sistema Nativo</p>";
        return;
    }

    if (LocalNotifications) {
        const pending = await LocalNotifications.getPending();
        container.innerHTML = `<p style='font-size:12px;'>Notificações ativas: ${pending.notifications.length}</p>`;
    }
}