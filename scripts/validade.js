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

  const registro = {
    nome: sanitize(nome),
    quantidade: quantidade,
    validade: validade,
    setor: 'Geral',
    criadoEm: hojeISO()
  };

  const salvos = JSON.parse(localStorage.getItem('validades')) || [];
  const index = salvos.length; // Usaremos o index como ID único
  salvos.push(registro);
  localStorage.setItem('validades', JSON.stringify(salvos));

  // --- NOTIFICAÇÃO PARA O APP ---
  if (window.AppInventor) {
    // 1. Notificação Imediata de Confirmação
    // Formato: SALVO | NOME | VALIDADE
    window.AppInventor.setWebViewString(`SALVO|${nome}|${validade.split('-').reverse().join('/')}`);

    // 2. Agendar o aviso de 7 dias antes
    const dataVal = new Date(validade + 'T12:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diasFaltam = Math.ceil((dataVal - hoje) / 86400000);

    // Se faltar mais de 7 dias, calculamos o delay para avisar exatamente quando faltarem 7
    // Se faltar menos de 7, avisamos em 24h (1440 min)
    let delayMinutos = 1440; 
    if (diasFaltam > 7) {
        delayMinutos = (diasFaltam - 7) * 1440;
    }

    // Envia comando para agendar (Tipo|ID|Nome|Dias|Delay)
    window.AppInventor.setWebViewString(`AGENDAR|${index}|${nome}|${diasFaltam}|${delayMinutos}`);
  }

  registrarHistorico(nome, validade, 'Geral', quantidade);
  
  nomeInput.value = '';
  qtdInput.value = '';
  validadeInput.value = '';
  carregarValidades();
}

/* ==============================
   LISTAGEM E DOUBLE CLICK
============================== */
function carregarValidades() {
  const lista = el('tbody_vldd'); 
  if (!lista) return;

  const dados = JSON.parse(localStorage.getItem('validades')) || [];
  lista.innerHTML = '';

  // Ordenação por data
  dados.sort((a, b) => new Date(a.validade) - new Date(b.validade));

  dados.forEach((item, index) => {
    const dataVal = new Date(item.validade + 'T12:00:00'); 
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const diffMilis = dataVal - hoje;
    const dias = Math.ceil(diffMilis / 86400000);
    const meses = (dias / 30).toFixed(1);

    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';

    if (dias < 0) tr.style.backgroundColor = '#ffcccc';
    else if (dias <= 15) tr.style.backgroundColor = '#fff3cd';

    // EVENTO DE CLIQUE DUPLO PARA EXCLUIR
    tr.ondblclick = () => removerValidade(index);

    tr.innerHTML = `
      <td class="pedido tpedido">${item.nome}</td>
      <td class="pedido">${item.quantidade}</td>
      <td class="pedido">${item.validade.split('-').reverse().join('/')}</td>
      <td class="resultado">${dias < 0 ? 'Vencido' : dias}</td>
      <td class="resultado">${dias < 0 ? '---' : meses}</td>
      <td class="resultado" style="font-weight: bold;">
         ${dias < 0 ? 'Vencido' : dias + ' dias'}
      </td>
    `;
    lista.appendChild(tr);
  });

  // Atualiza os alarmes no MIT App Inventor
  sincronizarNotificacoesValidade(dados);
}

/* ==============================
   REMOVER E CANCELAR ALARME NO MIT
============================== */
function removerValidade(index) {
  if (confirm("Deseja excluir este item e cancelar os avisos?")) {
    
    // 📢 COMANDO PARA O MIT APP INVENTOR CANCELAR OS ALARMES
    if (window.AppInventor) {
      // Envia "CANCELAR|ID" (O ID aqui é o index)
      window.AppInventor.setWebViewString(`CANCELAR|${index}`);
    }

    const dados = JSON.parse(localStorage.getItem('validades')) || [];
    dados.splice(index, 1);
    localStorage.setItem('validades', JSON.stringify(dados));
    
    carregarValidades();
  }
}

/* ==============================
   SINCRONIZAR COM BLOCOS DO MIT
============================== */
function sincronizarNotificacoesValidade(dados) {
  if (!window.AppInventor) return;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  dados.forEach((item, index) => {
    const dataVal = new Date(item.validade + 'T12:00:00');
    const dias = Math.ceil((dataVal - hoje) / 86400000);

    // O delay pode ser ajustado. Ex: 1440 min = 24 horas.
    const delay = 1440; 

    if (dias < 0) {
      // Se já venceu, cancela qualquer alarme agendado
      window.AppInventor.setWebViewString(`CANCELAR|${index}`);
    } else if (dias <= 30) {
      // Conforme seus blocos: 1:TIPO | 2:ID | 3:NOME | 4:DIAS | 5:DELAY
      window.AppInventor.setWebViewString(`AGENDAR|${index}|${item.nome}|${dias}|${delay}`);
    }
  });
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
  if (window.AppInventor) window.AppInventor.setWebViewString(`validades:${texto}`);
  else console.log(texto);
}