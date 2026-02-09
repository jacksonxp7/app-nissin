import { el, hojeISO, sanitize } from './utils.js';
import { historico } from './firebase.js';

/* ============================================================
   FUNÇÃO PRINCIPAL E INICIALIZAÇÃO
   ============================================================ */
export function validadesfunc() {
    const btnAdd = el('buttonadd_vldd');
    const btnPrint = el('imprimir_pdf');

    if (btnAdd) btnAdd.onclick = adicionarValidade;
    if (btnPrint) btnPrint.onclick = gerarPDF;

    carregarSugestoesParaValidade();
    carregarValidades();
}

/* ============================================================
   LÓGICA DE ADICIONAR E AGENDAR
   ============================================================ */
function adicionarValidade() {
    const nomeInput = el('add_item_validade');
    const qtdInput = el('quantidade_itens_validade');
    const validadeInput = el('validade_item_add');

    const nome = nomeInput?.value.trim();
    const quantidade = qtdInput?.value || 0;
    const validade = validadeInput?.value; // formato yyyy-mm-dd

    if (!nome || !validade) {
        alert('Preencha o nome do produto e a data de validade!');
        return;
    }

    // Criamos um ID único numérico baseado no tempo (essencial para os alarmes do Android)
    const idUnico = Math.floor(Date.now() / 1000); 

    const registro = {
        id: idUnico,
        nome: sanitize(nome),
        quantidade: quantidade,
        validade: validade,
        setor: 'Geral',
        criadoEm: hojeISO()
    };

    const salvos = JSON.parse(localStorage.getItem('validades')) || [];
    salvos.push(registro);
    localStorage.setItem('validades', JSON.stringify(salvos));

    // Inicia o agendamento de múltiplos alarmes no Android
    agendarTodosAlertas(registro);
    
    // Salva no histórico do Firebase
    registrarHistorico(nome, validade, 'Geral', quantidade);

    // Limpa campos e atualiza tela
    nomeInput.value = '';
    qtdInput.value = '';
    validadeInput.value = '';
    carregarValidades();
}

/**
 * Esta função cria uma sequência de ordens para o App Inventor.
 * Ela agenda avisos para as 06:00 e 13:00 de cada dia até o vencimento (limite 7 dias).
 */
function agendarTodosAlertas(item) {
    if (!window.AppInventor) return;

    const dataValidade = new Date(item.validade + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const diffMilis = dataValidade - hoje;
    const diasParaVencer = Math.ceil(diffMilis / 86400000);

    // 1. AVISO IMEDIATO DE SALVAMENTO
    enviarAoApp("SALVO", item.id, item.nome, "Produto agendado com sucesso!", 1);

    // 2. SE JÁ ESTIVER VENCIDO HOJE
    if (diasParaVencer <= 0) {
        enviarAoApp("AGENDAR", item.id + "99", item.nome, "PRODUTO VENCIDO! Retire imediatamente da prateleira.", 1, "URGENTE");
        return;
    }

    // 3. AGENDAR CICLO DE 7 DIAS (Aviso diário que muda o texto)
    // Agendamos para os próximos dias, até o dia do vencimento (máximo 7 dias de antecedência)
    const inicioAviso = diasParaVencer > 7 ? 7 : diasParaVencer;

    for (let i = 0; i <= inicioAviso; i++) {
        const diasNoMomento = diasParaVencer - i;
        if (diasNoMomento < 0) continue;

        let mensagem = `Faltam ${diasNoMomento} dias para vencer.`;
        let titulo = "Atenção: Validade Próxima";

        if (diasNoMomento === 1) mensagem = "Vence AMANHÃ! Prepare a retirada.";
        if (diasNoMomento === 0) {
            mensagem = "VENCE HOJE! Retire do estoque agora.";
            titulo = "🚨 VENCIMENTO HOJE";
        }

        // Calcula minutos para as 6:00 e 13:00 do dia (hoje + i dias)
        const min6h = calcularMinutosAte(i, 6);
        const min13h = calcularMinutosAte(i, 13);

        // Enviamos comandos separados para o App Inventor
        // Criamos IDs únicos para cada slot: ID_Original + Dia + Slot(1 ou 2)
        if (min6h > 0) {
            setTimeout(() => enviarAoApp("AGENDAR", `${item.id}${i}1`, item.nome, mensagem, min6h, titulo), i * 50);
        }
        if (min13h > 0) {
            setTimeout(() => enviarAoApp("AGENDAR", `${item.id}${i}2`, item.nome, mensagem, min13h, titulo), i * 60);
        }
    }
}

/* ============================================================
   FUNÇÕES DE APOIO (DATA E COMUNICAÇÃO)
   ============================================================ */

function calcularMinutosAte(diasNoFuturo, horaAlvo) {
    const agora = new Date();
    const alvo = new Date();
    alvo.setDate(alvo.getDate() + diasNoFuturo);
    alvo.setHours(horaAlvo, 0, 0, 0);

    const diff = alvo - agora;
    return Math.floor(diff / 60000); // retorna minutos
}

function enviarAoApp(comando, id, nome, msg, delay, titulo = "Validade") {
    if (window.AppInventor) {
        // Formato: COMANDO | ID | NOME | MENSAGEM | DELAY | TITULO
        const stringOutput = `${comando}|${id}|${nome}|${msg}|${delay}|${titulo}`;
        window.AppInventor.setWebViewString(stringOutput);
    }
}

function removerValidade(id) {
    if (confirm("Deseja excluir este item e CANCELAR todos os avisos de notificação?")) {
        // Envia comando de cancelamento para o App Inventor
        if (window.AppInventor) {
            window.AppInventor.setWebViewString(`CANCELAR|${id}`);
        }

        const dados = JSON.parse(localStorage.getItem('validades')) || [];
        const filtrados = dados.filter(item => item.id !== id);
        localStorage.setItem('validades', JSON.stringify(filtrados));
        carregarValidades();
    }
}

/* ============================================================
   LISTAGEM E INTERFACE
   ============================================================ */

function carregarValidades() {
    const lista = el('tbody_vldd');
    if (!lista) return;

    const dados = JSON.parse(localStorage.getItem('validades')) || [];
    lista.innerHTML = '';
    dados.sort((a, b) => new Date(a.validade) - new Date(b.validade));

    dados.forEach((item) => {
        const dataVal = new Date(item.validade + 'T12:00:00');
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const dias = Math.ceil((dataVal - hoje) / 86400000);

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        if (dias < 0) tr.style.backgroundColor = '#ffcccc';
        else if (dias <= 7) tr.style.backgroundColor = '#fff3cd';

        // Clique duplo para deletar
        tr.ondblclick = () => removerValidade(item.id);

        tr.innerHTML = `
            <td class="pedido">${item.nome}</td>
            <td class="pedido">${item.quantidade}</td>
            <td class="pedido">${item.validade.split('-').reverse().join('/')}</td>
            <td class="resultado">${dias < 0 ? 'Vencido' : dias}</td>
            <td class="resultado">${(dias / 30).toFixed(1)}</td>
            <td class="resultado" style="font-weight: bold;">
               ${dias < 0 ? 'RETIRAR' : dias + ' dias'}
            </td>
        `;
        lista.appendChild(tr);
    });
}

async function carregarSugestoesParaValidade() {
    const datalist = el('lista-itens');
    if (!datalist) return;
    try {
        const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
        const { db } = await import('./firebase.js');
        const categoriasSnap = await getDocs(collection(db, 'produtos'));
        let nomes = [];
        for (const cat of categoriasSnap.docs) {
            const itens = await getDocs(collection(db, 'produtos', cat.id, 'itens'));
            itens.forEach(d => { if (d.data().nome) nomes.push(d.data().nome); });
        }
        const unicos = [...new Set(nomes)];
        datalist.innerHTML = unicos.map(n => `<option value="${n}">`).join('');
    } catch (err) { console.error("Erro sugestões:", err); }
}

async function registrarHistorico(nome, validade, setor, qtd) {
    try {
        const user = JSON.parse(localStorage.getItem('cadastros'))?.nome || 'Usuario';
        await historico(user, nome, qtd, 'un', 'validade', setor, `Vencimento: ${validade}`, 0);
    } catch (e) { console.warn("Erro Firebase Histórico"); }
}

function gerarPDF() {
    const dados = JSON.parse(localStorage.getItem('validades')) || [];
    if (!dados.length) return alert('Lista vazia');
    const texto = dados.map(v => `${v.nome} | Val: ${v.validade}`).join('\n');
    if (window.AppInventor) window.AppInventor.setWebViewString(`IMPRIMIR|${texto}`);
}