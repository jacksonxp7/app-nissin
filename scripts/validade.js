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
  const validade = validadeInput?.value;

  if (!nomeOriginal || !validade) {
    alert('Preencha nome e data corretamente!');
    return;
  }

  let imagemEncontrada = "";

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
  } catch (err) { }

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

  agendarAvisosCapacitor(registro);

  const usuario = JSON.parse(localStorage.getItem('cadastros'))?.nome || 'desconhecido';
  await historico(usuario, nomeOriginal, quantidade, 'un', 'Validade', 'Geral', `Vencimento: ${validade}`, 0);

  nomeInput.value = ''; qtdInput.value = ''; validadeInput.value = '';
  toque('mario_coin_s');
  carregarValidades();
}

/* ============================================================
   4. LÓGICA DE NOTIFICAÇÃO (CAPACITOR)
============================================================ */
async function agendarAvisosCapacitor(item) {
  if (!window.Capacitor || !window.Capacitor.Plugins.LocalNotifications) return;

  const { LocalNotifications } = window.Capacitor.Plugins;
  const userCfg = getConfigs();

  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') return;

  const dataVal = new Date(item.validade + 'T00:00:00');
  const hoje = new Date();
  const diffDiasTotal = Math.ceil((dataVal - hoje) / 86400000);

  const limiteAviso = userCfg.diasAviso || 7;
  let notifications = [];

  for (let i = 0; i <= limiteAviso; i++) {
    const diasRestantes = diffDiasTotal - i;
    if (diasRestantes < 0) continue;

    userCfg.horarios.forEach((horaString, hIndex) => {
      const [h, m] = horaString.split(':');
      const dataAlvo = new Date();
      dataAlvo.setDate(dataAlvo.getDate() + i);
      dataAlvo.setHours(parseInt(h), parseInt(m), 0, 0);

      if (dataAlvo > new Date()) {
        notifications.push({
          title: "⚠️ Alerta de Validade",
          body: `${item.nome}: Vence em ${diasRestantes} dias (${item.quantidade} un)`,
          id: parseInt(`${item.id}${i}${hIndex}`),
          schedule: { at: dataAlvo },
          android: { importance: 'high', smallIcon: 'ic_stat_name', color: '#f39c12' }
        });
      }
    });
  }

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}

/* ============================================================
   5. LISTAGEM NA TABELA (INTERFACE)
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
    if (dias < 0) tr.style.backgroundColor = '#ffcccc';
    else if (dias <= 7) tr.style.backgroundColor = '#fff3cd';

    tr.ondblclick = () => removerValidade(item.id, item.nome);

    tr.innerHTML = `
      <td style="padding:10px;">${item.nome}</td>
      <td style="text-align:center;">${item.quantidade}</td>
      <td style="text-align:center;">${item.validade.split('-').reverse().join('/')}</td>
      <td style="text-align:center; font-weight:bold; color:${dias < 0 ? 'red' : 'inherit'}">
         ${dias < 0 ? 'VENCIDO' : dias + ' dias'}
      </td>
    `;
    lista.appendChild(tr);
  });
}

/* ============================================================
   6. REMOVER VALIDADE
============================================================ */
async function removerValidade(id, nome) {
  if (confirm(`Excluir "${nome}"?`)) {
    const dados = JSON.parse(localStorage.getItem('validades')) || [];
    localStorage.setItem('validades', JSON.stringify(dados.filter(item => item.id !== id)));
    toque('decide_s');
    carregarValidades();
  }
}

/* ============================================================
   7. GERAÇÃO DE PDF (SÓ VALIDADES + LOGO)
============================================================ */
function gerarPDF() {
  const dados = JSON.parse(localStorage.getItem('validades')) || [];
  if (dados.length === 0) {
    alert("Não há dados para exportar.");
    return;
  }

  // Ordena por data antes de gerar
  dados.sort((a, b) => new Date(a.validade) - new Date(b.validade));

  // Criamos o HTML do PDF manualmente para garantir que não pegue lixo da tela
  const containerPdf = document.createElement('div');
  containerPdf.style.padding = "30px";

  let linhasHtml = "";
  dados.forEach(item => {
    const dataFormatada = item.validade.split('-').reverse().join('/');
    linhasHtml += `
      <tr>
        <td style="border: 1px solid #ccc; padding: 8px;">${item.nome}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${item.quantidade}</td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${dataFormatada}</td>
      </tr>
    `;
  });

  containerPdf.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 3px solid #000; padding-bottom: 10px;">
      <img src="img/logo.png" style="width: 150px;" alt="Logo" />
      <div style="text-align: right;">
      <h1 style="margin: 0; color: #333;">Distribuidora Francisco Ikeda</h1>
        <h1 style="margin: 0; color: #333;">Relatório de Validades</h1>
        <p style="margin: 0;">Data de emissão: ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="border: 1px solid #ccc; padding: 10px; text-align: left;">Produto</th>
          <th style="border: 1px solid #ccc; padding: 10px; text-align: center;">Quantidade</th>
          <th style="border: 1px solid #ccc; padding: 10px; text-align: center;">Vencimento</th>
        </tr>
      </thead>
      <tbody>
        ${linhasHtml}
      </tbody>
    </table>
    <div style="margin-top: 20px; font-size: 10px; text-align: center; color: #777;">
      Documento gerado automaticamente pelo sistema de controle.
    </div>
  `;

  const opt = {
    margin: 10,
    filename: `Relatorio_Validades_${hojeISO()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // Gera e baixa o PDF
  html2pdf().set(opt).from(containerPdf).save();
}