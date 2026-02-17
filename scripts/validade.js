import { el, hojeISO, toque } from './utils.js';
import { db, historico } from './firebase.js'; // Importando db e historico do seu firebase.js
import { getConfigs } from './configs.js';
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

/* ============================================================
   1. ACESSO AOS PLUGINS NATIVOS
============================================================ */
const Plugins = window.Capacitor?.Plugins;
const Filesystem = Plugins?.Filesystem;
const FileOpener = Plugins?.FileOpener;
const LocalNotifications = Plugins?.LocalNotifications;

/* ============================================================
   2. INICIALIZAÇÃO
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
   3. BUSCAR PRODUTOS DO FIREBASE (PARA AUTOCOMPLETE)
============================================================ */
async function carregarSugestoesParaValidade() {
  const datalist = el('lista-itens');
  if (!datalist) return;

  try {
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
   4. ADICIONAR VALIDADE (SINCRONIZADO COM O USUÁRIO)
============================================================ */
async function adicionarValidade() {
  const nomeInput = el('add_item_validade');
  const qtdInput = el('quantidade_itens_validade');
  const validadeInput = el('validade_item_add');
  const userLogado = JSON.parse(localStorage.getItem('cadastros'));

  if (!userLogado) {
    alert("Você precisa estar logado para agendar validades!");
    return;
  }

  const nomeOriginal = nomeInput?.value.trim();
  const quantidade = qtdInput?.value || 0;
  const validade = validadeInput?.value;

  if (!nomeOriginal || !validade) {
    alert('Preencha nome e data corretamente!');
    return;
  }

  el('buttonadd_vldd').innerText = "SALVANDO...";
  el('buttonadd_vldd').disabled = true;

  let imagemEncontrada = "";
  try {
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

  try {
    // 1. Salva no LocalStorage (Para visualização imediata)
    const salvos = JSON.parse(localStorage.getItem('validades')) || [];
    salvos.push(registro);
    localStorage.setItem('validades', JSON.stringify(salvos));

    // 2. SALVA NO FIREBASE (Na subcoleção do usuário logado)
    await setDoc(doc(db, "usuarios", userLogado.nome, "validades", String(idUnico)), registro);

    // 3. Agenda Notificação Local
    agendarAvisosCapacitor(registro);

    // 4. Histórico Geral
    await historico(userLogado.nome, nomeOriginal, quantidade, 'un', 'Validade', 'Geral', `Vencimento: ${validade}`, 0);

    // Limpa campos e atualiza tela
    nomeInput.value = ''; qtdInput.value = ''; validadeInput.value = '';
    toque('mario_coin_s');
    carregarValidades();
    alert("Validade agendada e salva na sua conta!");

  } catch (error) {
    alert("Erro ao salvar validade na nuvem: " + error.message);
  } finally {
    el('buttonadd_vldd').innerText = "AGENDAR";
    el('buttonadd_vldd').disabled = false;
  }
}

/* ============================================================
   5. LÓGICA DE NOTIFICAÇÃO (CAPACITOR)
============================================================ */
async function agendarAvisosCapacitor(item) {
  if (!LocalNotifications) return;

  const userCfg = getConfigs();
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') return;

  const dataVal = new Date(item.validade + 'T00:00:00');
  const hoje = new Date();
  const diffDiasTotal = Math.ceil((dataVal - hoje) / 86400000);
  const limiteAviso = userCfg.diasAviso || 7;
  let notifications = [];

  userCfg.horarios.forEach((horaString, hIndex) => {
    const [h, m] = horaString.split(':');
    
    for (let i = 0; i <= limiteAviso; i++) {
      const diasRestantes = diffDiasTotal - i;
      if (diasRestantes < 0) continue;

      const dataAlvo = new Date();
      dataAlvo.setDate(dataAlvo.getDate() + i);
      dataAlvo.setHours(parseInt(h), parseInt(m), 0, 0);

      if (dataAlvo > new Date()) {
        notifications.push({
          title: "⚠️ Alerta de Validade",
          body: `${item.nome}: Vence em ${diasRestantes} dias`,
          id: parseInt(`${item.id}${i}${hIndex}`),
          schedule: { at: dataAlvo },
          android: { importance: 'high', smallIcon: 'ic_stat_name', color: '#f39c12' }
        });
      }
    }
  });

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
}

/* ============================================================
   6. LISTAGEM NA TABELA
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

async function removerValidade(id, nome) {
  const userLogado = JSON.parse(localStorage.getItem('cadastros'));
  
  if (confirm(`Excluir "${nome}" de sua conta permanente?`)) {
    try {
      // 1. Remove do LocalStorage
      const dados = JSON.parse(localStorage.getItem('validades')) || [];
      localStorage.setItem('validades', JSON.stringify(dados.filter(item => item.id !== id)));

      // 2. REMOVE DO FIREBASE (Nuvem do usuário)
      if (userLogado) {
        await deleteDoc(doc(db, "usuarios", userLogado.nome, "validades", String(id)));
      }

      toque('decide_s');
      carregarValidades();
    } catch (e) {
      alert("Erro ao excluir da nuvem: " + e.message);
    }
  }
}

/* ============================================================
   7. GERAÇÃO DE PDF
============================================================ */
async function gerarPDF() {
  if (typeof html2pdf === 'undefined') {
    alert("Biblioteca de PDF não encontrada.");
    return;
  }

  const dados = JSON.parse(localStorage.getItem('validades')) || [];
  if (dados.length === 0) {
    alert("Sem dados para exportar.");
    return;
  }

  const btn = el('imprimir_pdf');
  const originalTexto = btn.innerText;
  btn.innerText = "Gerando...";
  btn.disabled = true;

  try {
    const containerPdf = document.createElement('div');
    containerPdf.style.padding = "20px";
    containerPdf.style.backgroundColor = "#fff";

    let linhas = "";
    dados.sort((a, b) => new Date(a.validade) - new Date(b.validade)).forEach(item => {
      linhas += `
        <tr>
          <td style="border:1px solid #ccc; padding:8px;">${item.nome}</td>
          <td style="border:1px solid #ccc; padding:8px; text-align:center;">${item.quantidade}</td>
          <td style="border:1px solid #ccc; padding:8px; text-align:center;">${item.validade.split('-').reverse().join('/')}</td>
        </tr>`;
    });

    containerPdf.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:20px;">
        <img src="img/logo.png" style="width:100px; height:auto;" />
        <div style="text-align:right;">
          <h2 style="margin:0;">Distribuidora Francisco Ikeda</h2>
          <h3 style="margin:0;">Relatório de Validades</h3>
          <p style="margin:0; font-size:12px;">Emissão: ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>
      <table style="width:100%; border-collapse:collapse;">
        <thead><tr style="background:#f2f2f2;">
          <th style="border:1px solid #ccc; padding:8px;">Produto</th>
          <th style="border:1px solid #ccc; padding:8px;">Qtd</th>
          <th style="border:1px solid #ccc; padding:8px;">Vencimento</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    `;

    const opt = {
      margin: 10,
      filename: `Relatorio_Validades.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const pdfBase64 = await html2pdf().set(opt).from(containerPdf).outputPdf('datauristring');
      const base64Data = pdfBase64.split(',')[1];
      const fileName = `Validades_${Date.now()}.pdf`;

      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: 'CACHE'
      });

      await FileOpener.open({
        filePath: result.uri,
        contentType: 'application/pdf'
      });
    } else {
      await html2pdf().set(opt).from(containerPdf).save();
    }
  } catch (err) {
    console.error("Erro PDF:", err);
    alert("Erro ao processar PDF.");
  } finally {
    btn.innerText = originalTexto;
    btn.disabled = false;
  }
}