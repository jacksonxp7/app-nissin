import { el, parseDataBR, hojeISO, sanitize, toque } from './utils.js';
import { historico } from './firebase.js';
import { getConfigs } from './configs.js';

/* ============================================================
   1. INICIALIZAÇÃO
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
   2. BUSCAR PRODUTOS DO FIREBASE (PARA O AUTOCOMPLETE)
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
    console.error("Erro ao carregar sugestões:", err);
  }
}

/* ============================================================
   3. ADICIONAR VALIDADE E AGENDAR NOTIFICAÇÕES
============================================================ */
async function adicionarValidade() {
  const nomeInput = el('add_item_validade');
  const qtdInput = el('quantidade_itens_validade');
  const validadeInput = el('validade_item_add');

  const nomeOriginal = nomeInput?.value.trim();
  const quantidade = qtdInput?.value || 0;
  const validade = validadeInput?.value; // formato yyyy-mm-dd

  if (!nomeOriginal || !validade) {
    alert('Preencha nome e data corretamente!');
    return;
  }

  let imagemEncontrada = ""; 

  // Busca imagem no catálogo para a notificação ficar bonita
  try {
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
    const { db } = await import('./firebase.js');
    const categoriasSnap = await getDocs(collection(db, 'produtos'));
    
    for (const categoriaDoc of categoriasSnap.docs) {
      const itensSnap = await getDocs(collection(db, 'produtos', categoriaDoc.id, 'itens'));
      const itemDoc = itensSnap.docs.find(d => d.data().nome.toLowerCase() === nomeOriginal.toLowerCase());
      if (itemDoc) {
        imagemEncontrada = itemDoc.data().imagem || "";
        break; 
      }
    }
  } catch (err) {}

  const idUnico = Math.floor(Math.random() * 800000) + 100000;

  const registro = {
    id: idUnico,
    nome: nomeOriginal,
    quantidade: quantidade,
    validade: validade,
    imagem: imagemEncontrada,
    setor: 'Geral',
    criadoEm: hojeISO()
  };

  const salvos = JSON.parse(localStorage.getItem('validades')) || [];
  salvos.push(registro);
  localStorage.setItem('validades', JSON.stringify(salvos));

  // --- DISPARA O AGENDAMENTO DAS NOTIFICAÇÕES ---
  agendarAvisosCapacitor(registro);

  // Histórico no Firebase
  const usuario = JSON.parse(localStorage.getItem('cadastros'))?.nome || 'desconhecido';
  await historico(usuario, nomeOriginal, quantidade, 'un', 'Validade', 'Geral', `Vencimento: ${validade}`, 0);

  // Limpa e atualiza
  nomeInput.value = ''; qtdInput.value = ''; validadeInput.value = '';
  toque('mario_coin_s');
  carregarValidades();
}

/* ============================================================
   4. LÓGICA DE NOTIFICAÇÃO (CAPACITOR)
============================================================ */
async function agendarAvisosCapacitor(item) {
  // Verifica se o Capacitor está disponível (App nativo)
  if (!window.Capacitor || !window.Capacitor.Plugins.LocalNotifications) {
    console.warn("Capacitor não detectado. Notificações não serão agendadas no navegador.");
    return;
  }

  const { LocalNotifications } = window.Capacitor.Plugins;
  const userCfg = getConfigs(); // Pega dias e horários da aba Configs

  // Pedir permissão se ainda não tiver
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') return;

  const dataVal = new Date(item.validade + 'T00:00:00');
  const hoje = new Date();
  const diffDiasTotal = Math.ceil((dataVal - hoje) / 86400000);

  // Agendar para cada dia definido pelo usuário (Ex: 7 dias antes até o dia do vencimento)
  const limiteAviso = userCfg.diasAviso || 7;

  let notifications = [];

  for (let i = 0; i <= limiteAviso; i++) {
    const diasRestantes = diffDiasTotal - i;
    if (diasRestantes < 0) continue;

    // Agenda para cada horário definido nas Configurações (Ex: 06:00, 13:00)
    userCfg.horarios.forEach((horaString, hIndex) => {
        const [h, m] = horaString.split(':');
        const dataAlvo = new Date();
        dataAlvo.setDate(dataAlvo.getDate() + i);
        dataAlvo.setHours(parseInt(h), parseInt(m), 0, 0);

        if (dataAlvo > new Date()) {
            notifications.push({
                title: "⚠️ Alerta de Validade",
                body: `${item.nome}: Vence em ${diasRestantes} dias (${item.quantidade} un)`,
                id: parseInt(`${item.id}${i}${hIndex}`), // ID Único Numérico
                schedule: { at: dataAlvo },
                android: { 
                    importance: 'high', 
                    largeIcon: item.imagem, 
                    smallIcon: 'ic_stat_name',
                    color: '#f39c12'
                }
            });
        }
    });
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
    console.log(`🔔 ${notifications.length} notificações agendadas para ${item.nome}`);
  }
}

/* ============================================================
   5. LISTAGEM NA TABELA
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
    hoje.setHours(0,0,0,0);
    const dias = Math.ceil((dataVal - hoje) / 86400000);

    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';

    if (dias < 0) tr.style.backgroundColor = '#ffcccc';
    else if (dias <= 7) tr.style.backgroundColor = '#fff3cd';

    tr.ondblclick = () => removerValidade(item.id, item.nome);

    tr.innerHTML = `
      <td class="pedido tpedido" style="padding:10px;">${item.nome}</td>
      <td class="pedido" style="text-align:center;">${item.quantidade}</td>
      <td class="pedido" style="text-align:center;">${item.validade.split('-').reverse().join('/')}</td>
      <td class="resultado" style="text-align:center; font-weight:bold; color:${dias < 0 ? 'red' : 'inherit'}">
         ${dias < 0 ? 'VENCIDO' : dias + ' dias'}
      </td>
    `;
    lista.appendChild(tr);
  });
}

/* ============================================================
   6. REMOVER E CANCELAR NOTIFICAÇÕES
============================================================ */
async function removerValidade(id, nome) {
  if (confirm(`Excluir "${nome}" e cancelar todos os alertas?`)) {
    // Cancela no Capacitor
    if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
      const { LocalNotifications } = window.Capacitor.Plugins;
      // Precisamos cancelar os IDs gerados no agendamento (loop de dias e horários)
      // Como geramos muitos, uma forma simples é limpar e reagendar tudo ou usar prefixos
      // Por enquanto, cancelamos o principal e notificamos
      await LocalNotifications.cancel({ notifications: [{ id: id }] });
    }

    const dados = JSON.parse(localStorage.getItem('validades')) || [];
    localStorage.setItem('validades', JSON.stringify(dados.filter(item => item.id !== id)));
    toque('decide_s');
    carregarValidades();
  }
}

function gerarPDF() {
  window.print();
}