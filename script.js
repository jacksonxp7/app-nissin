function verificar_login() {
  const cadastroStored = JSON.parse(localStorage.getItem('cadastros')) || {};

  if (typeof cadastroStored['nome'] === 'undefined' || !cadastroStored['nome']) {
    console.log('⚠️ Faça login');

    // Cria a div de login
    const telaCadastro = document.createElement('div');
    telaCadastro.id = 'tela-login';

    const textoboas = document.createElement('div');
    textoboas.classList.add('textoboas');
    textoboas.innerHTML = `Seja bem-vindo!`;


    const inputNome = document.createElement('input');
    inputNome.type = 'text';
    inputNome.placeholder = 'Digite seu nome';
    inputNome.classList.add('inputnome')


    const botaoLogin = document.createElement('button');
    botaoLogin.classList.add('butonlogin')
    botaoLogin.textContent = 'Entrar';



    // Ao clicar no botão
    botaoLogin.onclick = () => {
      const nomeDigitado = inputNome.value.trim();
      if (nomeDigitado !== '') {
        const novoCadastro = { nome: nomeDigitado };
        localStorage.setItem('cadastros', JSON.stringify(novoCadastro));
        document.body.removeChild(telaCadastro);
        console.log(`✅ Usuário ${nomeDigitado} logado.`);
        window.location.reload();
      } else {
        alert('Digite um nome para continuar.');
      }
    };

    // Adiciona input e botão na tela de login
    telaCadastro.appendChild(textoboas);
    telaCadastro.appendChild(inputNome);
    telaCadastro.appendChild(botaoLogin);

    // Adiciona a tela de login ao body
    document.body.appendChild(telaCadastro);
  } else {
    console.log(`✅ Usuário já logado: ${cadastroStored['nome']}`);

    const telaCadastro = document.createElement('div');
    telaCadastro.id = 'tela-login';
    const textoboas = document.createElement('div');
    textoboas.classList.add('textoboas');
    textoboas.innerHTML = `olá ${cadastroStored['nome']}!`;

    
    telaCadastro.appendChild(textoboas);
    document.body.appendChild(telaCadastro);
    
    setTimeout(() => {
      telaCadastro.remove();
    }, 2000);
    

  }
}

verificar_login()


import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, doc, addDoc, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDghvHq___IIj1sXHAfvn54GqKTuPnHUmU",
  authDomain: "ikeda-e5dae.firebaseapp.com",
  projectId: "ikeda-e5dae",
  storageBucket: "ikeda-e5dae.firebasestorage.app",
  messagingSenderId: "681767727108",
  appId: "1:681767727108:web:d222673b031509ed464551",
  measurementId: "G-5ZETJJ4TWF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function historico(quem, produto, quantidade, un, categoria, setor, vencimento) {

  function sanitize(value) {
    return value.replace(/\//g, "_");
  }

  const horaSP = new Date().toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour12: false
  });

  const item = {
    produto,
    quantidade,
    unidade: un,
    categoria,
    data: new Date().toLocaleDateString(),
    hora: horaSP,
    vencimento
  };

  const hoje = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

  console.log("quem:", quem, "setor:", setor, "hoje:", hoje);
  const quemSan = sanitize(quem);
  const setorSan = sanitize(setor);
  const hojeSan = sanitize(hoje);

  const docRef = doc(db, 'historico', quemSan, setorSan, hojeSan);
  const itensRef = collection(docRef, 'itens');


  try {
    const snapshot = await getDocs(itensRef);
    const novoId = (snapshot.size + 1).toString();

    const novoDocRef = doc(itensRef, novoId);

    await setDoc(novoDocRef, item);

    console.log(`✅ Abastecimento registrado com ID ${novoId} para ${quem}`, item);
  } catch (err) {
    console.error("❌ Erro ao registrar no Firestore:", err);
  }
}

function abastecer_screen() {
  const tabela = document.getElementById('tabela');
  const buttonadd = document.getElementById('buttonadd');
  const listaitens = document.getElementById('lista-itens');
  const quantidade_abastecer = document.getElementById('quantidade_abastecer');
  const unabastecer = document.getElementById('unabastecer');
  const abastecer_item = document.getElementById('abastecer_item');
  const tbody = document.getElementById('tbody');
  const datalist = document.getElementById('lista-itens');

  // Carrega produtos no datalist
  fetch('produtos.json')
    .then(response => response.json())
    .then(produtos => {
      Object.values(produtos).forEach(lista => {
        lista.forEach(item => {
          const option = document.createElement('option');
          option.value = item.nome;
          datalist.appendChild(option);
        });
      });
    })
    .catch(error => {
      console.error('Erro ao carregar produtos:', error);
    });

  console.log('Abastecer screen activated');

  function adicionarlinha() {





    const valorItem = abastecer_item.value.trim().toLowerCase();
    if (!valorItem) {
      console.log('escreva um item');
      return;
    }

    const categorias = ['lamen', 'ferrero', 'kinder', 'm&m', 'snickers', 'fini', 'santa helena', 'ajinomoto', 'ingleza', 'rafaello', 'bala', 'uau', 'Crokíssimo', 'grelhaditos', 'mendorato'];
    const categoria = categorias.find(cat => valorItem.includes(cat)) || 'outros';

    let categoriaRow = Array.from(tbody.querySelectorAll('tr')).find(row => row.dataset.categoria === categoria);

    if (!categoriaRow) {
      categoriaRow = document.createElement('tr');
      const categoriaCell = document.createElement('td');
      categoriaCell.colSpan = 6;
      categoriaCell.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);
      categoriaCell.classList.add('categoria-row', `${categoria}_rowz`);
      categoriaRow.dataset.categoria = categoria;
      categoriaRow.appendChild(categoriaCell);
      tbody.appendChild(categoriaRow);
    }

    abastecer_item.value = abastecer_item.value + ' ' + categoria;

    const linha = document.createElement('tr');
    const pedido = [abastecer_item.value, quantidade_abastecer.value || 1, unabastecer.value];
    const resultado = ['...', '...', '...'];

    [...pedido, ...resultado].forEach((texto, index) => {
      const celula = document.createElement('td');
      celula.textContent = texto;
      celula.classList.add(index < 3 ? 'pedido' : 'resultado');
      linha.appendChild(celula);
    });

    tbody.insertBefore(linha, categoriaRow.nextSibling);

    const item = {
      nome: pedido[0],
      quantidade: pedido[1],
      unidade: pedido[2],
      categoria: categoria
    };


    const cadastroStored = JSON.parse(localStorage.getItem('cadastros')) || {};


    historico(cadastroStored['nome'], pedido[0], pedido[1], pedido[2], categoria, 'abastecimento','não determinado');

    // Adicionando item ao localStorage
    const itensSalvos = JSON.parse(localStorage.getItem('abastecimento')) || [];
    itensSalvos.push(item);
    localStorage.setItem('abastecimento', JSON.stringify(itensSalvos));

    abastecer_item.value = "";
    quantidade_abastecer.value = "";
    linha.ondblclick = removerlinha;
    toque('mario_coin_s');


  }

  function removerlinha(event) {
    const linhaSelecionada = event.target.closest('tr');
    if (!linhaSelecionada || linhaSelecionada.classList.contains('categoria-row')) return;

    const nome = linhaSelecionada.children[0].textContent;
    const quantidade = linhaSelecionada.children[1].textContent;
    const unidade = linhaSelecionada.children[2].textContent;

    let itensSalvos = JSON.parse(localStorage.getItem('abastecimento')) || [];
    itensSalvos = itensSalvos.filter(item =>
      !(item.nome === nome && item.quantidade == quantidade && item.unidade === unidade)
    );
    localStorage.setItem('abastecimento', JSON.stringify(itensSalvos));

    linhaSelecionada.remove();

    const categoriaRow = linhaSelecionada.previousElementSibling?.classList.contains('categoria-row')
      ? linhaSelecionada.previousElementSibling
      : Array.from(tbody.querySelectorAll('.categoria-row')).find(row => row.nextElementSibling === linhaSelecionada);

    if (categoriaRow) {
      let proxima = categoriaRow.nextElementSibling;
      if (!proxima || proxima.classList.contains('categoria-row')) {
        categoriaRow.remove();
      }
    }

    carregarLinhasSalvas();
    toque('z_s');
  }



  function carregarLinhasSalvas() {
    tbody.innerHTML = '';
    let itensSalvos = JSON.parse(localStorage.getItem('abastecimento')) || [];
    const categoriasAdicionadas = {};

    itensSalvos.forEach(item => {
      if (!categoriasAdicionadas[item.categoria]) {
        const categoriaRow = document.createElement('tr');
        const categoriaCell = document.createElement('td');
        categoriaCell.colSpan = 6;
        categoriaCell.innerHTML = item.categoria.charAt(0).toUpperCase() + item.categoria.slice(1);
        categoriaCell.classList.add('categoria-row', item.categoria + '_rowz');

        categoriaRow.appendChild(categoriaCell);
        categoriaRow.classList.add('categoria-row');
        categoriaRow.dataset.categoria = item.categoria;

        tbody.appendChild(categoriaRow);
        categoriasAdicionadas[item.categoria] = categoriaRow;
      }

      const linha = document.createElement('tr');
      linha.innerHTML = `
        <td class="pedido">${item.nome}</td>
        <td class="pedido">${item.quantidade}</td>
        <td class="pedido">${item.unidade}</td>
        <td class="resultado">...</td>
        <td class="resultado">...</td>
        <td class="resultado">...</td>
      `;
      linha.ondblclick = removerlinha;

      const categoriaRow = categoriasAdicionadas[item.categoria];
      tbody.insertBefore(linha, categoriaRow.nextSibling);
    });
  }



  window.onload = carregarLinhasSalvas;
  tbody.addEventListener('dblclick', removerlinha);
  buttonadd.addEventListener('click', adicionarlinha);

}

async function itens() {
  const div_itens = document.getElementById('itens');
  fetch('teste.json')
    .then(response => response.json())
    .then(produtos => {

      Object.values(produtos).forEach(lista => {
        const categoria = Object.keys(produtos).find(key => produtos[key] === lista);
        const div_categoria = document.createElement('div');
        div_categoria.classList.add('class_categoria')


        div_categoria.id = "div_" + categoria;
        div_categoria.innerHTML = categoria;
        div_itens.appendChild(div_categoria);
        const divLista = document.createElement('div');
        divLista.classList.add('class_produto')
        divLista.classList.add('diminuir')
        divLista.id = Object.keys(produtos).find(key => produtos[key] === lista);
        div_itens.appendChild(divLista);
        lista.forEach(item => {

          const itemDiv = document.createElement('div');
          itemDiv.innerHTML = `
            
            <div class="produto">
                <p class='texto_descritivo'>${item.nome}</p>
               <img src="${item.imagem}">
                <p>R$ ${item.preco}</p>
            </div>`;
          divLista.appendChild(itemDiv);


        });
      });
      return document.querySelectorAll('.class_categoria');
    })
    .then(botao_div_categoria => {

      botao_div_categoria.forEach(botao => {
        botao.addEventListener('click', function () {
          console.log(botao)
          const divProduto = document.getElementById(botao.id.replace('div_', ''));

          if (divProduto.classList.contains('diminuir')) {
            divProduto.classList.remove('diminuir');
            divProduto.classList.add('crescer');

            // adiciona a classe na div acima (irmã anterior)
            const divAcima = divProduto.previousElementSibling;
            if (divAcima) {
              divAcima.classList.add('pulsar');
              toque('decide_s')
            }

          } else {
            divProduto.classList.add('diminuir');
            divProduto.classList.remove('crescer');

            const divAcima = divProduto.previousElementSibling;
            if (divAcima) {
              divAcima.classList.remove('pulsar');
              toque('cursor_s')
            }
          }

        });
      });


    })
    .catch(error => {
      console.error('Erro ao carregar produtos:', error);
    });



};

function header() {
  const btn_abastecer = document.getElementById('btn_abastecer');
  const btn_valida = document.getElementById('btn_valida');
  const btn_estoque = document.getElementById('btn_estoque');
  const btn_dashboard = document.getElementById('btn_dashboard');
  const abastecimento = document.getElementById('abastecimento');
  const validades = document.getElementById('validades');
  const editar = document.getElementById('editar');
  const itens = document.getElementById('itens');
  const btn_header = document.getElementsByClassName('btn_header');
  const logo = document.getElementById('logo');
  const menu = document.getElementById('menu');
  const app = document.getElementById('app');
  const botoesmenus = document.querySelectorAll('.btn_menu');
  const dashboard = document.getElementById('dashboard');

  btn_header[0].addEventListener('click', function () {

    app.classList.add('hide');
    app.classList.remove('show')
    menu.classList.add('show');
    menu.classList.remove('hide')
    btn_header[0].classList.add('hide')
    btn_header[0].classList.remove('show')
    btn_header[1].classList.remove('hide')
    btn_header[1].classList.add('show')
    btn_header[1].classList.add('coloron')
    btn_header[1].classList.remove('coloroff')
    btn_header[0].classList.remove('coloron')
    btn_header[0].classList.add('coloroff')
    toque('cursor_s')





  });
  btn_header[1].addEventListener('click', function () {

    app.classList.add('show');
    app.classList.remove('hide')
    menu.classList.add('hide');
    menu.classList.remove('show')
    btn_header[0].classList.add('show')
    btn_header[0].classList.remove('hide')
    btn_header[1].classList.remove('show')
    btn_header[1].classList.add('hide')
    btn_header[0].classList.add('coloron')
    btn_header[0].classList.remove('coloroff')
    btn_header[1].classList.remove('coloron')
    btn_header[1].classList.add('coloroff')
    toque('decide_s')



  });
  botoesmenus.forEach(botao => {
    botao.addEventListener('click', function () {

      menu.classList.add('hide');
      menu.classList.remove('show');
      app.classList.remove('hide');
      app.classList.add('show');

    });
  });

  btn_abastecer.addEventListener('click', function () {
    abastecimento.style.display = 'flex';
    itens.style.display = 'none';
    validades.style.display = 'none';
    dashboard.style.display = 'none';
    menu.classList.add('hide');
    menu.classList.remove('show')

    btn_header[0].classList.add('show')
    btn_header[0].classList.remove('hide')
    btn_header[1].classList.remove('show')
    btn_header[1].classList.add('hide')
    toque('decide_s')

  });

  btn_estoque.addEventListener('click', function () {
    itens.style.display = 'flex';
    abastecimento.style.display = 'none';
    validades.style.display = 'none';
    dashboard.style.display = 'none';
    console.log('estoque');

    menu.classList.add('hide');
    menu.classList.remove('show')
    logo.classList.remove('hide')
    logo.classList.add('show')
    btn_header[0].classList.add('show')
    btn_header[0].classList.remove('hide')
    btn_header[1].classList.remove('show')
    btn_header[1].classList.add('hide')
    itens.scrollTo({ top: 0, behavior: 'smooth' });
    console.log('abrir estoque')
    toque('decide_s')
  });

  btn_valida.addEventListener('click', function () {
    validades.style.display = 'flex';
    itens.style.display = 'none';
    abastecimento.style.display = 'none';
    dashboard.style.display = 'none';


    menu.classList.add('hide');
    menu.classList.remove('show')
    logo.classList.remove('hide')
    logo.classList.add('show')
    btn_header[0].classList.add('show')
    btn_header[0].classList.remove('hide')
    btn_header[1].classList.remove('show')
    btn_header[1].classList.add('hide')
    toque('decide_s')

  });

  btn_dashboard.addEventListener('click', function () {
    validades.style.display = 'none';
    itens.style.display = 'none';
    abastecimento.style.display = 'none';
    dashboard.style.display = 'flex';

    menu.classList.add('hide');
    menu.classList.remove('show')
    logo.classList.remove('hide')
    logo.classList.add('show')
    btn_header[0].classList.add('show')
    btn_header[0].classList.remove('hide')
    btn_header[1].classList.remove('show')
    btn_header[1].classList.add('hide')
    toque('decide_s')

  });

  // editar.addEventListener('click', () => {
  //   window.AppInventor.setWebViewString('AVISO|Item vence em 10 dias')
  //   console.log('editar...')
  //   toque('decide_s')
  // })

}

function validadesfunc() {

  // esse imprime
  // function imprimir() {





  //   const tabela = document.getElementById('tabela_validades');

  //   if (!tabela) {
  //     alert("Tabela não encontrada!");
  //     return;
  //   }

  //   const iframe = document.createElement('iframe');
  //   iframe.style.position = 'fixed';
  //   iframe.style.right = '0';
  //   iframe.style.bottom = '0';
  //   iframe.style.width = '0';
  //   iframe.style.height = '0';
  //   iframe.style.border = '0';
  //   document.body.appendChild(iframe);

  //   const doc = iframe.contentWindow.document;

  //   doc.open();
  //   doc.write(`
  //     <html>
  //       <head>
  //         <title>Impressão</title>
  //         <style>
  //           @page {
  //             size: A4 portrait;
  //             margin: 20mm;
  //           }
  //           body {
  //             font-family: Arial, sans-serif;
  //             color: black;
  //             text-align: center;
  //             margin: 0;
  //           }
  //           table {
  //             width: 100%;
  //             border-collapse: collapse;
  //             color: black;
  //             margin-top: 20px;
  //           }
  //           th, td {
  //             border: 1px solid black;
  //             padding: 10px;
  //             text-align: center;
  //           }
  //           img.logo {
  //             width: 150px;
  //             margin-bottom: 20px;
  //           }
  //           @media print {
  //             * {
  //               -webkit-print-color-adjust: exact;
  //               print-color-adjust: exact;
  //             }
  //           }
  //         </style>

  //       </head>
  //       <body>
  //         <img src="logo.png" class="logo" alt="Logo IKEDA">
  //         <div style="font-size: 35px; margin-bottom: 20px;">VALIDADES IKEDA</div>
  //         ${tabela.outerHTML}
  //       </body>
  //     </html>
  //   `);
  //   doc.close();

  //   iframe.onload = () => {
  //     iframe.contentWindow.focus();
  //     iframe.contentWindow.print();

  //     setTimeout(() => {
  //       document.body.removeChild(iframe);
  //     }, 1000);
  //   };
  // }


  // esse cria o pdf 


  async function imprimir() {
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
    historico(cadastroStored['nome'], nome, quantidade, 'un', 'vencimento', 'validades',validade);
    let validadesSalvas = JSON.parse(localStorage.getItem('validades')) || [];
    validadesSalvas.push(novaValidade);
    localStorage.setItem('validades', JSON.stringify(validadesSalvas));

    produtoInput.value = "";
    quantidadeInput.value = "";
    validadeInput.value = new Date().toISOString().split('T')[0];

    carregarValidadesSalvas(); // chama para atualizar a tela
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

function pushvalidade() {
  const container = document.getElementById("alertas-validade");

  // Limpa classes e conteúdo anteriores
  container.classList.remove('hide', 'closepush');
  void container.offsetWidth; // força reflow
  container.classList.add('show');


  container.innerHTML = "";

  const validadesSalvas = JSON.parse(localStorage.getItem('validades')) || [];
  const hoje = new Date();
  let alertaMostrado = false;

  validadesSalvas.forEach(item => {
    const [dia, mes, ano] = item.validade.split('/');
    const dataValidade = new Date(`${ano}-${mes}-${dia}`);
    const diffMs = dataValidade - hoje;
    const diasTotais = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const alerta = document.createElement("div");

    if (diasTotais <= 0) {
      alerta.className = "alerta-validade-venceu";
      alerta.textContent = `❌ Atenção! O produto "${item.nome}" está vencido há ${Math.abs(diasTotais)} dia(s) (Validade: ${item.validade}).`;
      container.appendChild(alerta);
      alertaMostrado = true;
    } else if (diasTotais <= 10) {
      alerta.className = "alerta-validade";
      alerta.textContent = `⚠️ Atenção! Faltam ${diasTotais} dia(s) para o item "${item.nome}" vencer (Validade: ${item.validade}).`;
      container.appendChild(alerta);
      alertaMostrado = true;
    }
  });

  if (!alertaMostrado) {
    const semAlerta = document.createElement("div");
    semAlerta.textContent = "✅ Nenhum item com 10 dias para vencer.";
    semAlerta.style.cssText = "color: green; margin: 10px 0;";
    container.appendChild(semAlerta);
  }
  setTimeout(() => {

    container.classList.add('push');
  }, 2000)

  setTimeout(() => {

    container.classList.remove('push');
    container.classList.add('closepush');
  }, 10000)



  const fechar = document.createElement("div");
  fechar.textContent = "dispensar";
  fechar.className = "dispensar";
  container.appendChild(fechar);

  // Evento de fechamento com animação
  fechar.addEventListener('click', () => {
    container.classList.remove('push');
    void container.offsetWidth; // força reflow
    container.classList.add('closepush');

    container.addEventListener('animationend', function handleEnd() {
      container.classList.add('hide');
      container.classList.remove('show', 'closepush');
      container.removeEventListener('animationend', handleEnd);

    });
    toque('z_s')
  });
}
function toque(qual) {
  const som = document.getElementById(qual);
  som.currentTime = 0;
  som.play();
}

function dashboard() {
  const container_ca_em = document.getElementById('ca_em')
  const container_ca_cm = document.getElementById('ca_cm')
  container_ca_cm.innerHTML = 'testando1'
  container_ca_em.innerHTML = 'testando2'



  const container_vevt_em = document.getElementById('vevt_em')
  const container_vevt_cm = document.getElementById('vevt_cm')
  container_vevt_em.innerHTML = 'testando12'
  container_vevt_cm.innerHTML = 'testando23'


  const container_mv_em = document.getElementById('mv_em')
  const container_mv_cm = document.getElementById('mv_cm')
  container_mv_em.innerHTML = 'testando123'
  container_mv_cm.innerHTML = 'testando234'






}









validadesfunc()
header();
abastecer_screen();
itens();
pushvalidade();
dashboard();





















