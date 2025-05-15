import { historico } from "./firebase.js";
import { getFirestore, collection, doc, addDoc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { db } from './firebase.js';
import {toque} from './login.js'
export function validadesfunc() {

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


  // esse cria o pdf 


  async function imprimir_pdf() {
    const { jsPDF } = window.jspdf;

    const tabela = document.getElementById('tabela_validades');
    if (!tabela) {
      alert("Tabela não encontrada!");
      return;
    }




    // Criação do container
    const container = document.createElement('div');
    container.innerHTML = `
      <style>
        body {
          font-family: Arial, sans-serif;
          color: black;
          text-align: center;
          margin: 0;
          padding: 0;
        }
      
              
        .titulo {
          font-size: 16px; /* Tamanho ajustado */
          margin-bottom: 10px;
          width: 100%;
        
        }
  
        .container {
          width: 100%;
          padding: 10mm; /* Ajuste da largura para se ajustar ao A4 */
        }
  
        table {
          width: 100%;
          border-collapse: collapse;
          color: black;
          margin-top: 10px;
          font-size: 10px; /* Ajuste de tamanho de fonte */
        }
          
        th, td {
          border: 1px solid black;
          padding: 6px;
          text-align: center;
        }
            
          
      </style>
  
      <div class="container">
        
        <div class="titulo">VALIDADES IKEDA</div>
        ${tabela.outerHTML}
      </div>
    `;

    // Criação do PDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Ajustando para começar mais no topo da página
    await doc.html(container, {
      callback: function (doc) {
        doc.save("validade-ikeda.pdf");
      },

      autoPaging: 'text',
      html2canvas: { scale: 0.55 }, // Ajuste de escala, reduzindo mais para caber
      x: 10,
      y: 0 // Posição ajustada para começar mais no topo
    });
  }

  document.getElementById('buttonadd_vldd').addEventListener('click', adicionarValidade);
  document.getElementById('imprimir').addEventListener('click', imprimir);

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