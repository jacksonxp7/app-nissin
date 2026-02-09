import { el, parseDataBR, hojeISO, sanitize } from './utils.js';
import { historico } from './firebase.js';

/* ==============================
   FUNÇÃO PRINCIPAL
============================== */
export function validadesfunc() {
  const btnAdd = el('buttonadd_vldd');
  const btnPrint = el('imprimir_pdf'); 

  if (btnAdd) btnAdd.onclick = adicionarValidade;
  if (btnPrint) btnPrint.onclick = gerarPDF;

  carregarSugestoesParaValidade();
  carregarValidades();
}

/* ==============================
   BUSCAR PRODUTOS DO FIREBASE
============================== */
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

/* ==============================
   ADICIONAR VALIDADE
============================== */
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

  // Criamos um ID numérico baseado no tempo para garantir que seja único e fixo
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

  // --- SINCRONIZAÇÃO COM O APP (NOTIFICAÇÕES) ---
  if (window.AppInventor) {
    // 1. Notificação de confirmação imediata no App
    window.AppInventor.setWebViewString(`SALVO|${idUnico}|${nome}|Produto salvo com sucesso!`);
    
    // 2. Agendar a inteligência dos avisos diários
    agendarAvisosNoApp(registro);
  }

  registrarHistorico(nome, validade, 'Geral', quantidade);
  
  nomeInput.value = '';
  qtdInput.value = '';
  validadeInput.value = '';
  carregarValidades();
}

/* ==============================
   LÓGICA DE AGENDAMENTO (JS)
============================== */
function agendarAvisosNoApp(item) {
  if (!window.AppInventor) return;

  const dataVal = new Date(item.validade + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Diferença total de dias do dia atual até o vencimento
  const diffDiasTotal = Math.ceil((dataVal - hoje) / 86400000);

  // Se já venceu ou vence hoje
  if (diffDiasTotal <= 0) {
    window.AppInventor.setWebViewString(`AVISO_IMEDIATO|${item.id}|${item.nome}|VENCE HOJE! RETIRAR IMEDIATAMENTE|1|URGENTE`);
    return;
  }

  // Agendamos para os últimos 7 dias. Se faltar mais de 7, o loop começa apenas quando faltarem 7.
  // i representa "quantos dias a partir de hoje" o alarme vai tocar
  for (let i = 0; i <= diffDiasTotal; i++) {
    const diasRestantesNoMomentoDoAlarme = diffDiasTotal - i;

    // Só agendamos se estiver dentro da janela de 7 dias para o vencimento
    if (diasRestantesNoMomentoDoAlarme <= 7) {
      let msg = `Faltam apenas ${diasRestantesNoMomentoDoAlarme} dias para vencer!`;
      let titulo = "Validade Próxima";

      if (diasRestantesNoMomentoDoAlarme === 1) msg = "Vence AMANHÃ! Atenção.";
      if (diasRestantesNoMomentoDoAlarme === 0) {
        msg = "VENCE HOJE! Retire do estoque agora.";
        titulo = "VENCIMENTO HOJE";
      }

      // Calcula delay para 6h e 13h do dia "hoje + i"
      const delay6h = calcularMinutos(i, 6);
      const delay13h = calcularMinutos(i, 17);

      // Enviamos para os blocos (AGENDAR | ID_COMPOSTO | NOME | MSG_DINAMICA | DELAY | TITULO)
      // O ID aqui é: ID_PRODUTO + DIA + SLOT (1 para 6h, 2 para 13h)
      if (delay6h > 0) {
        window.AppInventor.setWebViewString(`AGENDAR|${item.id}${i}1|${item.nome}|${msg}|${delay6h}|${titulo}`);
      }
      if (delay13h > 0) {
        window.AppInventor.setWebViewString(`AGENDAR|${item.id}${i}2|${item.nome}|${msg}|${delay13h}|${titulo}`);
      }
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

/* ==============================
   LISTAGEM E DOUBLE CLICK
============================== */
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

    tr.ondblclick = () => removerValidade(item.id);

    tr.innerHTML = `
      <td class="pedido tpedido">${item.nome}</td>
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

/* ==============================
   REMOVER E CANCELAR ALARME NO MIT
============================== */
function removerValidade(id) {
  if (confirm("Deseja excluir este item e cancelar todos os avisos diários?")) {
    
    if (window.AppInventor) {
      // Envia "CANCELAR_PRODUTO|ID" para os blocos fazerem o loop de cancelamento
      window.AppInventor.setWebViewString(`CANCELAR_PRODUTO|${id}`);
    }

    const dados = JSON.parse(localStorage.getItem('validades')) || [];
    const novaLista = dados.filter(item => item.id !== id);
    localStorage.setItem('validades', JSON.stringify(novaLista));
    
    carregarValidades();
  }
}

/* ==============================
   OUTRAS FUNÇÕES
============================== */
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