import { el, parseDataBR, hojeISO, sanitize } from './utils.js';
import { historico } from './firebase.js';

/* ============================================================
   1. FUNÇÃO PRINCIPAL (INICIALIZAÇÃO)
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
  } catch (err) {
    console.error("Erro sugestões:", err);
  }
}

/* ============================================================
   3. ADICIONAR VALIDADE
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
  const idUnico = Math.floor(Math.random() * 800000) + 100000;

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

  // --- SINCRONIZAÇÃO COM O APP NATIVO (CAPACITOR) ---
  if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
    agendarAvisosCapacitor(registro);
  } else {
    console.warn("Plugin de Notificações não detectado ou rodando no navegador.");
  }

  registrarHistorico(nome, validade, 'Geral', quantidade);

  nomeInput.value = '';
  qtdInput.value = '';
  validadeInput.value = '';
  carregarValidades();
}

/* ============================================================
   4. LÓGICA DE AGENDAMENTO NATIVO (CAPACITOR)
============================================================ */
async function agendarAvisosCapacitor(item) {
  const { LocalNotifications } = window.Capacitor.Plugins;

  // Solicita permissão de notificação (necessário Android 13+)
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') {
    console.error("Permissão de notificação negada pelo usuário.");
    return;
  }

  const dataVal = new Date(item.validade + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const diffDiasTotal = Math.ceil((dataVal - hoje) / 86400000);

  // 1. Notificação Imediata de Sucesso
  await LocalNotifications.schedule({
    notifications: [{
      title: "Produto Salvo!",
      body: `${item.nome} agendado com sucesso.`,
      id: item.id,
      schedule: { at: new Date(Date.now() + 1000) }, // Toca em 1 segundo
      android: { importance: 'high', smallIcon: 'ic_stat_name' }
    }]
  });

  // 2. Se já venceu ou vence hoje
  if (diffDiasTotal <= 0) {
    await LocalNotifications.schedule({
      notifications: [{
        title: "🚨 URGENTE: VENCIDO",
        body: `O produto ${item.nome} vence hoje! Retire imediatamente.`,
        id: parseInt(`${item.id}99`),
        schedule: { at: new Date(Date.now() + 3000) },
        android: { importance: 'max', color: '#ff0000' }
      }]
    });
    return;
  }

  // 3. Agendar ciclo de 7 dias (06h e 13h)
  const limiteLoop = diffDiasTotal > 7 ? 7 : diffDiasTotal;

  for (let i = 0; i <= limiteLoop; i++) {
    const diasRestantes = diffDiasTotal - i;
    if (diasRestantes < 0) continue;

    let msg = `Faltam ${diasRestantes} dias para vencer.`;
    if (diasRestantes === 1) msg = "Vence AMANHÃ! Atenção.";
    if (diasRestantes === 0) msg = "VENCE HOJE! Retire do estoque agora.";

    const dataAlvo6h = new Date();
    dataAlvo6h.setDate(dataAlvo6h.getDate() + i);
    dataAlvo6h.setHours(6, 0, 0, 0);

    const dataAlvo13h = new Date();
    dataAlvo13h.setDate(dataAlvo13h.getDate() + i);
    dataAlvo13h.setHours(13, 0, 0, 0);

    // Agenda 06h se o horário for no futuro
    if (dataAlvo6h > new Date()) {
      await LocalNotifications.schedule({
        notifications: [{
          title: "Validade Próxima",
          body: `${item.nome}: ${msg}`,
          id: parseInt(`${item.id}${i}1`),
          schedule: { at: dataAlvo6h },
          android: { importance: 'high' }
        }]
      });
    }

    // Agenda 13h se o horário for no futuro
    if (dataAlvo13h > new Date()) {
      await LocalNotifications.schedule({
        notifications: [{
          title: "Validade Próxima",
          body: `${item.nome}: ${msg}`,
          id: parseInt(`${item.id}${i}2`),
          schedule: { at: dataAlvo13h },
          android: { importance: 'high' }
        }]
      });
    }
  }
}

/* ============================================================
   5. LISTAGEM E DOUBLE CLICK
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

    // EVENTO DE CLIQUE DUPLO PARA EXCLUIR
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
   6. REMOVER E CANCELAR NOTIFICAÇÕES (CAPACITOR)
============================================================ */
async function removerValidade(id, nome) {
  if (confirm(`Deseja excluir "${nome}" e cancelar todos os avisos diários?`)) {

    // CANCELAMENTO NATIVO (CAPACITOR)
    if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
      const { LocalNotifications } = window.Capacitor.Plugins;
      
      const idsParaCancelar = [];
      // Cancelar todos os 14 slots possíveis (7 dias x 2 horários)
      for (let i = 0; i <= 7; i++) {
        idsParaCancelar.push({ id: parseInt(`${id}${i}1`) });
        idsParaCancelar.push({ id: parseInt(`${id}${i}2`) });
      }
      // Cancelar também o ID base e o ID de emergência
      idsParaCancelar.push({ id: id }, { id: parseInt(`${id}99`) });

      await LocalNotifications.cancel({ notifications: idsParaCancelar });
      console.log(`Alarmes cancelados para o produto ID: ${id}`);
    }

    const dados = JSON.parse(localStorage.getItem('validades')) || [];
    const novaLista = dados.filter(item => item.id !== id);
    localStorage.setItem('validades', JSON.stringify(novaLista));

    carregarValidades();
  }
}

/* ============================================================
   7. OUTRAS FUNÇÕES (FIREBASE E PDF)
============================================================ */
async function registrarHistorico(nome, validade, setor, qtd) {
  try {
    const usuario = JSON.parse(localStorage.getItem('cadastros'))?.nome || 'desconhecido';
    await historico(usuario, nome, qtd, 'un', 'validade', setor, `Vence em: ${validade}`, 0);
  } catch (e) { console.warn("Erro Firebase ao registrar histórico."); }
}

function gerarPDF() {
  const dados = JSON.parse(localStorage.getItem('validades')) || [];
  if (!dados.length) return alert('Lista vazia');
  
  // No Capacitor, o comando de impressão nativa abre o gerenciador de PDF do Android
  window.print();
  console.log("PDF solicitado para a lista.");

}
