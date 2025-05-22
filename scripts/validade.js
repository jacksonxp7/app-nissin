


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


async function imprimir_tabela() {
  /* ---------- 1. Verifica se a tabela existe ---------- */
  const tabela = document.getElementById('tabela_validades');
  if (!tabela) {
    alert('Tabela não encontrada!');
    return;
  }

  /* ---------- 2. CSS de impressão e estilo ---------- */
  const estilos = `
    <style>
      @media print {
        body {
          margin: 0;
          -webkit-print-color-adjust: exact;
        }
      }

      body {
        font-family: Arial, sans-serif;
        color: black;
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;   /* Centraliza horizontalmente  */
        min-height: 100vh;         /* Centraliza verticalmente     */
        background: white;
      }

      .container {
        padding: 20px;
        width: 90%;
        max-width: 900px;
        text-align: center;
      }

      .titulo {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 20px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      }

      th, td {
        border: 1px solid #333;
        padding: 8px;
        text-align: center;
      }

      th {
        background-color: #f0f0f0;
        font-weight: bold;
      }
    </style>
  `;

  /* ---------- 3. HTML completo a ser impresso ---------- */
  const conteudo = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Validades Ikeda - Impressão</title>
        ${estilos}
      </head>
      <body>
        <div class="container">
          <img src="./img/logo.png" alt="Logo IKEDA"
               style="width:150px;margin-bottom:20px;" />
          <div class="titulo">VALIDADES IKEDA</div>
          ${tabela.outerHTML}
        </div>

        <script>
          /* Imprime assim que renderizar */
          window.onload = function () {
            window.focus();
            window.print();
          };
        <\/script>
      </body>
    </html>
  `;

  /* ---------- 4. Cria Blob URL temporário ---------- */
  const blob = new Blob([conteudo], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);

  /* ---------- 5. Envia comando ao Kodular ou abre em nova aba ---------- */
  if (window.AppInventor && typeof window.AppInventor.setWebViewString === 'function') {
    /* Estamos dentro do WebViewer do Kodular → manda comando */
    window.AppInventor.setWebViewString('abrir:' + url);
  } else if (window.WebViewInterface && typeof window.WebViewInterface.setWebViewString === 'function') {
    /* Alguns forks chamam WebViewInterface */
    window.WebViewInterface.setWebViewString('abrir:' + url);
  } else {
    /* Fallback para navegador normal (ex.: teste no desktop) */
    window.open(url, '_blank', 'noopener');
  }

  /* ---------- 6. Libera a URL em memória após 30 s ---------- */
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
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