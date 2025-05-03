function abastecer_screen() {

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
  const tabela = document.getElementById('tabela');
  const buttonadd = document.getElementById('buttonadd');
  const listaitens = document.getElementById('lista-itens');
  const quantidade_abastecer = document.getElementById('quantidade_abastecer');
  const unabastecer = document.getElementById('unabastecer');
  const abastecer_item = document.getElementById('abastecer_item');
  const tbody = document.getElementById('tbody');
  const datalist = document.getElementById('lista-itens');





  function adicionarlinha() {
    const valorItem = abastecer_item.value.trim().toLowerCase();
    if (!valorItem) {
      console.log('escreva um item');
      return;
    }

    const categorias = ['chocolate', 'lamen', 'bala', 'amendoim', 'ajinomoto', 'limpeza', 'mid'];
    const categoria = categorias.find(cat => valorItem.includes(cat)) || 'outros';

    let categoriaRow = Array.from(tbody.querySelectorAll('tr'))
      .find(row => row.dataset.categoria === categoria);

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

    const itensSalvos = JSON.parse(localStorage.getItem('abastecimento')) || [];
    itensSalvos.push(item);
    localStorage.setItem('abastecimento', JSON.stringify(itensSalvos));

    abastecer_item.value = "";
    quantidade_abastecer.value = "";
    linha.ondblclick = removerlinha;
  }


  function carregarLinhasSalvas() {
    tbody.innerHTML = ''; // Limpa a tabela antes de adicionar

    let itensSalvos = JSON.parse(localStorage.getItem('abastecimento')) || [];
    const categoriasAdicionadas = {};

    itensSalvos.forEach(item => {
      // Se a categoria ainda não foi criada, cria a linha de categoria
      if (!categoriasAdicionadas[item.categoria]) {
        const categoriaRow = document.createElement('tr');
        const categoriaCell = document.createElement('td');
        categoriaCell.colSpan = 6;
        categoriaCell.innerHTML = item.categoria.charAt(0).toUpperCase() + item.categoria.slice(1);
        categoriaCell.classList.add('categoria-row');
        categoriaCell.classList.add(item.categoria + '_rowz');

        categoriaRow.appendChild(categoriaCell);
        categoriaRow.classList.add('categoria-row');
        categoriaRow.dataset.categoria = item.categoria;

        tbody.appendChild(categoriaRow);
        categoriasAdicionadas[item.categoria] = categoriaRow;
      }

      // Criar a linha do item
      const linha = document.createElement('tr');
      linha.innerHTML = `
        <td class="pedido">${item.nome}</td>
        <td class="pedido">${item.quantidade}</td>
        <td class="pedido">${item.unidade}</td>
        <td class="resultado">...</td>
        <td class="resultado">...</td>
        <td class="resultado">...</td>
      `;

      // Adiciona o evento de duplo clique para remoção
      linha.ondblclick = removerlinha;

      // Insere logo após a categoria correspondente
      const categoriaRow = categoriasAdicionadas[item.categoria];
      tbody.insertBefore(linha, categoriaRow.nextSibling);
    });
  }


  function removerlinha(event) {
    const linhaSelecionada = event.target.closest('tr');
    if (!linhaSelecionada || linhaSelecionada.classList.contains('categoria-row')) return;

    const nome = linhaSelecionada.children[0].textContent;
    const quantidade = linhaSelecionada.children[1].textContent;
    const unidade = linhaSelecionada.children[2].textContent;

    // Remover do localStorage
    let itensSalvos = JSON.parse(localStorage.getItem('abastecimento')) || [];
    itensSalvos = itensSalvos.filter(item =>
      !(item.nome === nome && item.quantidade == quantidade && item.unidade === unidade)
    );
    localStorage.setItem('abastecimento', JSON.stringify(itensSalvos));

    // Remover a linha
    linhaSelecionada.remove();

    // Verificar se ainda existem itens na mesma categoria
    const categoriaRow = linhaSelecionada.previousElementSibling?.classList.contains('categoria-row')
      ? linhaSelecionada.previousElementSibling
      : Array.from(tbody.querySelectorAll('.categoria-row')).find(row => {
        return row.nextElementSibling === linhaSelecionada;
      });

    if (categoriaRow) {
      let proxima = categoriaRow.nextElementSibling;
      if (!proxima || proxima.classList.contains('categoria-row')) {
        categoriaRow.remove();
      }
    }

    // Recarregar a tabela para garantir atualização visual
    carregarLinhasSalvas();
  }


  window.onload = carregarLinhasSalvas;
  tbody.addEventListener('dblclick', removerlinha);
  buttonadd.addEventListener('click', adicionarlinha)

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

          } else {
            divProduto.classList.add('diminuir');
            divProduto.classList.remove('crescer');
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
  const abastecimento = document.getElementById('abastecimento');
  const validades = document.getElementById('validades');
  const itens = document.getElementById('itens');
  const btn_header = document.getElementsByClassName('btn_header');
  const logo = document.getElementById('logo');
  const menu = document.getElementById('menu');
  const app = document.getElementById('app');
  const botoesmenus = document.querySelectorAll('.btn_menu');

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
    menu.classList.add('hide');
    menu.classList.remove('show')

    btn_header[0].classList.add('show')
    btn_header[0].classList.remove('hide')
    btn_header[1].classList.remove('show')
    btn_header[1].classList.add('hide')

  });

  btn_estoque.addEventListener('click', function () {
    itens.style.display = 'flex';
    abastecimento.style.display = 'none';
    validades.style.display = 'none';
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
  });

  btn_valida.addEventListener('click', function () {
    validades.style.display = 'flex';
    itens.style.display = 'none';
    abastecimento.style.display = 'none';

    menu.classList.add('hide');
    menu.classList.remove('show')
    logo.classList.remove('hide')
    logo.classList.add('show')
    btn_header[0].classList.add('show')
    btn_header[0].classList.remove('hide')
    btn_header[1].classList.remove('show')
    btn_header[1].classList.add('hide')

  });



}


function validadesfunc() {


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
          <img src="logo.png" class="logo" alt="Logo IKEDA">
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
    let validadesSalvas = JSON.parse(localStorage.getItem('validades')) || [];
    validadesSalvas.push(novaValidade);
    localStorage.setItem('validades', JSON.stringify(validadesSalvas));

    produtoInput.value = "";
    quantidadeInput.value = "";
    validadeInput.value = new Date().toISOString().split('T')[0];

    carregarValidadesSalvas(); // chama para atualizar a tela
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
  }

  carregarValidadesSalvas();
}

function dashboard() {

}




validadesfunc()
header();
abastecer_screen();
itens();
dashboard();


