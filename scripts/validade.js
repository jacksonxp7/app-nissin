import { el, parseDataBR, hojeISO, sanitize } from './utils.js';
import { historico } from './firebase.js';
import { getConfigs } from './configs.js'; // Importe no topo

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
    console.error("Erro ao carregar sugestões do Firebase:", err);
  }
}

/* ============================================================
   3. ADICIONAR VALIDADE (BUSCANDO IMAGEM E SALVANDO)
============================================================ */
async function adicionarValidade() {
  const nomeInput = el('add_item_validade');
  const qtdInput = el('quantidade_itens_validade');
  const validadeInput = el('validade_item_add');

  const nomeOriginal = nomeInput?.value.trim();
  const quantidade = qtdInput?.value || 0;
  const validade = validadeInput?.value; // formato yyyy-mm-dd

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
    
    // Percorre as coleções de marcas para achar a imagem do produto específico
    for (const categoriaDoc of categoriasSnap.docs) {
      const itensSnap = await getDocs(collection(db, 'produtos', categoriaDoc.id, 'itens'));
      const itemDoc = itensSnap.docs.find(d => d.data().nome === nomeOriginal);
      
      if (itemDoc) {
        imagemEncontrada = itemDoc.data().imagem || "";
        console.log("Imagem encontrada para a notificação:", imagemEncontrada);
        break; 
      }
    }
  } catch (err) {
    console.error("Erro ao buscar imagem no banco de dados:", err);
  }

  // Geramos um ID numérico único
  const idUnico = Math.floor(Math.random() * 800000) + 100000;

  const registro = {
    id: idUnico,
    nome: sanitize(nomeOriginal),
    quantidade: quantidade,
    validade: validade,
    imagem: imagemEncontrada, // Salva o link da imagem no localStorage
    setor: 'Geral',
    criadoEm: hojeISO()
  };

  // Salva no LocalStorage
  const salvos = JSON.parse(localStorage.getItem('validades')) || [];
  salvos.push(registro);
  localStorage.setItem('validades', JSON.stringify(salvos));

  // --- SINCRONIZAÇÃO COM O APP NATIVO (CAPACITOR) ---
  if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
    agendarAvisosCapacitor(registro);
  }

  // --- SALVANDO NO HISTÓRICO DO FIREBASE (COM LINK DA IMAGEM) ---
  registrarHistorico(nomeOriginal, validade, 'Geral', quantidade, imagemEncontrada);

  // Limpa campos da tela
  nomeInput.value = '';
  qtdInput.value = '';
  validadeInput.value = '';
  
  carregarValidades();
}

/* ============================================================
   4. LÓGICA DE NOTIFICAÇÃO (CORRIGIDA COM IMAGEM)
============================================================ */
async function agendarAvisosCapacitor(item) {
  const userCfg = getConfigs(); // Pega o que o usuário definiu na aba Configs
  const { LocalNotifications } = window.Capacitor.Plugins;

  const dataVal = new Date(item.validade + 'T00:00:00');
  const hoje = new Date();
  const diffDiasTotal = Math.ceil((dataVal - hoje) / 86400000);

  // Usa o valor da aba Configs ou o padrão 7
  const limiteLoop = diffDiasTotal > userCfg.diasAviso ? userCfg.diasAviso : diffDiasTotal;

  for (let i = 0; i <= limiteLoop; i++) {
    const diasRestantes = diffDiasTotal - i;
    if (diasRestantes < 0) continue;

    // Loop pelos horários dinâmicos (Ex: 06:00, 13:00, 18:00)
    userCfg.horarios.forEach(async (horaString, index) => {
        const [h, m] = horaString.split(':');
        const dataAlvo = new Date();
        dataAlvo.setDate(dataAlvo.getDate() + i);
        dataAlvo.setHours(h, m, 0, 0);

        if (dataAlvo > new Date()) {
            await LocalNotifications.schedule({
                notifications: [{
                    title: "Alerta IKEDA",
                    body: `${item.nome}: Faltam ${diasRestantes} dias.`,
                    id: parseInt(`${item.id}${i}${index}`),
                    schedule: { at: dataAlvo },
                    android: { importance: 'high', largeIcon: item.imagem, smallIcon: 'ic_stat_name' }
                }]
            });
        }
    });
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
   6. REMOVER ITEM E CANCELAR NOTIFICAÇÕES
============================================================ */
async function removerValidade(id, nome) {
  if (confirm(`Deseja excluir "${nome}" e cancelar todos os avisos?`)) {
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
   7. OUTRAS FUNÇÕES (FIREBASE E PDF)
============================================================ */
async function registrarHistorico(nome, validade, setor, qtd, imagemLink) {
  try {
    const usuario = JSON.parse(localStorage.getItem('cadastros'))?.nome || 'desconhecido';
    // Repassa a imagemLink para a função de histórico do seu arquivo firebase.js
    await historico(usuario, nome, qtd, 'un', 'validade', setor, `Vence em: ${validade}`, 0, imagemLink);
  } catch (e) {
    console.warn("Erro ao registrar histórico com imagem.");
  }
}

function gerarPDF() {
  window.print();
}