import { el, parseDataBR, hojeISO, sanitize } from './utils.js';
import { historico } from './firebase.js';

/* ============================================================
   FUNÇÃO PRINCIPAL
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
   BUSCAR PRODUTOS DO FIREBASE
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
  } catch (err) {
    console.error("Erro sugestões:", err);
  }
}

/* ============================================================
   ADICIONAR VALIDADE
============================================================ */
function adicionarValidade() {
  const nomeInput = el('add_item_validade');
  const qtdInput = el('quantidade_itens_validade');
  const validadeInput = el('validade_item_add');

  const nome = nomeInput?.value.trim();
  const quantidade = qtdInput?.value || 0;
  const validade = validadeInput?.value; // formato yyyy-mm-dd

  if (!nome || !validade) {
    alert('Preencha nome e data!');
    return;
  }

  // Geramos um ID de 6 dígitos para evitar erros de limite numérico no Android
  const idUnico = Math.floor(Math.random() * 900000) + 100000;

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

  // --- SINCRONIZAÇÃO COM O APP (NOTIFICAÇÕES) ---
  if (window.AppInventor) {
    // 1. Notificação Imediata de Sucesso (Usando AVISO_IMEDIATO para seus blocos lerem)
    // Formato: TIPO|ID|NOME|MSG|DELAY|TITULO
    window.AppInventor.setWebViewString(`AVISO_IMEDIATO|${idUnico}|${nome}|Produto adicionado com sucesso!|1|Sucesso`);
    
    // 2. Agendar a inteligência dos avisos diários de 7 dias
    agendarAvisosNoApp(registro);
  }

  registrarHistorico(nome, validade, 'Geral', quantidade);
  
  nomeInput.value = '';
  qtdInput.value = '';
  validadeInput.value = '';
  carregarValidades();
}

/* ============================================================
   LÓGICA DE AGENDAMENTO (JS)
============================================================ */
function agendarAvisosNoApp(item) {
  if (!window.AppInventor) return;

  const dataVal = new Date(item.validade + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const diffDiasTotal = Math.ceil((dataVal - hoje) / 86400000);

  // Se já venceu ou vence hoje
  if (diffDiasTotal <= 0) {
    window.AppInventor.setWebViewString(`AVISO_IMEDIATO|${item.id}00|${item.nome}|VENCE HOJE! RETIRAR IMEDIATAMENTE|1|URGENTE`);
    return;
  }

  // Agendamos para os últimos 7 dias. i = dia relativo a partir de hoje.
  const limiteLoop = diffDiasTotal > 7 ? 7 : diffDiasTotal;

  for (let i = 0; i <= limiteLoop; i++) {
    const diasRestantes = diffDiasTotal - i;
    if (diasRestantes < 0) continue;

    let msg = `Faltam apenas ${diasRestantes} dias para vencer!`;
    let titulo = "Validade Próxima";

    if (diasRestantes === 1) msg = "Vence AMANHÃ! Atenção.";
    if (diasRestantes === 0) {
      msg = "VENCE HOJE! Retire do estoque agora.";
      titulo = "VENCIMENTO HOJE";
    }

    // Horários: 6h da manhã e 13h da tarde
    const delay6h = calcularMinutos(i, 6);
    const delay13h = calcularMinutos(i, 13);

    // Envia comandos individuais (TIPO|ID|NOME|MSG|DELAY|TITULO)
    // ID gerado bate com seu loop de cancelamento: ID + dia + slot
    if (delay6h > 0) {
      window.AppInventor.setWebViewString(`AGENDAR|${item.id}${i}1|${item.nome}|${msg}|${delay6h}|${titulo}`);
    }
    if (delay13h > 0) {
      window.AppInventor.setWebViewString(`AGENDAR|${item.id}${i}2|${item.nome}|${msg}|${delay13h}|${titulo}`);
    }
  }
}

function calcularMinutos(diasAdicionais, horaAlvo) {
  const agora = new Date();
  const alvo = new Date();
  alvo.setDate(alvo.getDate() + diasAdicionais);
  alvo.setHours(horaAlvo, 0, 0, 0);
  const diff = alvo - agora;
  return Math.floor(diff / 60000);
}

/* ============================================================
   LISTAGEM E DOUBLE CLICK
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

    const diffMilis = dataVal - hoje;
    const dias = Math.ceil(diffMilis / 86400000);
    const meses = (dias / 30).toFixed(1);

    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';

    if (dias < 0) tr.style.backgroundColor = '#ffcccc';
    else if (dias <= 7) tr.style.backgroundColor = '#fff3cd';

    tr.ondblclick = () => removerValidade(item.id, item.nome);

    tr.innerHTML = `
      <td class="pedido tpedido">${item.nome}</td>
      <td class="pedido">${item.quantidade}</td>
      <td class="pedido">${item.validade.split('-').reverse().join('/')}</td>
      <td class="resultado">${dias < 0 ? 'Vencido' : dias}</td>
      <td class="resultado">${dias < 0 ? '---' : meses}</td>
      <td class="resultado" style="font-weight: bold;">
         ${dias < 0 ? 'RETIRAR' : dias + ' dias'}
      </td>
    `;
    lista.appendChild(tr);
  });
}

/* ============================================================
   REMOVER E CANCELAR ALARME NO MIT
============================================================ */
function removerValidade(id, nome) {
  if (confirm(`Deseja excluir "${nome}" e cancelar os avisos?`)) {
    
    if (window.AppInventor) {
      // 1. Notificação Imediata de Exclusão
      window.AppInventor.setWebViewString(`AVISO_IMEDIATO|999|${nome}|Item removido e alarmes cancelados.|1|Excluído`);

      // 2. Comando para o loop de cancelamento do MIT App Inventor
      window.AppInventor.setWebViewString(`CANCELAR_PRODUTO|${id}`);
    }

    const dados = JSON.parse(localStorage.getItem('validades')) || [];
    const novaLista = dados.filter(item => item.id !== id);
    localStorage.setItem('validades', JSON.stringify(novaLista));
    
    carregarValidades();
  }
}

/* ============================================================
   OUTRAS FUNÇÕES (FIREBASE E PDF)
============================================================ */
async function registrarHistorico(nome, validade, setor, qtd) {
  try {
    const usuario = JSON.parse(localStorage.getItem('cadastros'))?.nome || 'desconhecido';
    await historico(usuario, nome, qtd, 'un', 'validade', setor, `Vence em: ${validade}`, 0);
  } catch (e) { console.warn("Erro Firebase"); }
}

function gerarPDF() {
  const dados = JSON.parse(localStorage.getItem('validades')) || [];
  if (!dados.length) return alert('Lista vazia');
  const texto = dados.map(v => `${v.nome} | Val: ${v.validade}`).join('\n');
  if (window.AppInventor) window.AppInventor.setWebViewString(`IMPRIMIR|0|0|${texto}`);
  else console.log(texto);
}