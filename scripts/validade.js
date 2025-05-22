


import { historico } from "./firebase.js";
import { getFirestore, collection, doc, addDoc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { db } from './firebase.js';
import { toque } from './login.js'
export function validadesfunc() {

  const validadeInput = document.getElementById('validade_item_add');
  if (validadeInput) {
    const hoje = new Date().toISOString().split('T')[0]; // formato YYYY-MM-DD
    validadeInput.value = hoje;
  }

  // esse imprime
  function imprimir() {





    const tabela = document.getElementById('tabela_validades');

    if (!tabela) {
      alert("Tabela não encontrada!");
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Impressão</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 20mm;
            }
            body {
              font-family: Arial, sans-serif;
              color: black;
              text-align: center;
              margin: 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              color: black;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid black;
              padding: 10px;
              text-align: center;
            }
            img.logo {
              width: 150px;
              margin-bottom: 20px;
            }
            @media print {
              * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>

        </head>
        <body>
          <img src="img/logo.png" class="logo" alt="Logo IKEDA">
          <div style="font-size: 35px; margin-bottom: 20px;">VALIDADES IKEDA</div>
          ${tabela.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };
  }





  // function imprimir() {
  //   const tabela = document.getElementById('tabela_validades');
  //   if (!tabela) {
  //     alert("Tabela não encontrada!");
  //     return;
  //   }

  //   // Opções do html2pdf
  //   const opt = {
  //     margin: 10,
  //     filename: 'validades.pdf',
  //     image: { type: 'jpeg', quality: 0.98 },
  //     html2canvas: { scale: 2 },
  //     jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  //   };

  //   // Gera o PDF como BLOB e inicia download
  //   html2pdf().set(opt).from(tabela).save().then(() => {
  //     /* Nenhuma ação extra — o WebViewer entende que se trata de download
  //        e dispara o evento DownloadIniciado no Kodular                */
  //   });
  // }










  // esse cria o pdf 




async function imprimir_tabela_pdf() {
  const tabela = document.getElementById('tabela_validades');
  if (!tabela) {
    alert('Tabela não encontrada!');
    return;
  }

  // Cria container temporário
  const container = document.createElement('div');
  container.innerHTML = `
    <div style="text-align: center; font-family: Arial, sans-serif;">
      <img src="./img/logo.png" style="width:150px;margin-bottom:20px;" />
      <h2 style="margin-bottom: 20px;">VALIDADES IKEDA</h2>
      ${tabela.outerHTML}
    </div>
  `;
  document.body.appendChild(container);

  try {
    const opt = {
      margin: 0.3,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    // Gera o PDF em blob
    const blob = await html2pdf().set(opt).from(container).outputPdf('blob');

    // Cria URL temporário
    const pdfUrl = URL.createObjectURL(blob);

    // ENVIA PARA ABRIR NO NAVEGADOR EXTERNO via Kodular
    if (window.AppInventor?.setWebViewString) {
      window.AppInventor.setWebViewString('abrir:' + pdfUrl);
    } else if (window.WebViewInterface?.setWebViewString) {
      window.WebViewInterface.setWebViewString('abrir:' + pdfUrl);
    } else {
      // fallback navegador normal
      window.open(pdfUrl, '_blank');
    }

    // Libera o Blob URL após 1 minuto
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
  } catch (erro) {
    console.error('Erro ao gerar PDF:', erro);
    alert('Erro ao gerar o PDF.');
  } finally {
    document.body.removeChild(container);
  }
}






  // aaa
  document.getElementById('buttonadd_vldd').addEventListener('click', adicionarValidade);
  document.getElementById('imprimir').addEventListener('click', imprimir);
  document.getElementById('imprimir_pdf').addEventListener('click', imprimir_tabela);

  function adicionarValidade() {
    const produtoInput = document.getElementById('add_item_validade');
    const quantidadeInput = document.getElementById('quantidade_itens_validade');
    const validadeInput = document.getElementById('validade_item_add');


    const nome = produtoInput.value.trim();
    const quantidade = quantidadeInput.value;
    const validade = validadeInput.value;

    if (!nome || !quantidade || !validade) {
      console.log('preencha todos os campos');
      return;
    }

    const partes = validade.split('-');
    const validadeFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;

    const novaValidade = { nome, quantidade, validade: validadeFormatada };

    const cadastroStored = JSON.parse(localStorage.getItem('cadastros')) || {};
    historico(cadastroStored['nome'], nome, quantidade, 'un', 'vencimento', 'validades', validade, 'inderteminado');
    let validadesSalvas = JSON.parse(localStorage.getItem('validades')) || [];
    validadesSalvas.push(novaValidade);
    localStorage.setItem('validades', JSON.stringify(validadesSalvas));

    produtoInput.value = "";
    quantidadeInput.value = "";
    validadeInput.value = new Date().toISOString().split('T')[0];

    carregarValidadesSalvas();
    toque('mario_coin_s')
  }



  function carregarValidadesSalvas() {
    const tbody = document.getElementById('tbody_vldd');
    tbody.innerHTML = "";

    const validadesSalvas = JSON.parse(localStorage.getItem('validades')) || [];

    validadesSalvas.forEach(item => {
      const [dia, mes, ano] = item.validade.split('/');
      const dataValidade = new Date(`${ano}-${mes}-${dia}`);
      const hoje = new Date();

      const diffMs = dataValidade - hoje;
      const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const diasTotais = diffDias > 0 ? diffDias : 0;

      const meses = Math.floor(diasTotais / 31);
      const dias = diasTotais - (meses * 31);

      const exibeDias = `${dias} dia${dias !== 1 ? 's' : ''}`;
      const exibeMeses = `${meses} mês${meses !== 1 ? 'es' : ''}`;

      const linha = document.createElement('tr');

      let textoDias = `${diasTotais} dia${diasTotais !== 1 ? 's' : ''}`;

      // MONTA O HTML PRIMEIRO
      linha.innerHTML = `
  <td class="pedido">${item.nome}</td>
  <td class="pedido">${item.quantidade}</td>
  <td class="pedido">${item.validade}</td>
  <td class="resultado">${exibeDias}</td>
  <td class="resultado">${exibeMeses}</td>
  <td class="resultado">${textoDias}</td>
`;

      // DEPOIS, MUDA O TEXTO E AS CORES
      if (diasTotais === 0) {
        linha.children[5].textContent = 'vencido'; // <-- altera o último <td>
        for (let celula of linha.children) {
          celula.classList.add('vermelho');
        }
      } else if (diasTotais < 5) {
        for (let celula of linha.children) {
          celula.classList.add('vermelho');
        }
      } else if (diasTotais < 10) {
        for (let celula of linha.children) {
          celula.classList.add('amarelo');
        }
      }



      linha.ondblclick = () => removerValidade(item.nome, item.quantidade, item.validade, linha);
      tbody.appendChild(linha);
    });
  }



  function removerValidade(nome, quantidade, validade, linha) {
    let validadesSalvas = JSON.parse(localStorage.getItem('validades')) || [];
    validadesSalvas = validadesSalvas.filter(item =>
      !(item.nome === nome && item.quantidade === quantidade && item.validade === validade)
    );
    localStorage.setItem('validades', JSON.stringify(validadesSalvas));

    carregarValidadesSalvas();
    toque('z_s')
  }

  carregarValidadesSalvas();
}