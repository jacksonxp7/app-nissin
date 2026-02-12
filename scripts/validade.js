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
   3. ADICIONAR VALIDADE (BUSCANDO IMAGEM ANTES DE SALVAR)
============================================================ */
async function adicionarValidade() {
  const nomeInput = el('add_item_validade');
  const qtdInput = el('quantidade_itens_validade');
  const validadeInput = el('validade_item_add');

  const nomeOriginal = nomeInput?.value.trim();
  const quantidade = qtdInput?.value || 0;
  const validade = validadeInput?.value; 

  if (!nomeOriginal || !validade) {
    alert('Preencha nome e data!');
    return;
  }

  let imagemEncontrada = ""; 

  // --- BUSCA DA IMAGEM NO FIREBASE (AGUARDANDO RESULTADO) ---
  try {
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");
    const { db } = await import('./firebase.js');

    const categoriasSnap = await getDocs(collection(db, 'produtos'));
    
    // Percorre as coleções de marcas (ex: ajinomoto, nissin...)
    for (const categoriaDoc of categoriasSnap.docs) {
      const itensSnap = await getDocs(collection(db, 'produtos', categoriaDoc.id, 'itens'));
      
      // Procura o item que tem o nome IGUAL ao digitado no input
      const itemDoc = itensSnap.docs.find(d => d.data().nome === nomeOriginal);
      
      if (itemDoc) {
        imagemEncontrada = itemDoc.data().imagem || "";
        console.log("Imagem encontrada no Firebase:", imagemEncontrada);
        break; 
      }
    }
  } catch (err) {
    console.error("Erro ao buscar imagem no banco de dados:", err);
  }

  // Agora que já temos (ou não) a imagem, criamos o ID e o Registro
  const idUnico = Math.floor(Math.random() * 800000) + 100000;

  const registro = {
    id: idUnico,
    nome: sanitize(nomeOriginal),
    quantidade: quantidade,
    validade: validade,
    imagem: imagemEncontrada, // Aqui o link da imagem é salvo com certeza
    setor: 'Geral',
    criadoEm: hojeISO()
  };

  // Salva no LocalStorage do navegador/app
  const salvos = JSON.parse(localStorage.getItem('validades')) || [];
  salvos.push(registro);
  localStorage.setItem('validades', JSON.stringify(salvos));

  // --- DISPARAR AGENDAMENTO NATIVO ---
  if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
    agendarAvisosCapacitor(registro);
  }

  registrarHistorico(nomeOriginal, validade, 'Geral', quantidade);

  // Limpa campos
  nomeInput.value = '';
  qtdInput.value = '';
  validadeInput.value = '';
  
  carregarValidades();
}

/* ============================================================
   4. LÓGICA DE NOTIFICAÇÃO (CORRIGIDA PARA ANDROID COM IMAGEM)
============================================================ */
async function agendarAvisosCapacitor(item) {
  const { LocalNotifications } = window.Capacitor.Plugins;

  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') return;

  const dataVal = new Date(item.validade + 'T00:00:00');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const diffDiasTotal = Math.ceil((dataVal - hoje) / 86400000);

  // Define os anexos de imagem (se houver link)
  const anexos = item.imagem ? [{ id: 'img-' + item.id, url: item.imagem }] : [];

  // 1. Notificação Imediata (Confirmação)
  console.log(item.imagem)
  await LocalNotifications.schedule({
    notifications: [{
      title: "Produto Salvo!",
      body: `${item.nome} agendado24.`,
      id: item.id,
      attachments: anexos, // Imagem expandida
      schedule: { at: new Date(Date.now() + 1000) },
      android: { 
        importance: 'high', 
        smallIcon: 'ic_stat_name', 
        iconColor: '#00264d',
        largeIcon: item.imagem // Imagem lateral (thumbnail)
      }
    }]
  });

  // 2. Se já venceu ou vence hoje
  if (diffDiasTotal <= 0) {
    await LocalNotifications.schedule({
      notifications: [{
        title: "🚨 URGENTE: VENCIDO",
        body: `O produto ${item.nome} vence hoje! Retire agora.`,
        id: parseInt(`${item.id}99`),
        attachments: anexos,
        schedule: { at: new Date(Date.now() + 3000) },
        android: { importance: 'max', color: '#ff0000', largeIcon: item.imagem }
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

    if (dataAlvo6h > new Date()) {
      await LocalNotifications.schedule({
        notifications: [{
          title: "Validade Próxima",
          body: `${item.nome}: ${msg}`,
          id: parseInt(`${item.id}${i}1`),
          attachments: anexos,
          schedule: { at: dataAlvo6h },
          android: { importance: 'high', largeIcon: item.imagem }
        }]
      });
    }

    if (dataAlvo13h > new Date()) {
      await LocalNotifications.schedule({
        notifications: [{
          title: "Validade Próxima",
          body: `${item.nome}: ${msg}`,
          id: parseInt(`${item.id}${i}2`),
          attachments: anexos,
          schedule: { at: dataAlvo13h },
          android: { importance: 'high', largeIcon: item.imagem }
        }]
      });
    }
  }
}

/* ============================================================
   5. LISTAGEM (TABELA SEM IMAGEM)
============================================================ */
function carregarValidades() {
  const lista = el('tbody_vldd');
  if (!lista) return;

  const dados = JSON.parse(localStorage.getItem('validades')) || [];
  lista.innerHTML = '';
  dados.sort((a, b) => new Date(a.validade) - new Date(b.validade));

  dados.forEach((item) => {
    const dataVal = new Date(item.validade + 'T12:00:00');
    const dias = Math.ceil((dataVal - new Date().setHours(0,0,0,0)) / 86400000);
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
      <td class="resultado">${dias < 0 ? '---' : (dias / 30).toFixed(1)}</td>
      <td class="resultado" style="font-weight: bold;">
         ${dias < 0 ? 'RETIRAR' : dias + ' dias'}
      </td>
    `;
    lista.appendChild(tr);
  });
}

/* ============================================================
   6. REMOVER E CANCELAR NOTIFICAÇÕES
============================================================ */
async function removerValidade(id, nome) {
  if (confirm(`Excluir "${nome}"?`)) {
    if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
      const { LocalNotifications } = window.Capacitor.Plugins;
      const idsParaCancelar = [];
      for (let i = 0; i <= 7; i++) {
        idsParaCancelar.push({ id: parseInt(`${id}${i}1`) }, { id: parseInt(`${id}${i}2`) });
      }
      idsParaCancelar.push({ id: id }, { id: parseInt(`${id}99`) });
      await LocalNotifications.cancel({ notifications: idsParaCancelar });
    }

    const dados = JSON.parse(localStorage.getItem('validades')) || [];
    localStorage.setItem('validades', JSON.stringify(dados.filter(item => item.id !== id)));
    carregarValidades();
  }
}

/* ============================================================
   7. OUTRAS FUNÇÕES
============================================================ */
async function registrarHistorico(nome, validade, setor, qtd) {
  try {
    const usuario = JSON.parse(localStorage.getItem('cadastros'))?.nome || 'desconhecido';
    await historico(usuario, nome, qtd, 'un', 'validade', setor, `Vence: ${validade}`, 0);
  } catch (e) {}
}

function gerarPDF() {
  window.print();
}