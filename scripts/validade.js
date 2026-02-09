/**
 * SISTEMA DE CONTROLE DE VALIDADES - INTEGRADO COM MIT APP INVENTOR
 * Versão Completa e Corrigida
 */

import { el, parseDataBR, hojeISO, sanitize } from './utils.js';
import { historico } from './firebase.js';

/* ============================================================
   1. INICIALIZAÇÃO
   ============================================================ */
export function validadesfunc() {
    console.log("Sistema de validades inicializado.");
    
    const btnAdd = el('buttonadd_vldd');
    const btnPrint = el('imprimir_pdf'); 

    if (btnAdd) {
        btnAdd.onclick = adicionarValidade;
    } else {
        console.error("Botão 'buttonadd_vldd' não encontrado no DOM.");
    }

    if (btnPrint) {
        btnPrint.onclick = gerarPDF;
    }

    // Carrega dados iniciais
    carregarSugestoesParaValidade();
    carregarValidades();
}

/* ============================================================
   2. BUSCAR PRODUTOS DO FIREBASE (SUGESTÕES)
   ============================================================ */
async function carregarSugestoesParaValidade() {
    const datalist = el('lista-itens'); 
    if (!datalist) return;

    try {
        const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
        const { db } = await import('./firebase.js');

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
        console.log("Sugestões carregadas com sucesso.");
    } catch (err) {
        console.error("Erro ao carregar sugestões do Firebase:", err);
    }
}

/* ============================================================
   3. ADICIONAR VALIDADE E AGENDAR NOTIFICAÇÕES
   ============================================================ */
function adicionarValidade() {
    const nomeInput = el('add_item_validade');
    const qtdInput = el('quantidade_itens_validade');
    const validadeInput = el('validade_item_add');

    const nome = nomeInput?.value.trim();
    const quantidade = qtdInput?.value || 0;
    const validade = validadeInput?.value; // Formato esperado: yyyy-mm-dd

    if (!nome || !validade) {
        alert('Erro: Preencha o nome do produto e a data de validade!');
        return;
    }

    // Criamos um ID numérico seguro (6 dígitos) para evitar erros de Integer no MIT App
    const idUnico = Math.floor(Math.random() * 900000) + 100000;

    const registro = {
        id: idUnico,
        nome: sanitize(nome),
        quantidade: quantidade,
        validade: validade,
        setor: 'Geral',
        criadoEm: hojeISO()
    };

    // Salva no LocalStorage do navegador/app
    const salvos = JSON.parse(localStorage.getItem('validades')) || [];
    salvos.push(registro);
    localStorage.setItem('validades', JSON.stringify(salvos));

    // --- SINCRONIZAÇÃO COM OS BLOCOS DO APP ---
    sincronizarNotificacoesComApp(registro);

    // Salva no Histórico do Firebase
    registrarHistorico(nome, validade, 'Geral', quantidade);
    
    // Limpeza de interface
    if(nomeInput) nomeInput.value = '';
    if(qtdInput) qtdInput.value = '';
    if(validadeInput) validadeInput.value = '';
    
    carregarValidades();
}

/**
 * Envia múltiplos comandos para o MIT App Inventor agendar notificações diárias
 */
function sincronizarNotificacoesComApp(item) {
    if (!window.AppInventor) {
        console.warn("AppInventor não detectado. Notificações não serão agendadas no Android.");
        return;
    }

    const dataVal = new Date(item.validade + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Diferença em dias
    const diffMilis = dataVal - hoje;
    const diasFaltantes = Math.ceil(diffMilis / 86400000);

    // 1. Notificação de confirmação imediata
    enviarComandoAoApp("SALVO", item.id, item.nome, "Produto agendado com sucesso!", 1, "Sucesso");

    // 2. Se o produto já está vencido
    if (diasFaltantes <= 0) {
        enviarComandoAoApp("AVISO_IMEDIATO", item.id, item.nome, "PRODUTO VENCIDO! Retire da prateleira agora.", 1, "URGENTE");
        return;
    }

    // 3. Agendamento Diário (Máximo 7 dias de antecedência)
    // Agendamos avisos para cada dia até o vencimento.
    // O texto muda dinamicamente: "Faltam 7 dias", "Faltam 6 dias"...
    const rangeAvisos = diasFaltantes > 7 ? 7 : diasFaltantes;

    for (let i = 0; i <= rangeAvisos; i++) {
        const diasNoMomentoDoAviso = diasFaltantes - i;
        if (diasNoMomentoDoAviso < 0) continue;

        let titulo = "Validade Próxima";
        let mensagem = `Faltam apenas ${diasNoMomentoDoAviso} dias para o produto vencer!`;

        if (diasNoMomentoDoAviso === 1) mensagem = "Vence AMANHÃ! Prepare a retirada.";
        if (diasNoMomentoDoAviso === 0) {
            mensagem = "VENCE HOJE! Retire imediatamente!";
            titulo = "🚨 ATENÇÃO: VENCE HOJE";
        }

        // Calcula minutos para as 6:00 e 13:00 de cada dia 'i' no futuro
        const delay6h = calcularMinutosParaHorario(i, 6);
        const delay13h = calcularMinutosParaHorario(i, 13);

        // Enviamos comandos para o bloco "AGENDAR"
        // ID gerado combina: ID_BASE + DIA + SLOT (1 ou 2)
        // Isso garante que o loop de cancelamento dos blocos funcione.
        if (delay6h > 0) {
            enviarComandoAoApp("AGENDAR", `${item.id}${i}1`, item.nome, mensagem, delay6h, titulo);
        }
        if (delay13h > 0) {
            enviarComandoAoApp("AGENDAR", `${item.id}${i}2`, item.nome, mensagem, delay13h, titulo);
        }
    }
}

/* ============================================================
   4. FUNÇÕES DE CÁLCULO E COMUNICAÇÃO
   ============================================================ */

function calcularMinutosParaHorario(diasNoFuturo, horaAlvo) {
    const agora = new Date();
    const dataAlvo = new Date();
    dataAlvo.setDate(agora.getDate() + diasNoFuturo);
    dataAlvo.setHours(horaAlvo, 0, 0, 0);

    const diferencaMilis = dataAlvo - agora;
    return Math.floor(diferencaMilis / 60000); // Converte para minutos
}

function enviarComandoAoApp(comando, id, nome, msg, delay, titulo) {
    if (window.AppInventor) {
        // String formatada para o bloco 'split at |'
        // 1:TIPO | 2:ID | 3:NOME | 4:MSG | 5:DELAY | 6:TITULO
        const payload = `${comando}|${id}|${nome}|${msg}|${delay}|${titulo}`;
        window.AppInventor.setWebViewString(payload);
    }
}

/* ============================================================
   5. LISTAGEM E EXCLUSÃO
   ============================================================ */
function carregarValidades() {
    const lista = el('tbody_vldd'); 
    if (!lista) return;

    const dados = JSON.parse(localStorage.getItem('validades')) || [];
    lista.innerHTML = '';

    // Ordenação: Os que vencem antes aparecem primeiro
    dados.sort((a, b) => new Date(a.validade) - new Date(b.validade));

    dados.forEach((item) => {
        const dataVal = new Date(item.validade + 'T12:00:00'); 
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const diffMilis = dataVal - hoje;
        const dias = Math.ceil(diffMilis / 86400000);
        const meses = (dias / 30).toFixed(1);

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';

        // Feedback Visual
        if (dias < 0) {
            tr.style.backgroundColor = '#ffcccc'; // Vermelho: Vencido
        } else if (dias <= 7) {
            tr.style.backgroundColor = '#fff3cd'; // Amarelo: Alerta
        }

        // EVENTO DE CLIQUE DUPLO PARA EXCLUIR
        tr.ondblclick = () => removerValidade(item.id);

        tr.innerHTML = `
            <td class="pedido">${item.nome}</td>
            <td class="pedido">${item.quantidade}</td>
            <td class="pedido">${item.validade.split('-').reverse().join('/')}</td>
            <td class="resultado">${dias < 0 ? 'Vencido' : dias}</td>
            <td class="resultado">${dias < 0 ? '---' : meses}</td>
            <td class="resultado" style="font-weight: bold;">
                ${dias < 0 ? 'RETIRAR IMEDIATAMENTE' : dias + ' dias'}
            </td>
        `;
        lista.appendChild(tr);
    });
}

function removerValidade(id) {
    if (confirm("Deseja excluir este item e cancelar todos os avisos agendados?")) {
        
        // Envia comando para o bloco "CANCELAR_PRODUTO"
        if (window.AppInventor) {
            window.AppInventor.setWebViewString(`CANCELAR_PRODUTO|${id}`);
        }

        const dados = JSON.parse(localStorage.getItem('validades')) || [];
        const novaLista = dados.filter(item => item.id !== id);
        localStorage.setItem('validades', JSON.stringify(novaLista));
        
        carregarValidades();
    }
}

/* ============================================================
   6. FUNÇÕES AUXILIARES E HISTÓRICO
   ============================================================ */
async function registrarHistorico(nome, validade, setor, qtd) {
    try {
        const usuario = JSON.parse(localStorage.getItem('cadastros'))?.nome || 'App Usuario';
        await historico(usuario, nome, qtd, 'un', 'validade', setor, `Vencimento em: ${validade}`, 0);
    } catch (e) { 
        console.warn("Erro ao registrar no Firebase Histórico."); 
    }
}

function gerarPDF() {
    const dados = JSON.parse(localStorage.getItem('validades')) || [];
    if (!dados.length) {
        alert('A lista está vazia.');
        return;
    }
    
    const conteudo = dados.map(v => `${v.nome} - Qtd: ${v.quantidade} - Vence: ${v.validade}`).join('\n');
    
    if (window.AppInventor) {
        // Comando especial para o App lidar com o PDF ou Impressão
        window.AppInventor.setWebViewString(`IMPRIMIR|0|0|${conteudo}`);
    } else {
        console.log("Conteúdo para PDF:\n", conteudo);
    }
}