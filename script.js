function abastecer_screen() {

  console.log('Abastecer screen activated');
  const tabela = document.getElementById('tabela');
  const buttonadd = document.getElementById('buttonadd');
  const listaitens = document.getElementById('lista-itens');
  const quantidade_abastecer = document.getElementById('quantidade_abastecer');
  const unabastecer = document.getElementById('unabastecer');
  const abastecer_item = document.getElementById('abastecer_item');
  const tbody = document.getElementById('tbody');
  const datalist = document.getElementById('lista-itens');


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


  function adicionarlinha() {
    const categoria = abastecer_item.value.toLowerCase().includes('chocolate') ? 'chocolate' :
      abastecer_item.value.toLowerCase().includes('lamen') ? 'lamen' :
        abastecer_item.value.toLowerCase().includes('bala') ? 'bala' :
          abastecer_item.value.toLowerCase().includes('amendoim') ? 'amendoim' :
            abastecer_item.value.toLowerCase().includes('ajinomoto') ? 'ajinomoto' :
              abastecer_item.value.toLowerCase().includes('limpeza') ? 'limpeza' : 'outros';

    let categoriaRow = Array.from(tbody.querySelectorAll('tr')).find(row => row.dataset.categoria === categoria);

    if (!categoriaRow) {
      categoriaRow = document.createElement('tr');
      const categoriaCell = document.createElement('td');
      categoriaCell.colSpan = 6;
      categoriaCell.innerHTML = categoria.charAt(0).toUpperCase() + categoria.slice(1);
      categoriaCell.classList.add('categoria-row');
      categoriaCell.classList.add(categoria + '_rowz');
      categoriaRow.appendChild(categoriaCell);
      categoriaRow.dataset.categoria = categoria;
      tbody.appendChild(categoriaRow);
    }

    if (abastecer_item.value === "") {
      console.log('escreva um item');
      return;
    }

    const linha = document.createElement('tr');
    const celula1 = document.createElement('td');
    const celula2 = document.createElement('td');
    const celula3 = document.createElement('td');
    const celula4 = document.createElement('td');
    const celula5 = document.createElement('td');
    const celula6 = document.createElement('td');

    celula1.innerHTML = abastecer_item.value;
    if (quantidade_abastecer.value === "") {
      quantidade_abastecer.value = 1;
     
      
    }
    celula2.innerHTML = quantidade_abastecer.value;
    celula3.innerHTML = unabastecer.value;
    celula4.innerHTML = '...';
    celula5.innerHTML = '...';
    celula6.innerHTML = '...';

    celula1.classList.add('pedido');
    celula2.classList.add('pedido');
    celula3.classList.add('pedido');
    celula4.classList.add('resultado');
    celula5.classList.add('resultado');
    celula6.classList.add('resultado');

    linha.appendChild(celula1);
    linha.appendChild(celula2);
    linha.appendChild(celula3);
    linha.appendChild(celula4);
    linha.appendChild(celula5);
    linha.appendChild(celula6);
    tbody.insertBefore(linha, categoriaRow.nextSibling);

    // Salvar no localStorage
    const item = {
      nome: celula1.innerHTML,
      quantidade: celula2.innerHTML,
      unidade: celula3.innerHTML,
      categoria: categoria
    };
    let itensSalvos = JSON.parse(localStorage.getItem('abastecimento')) || [];
    itensSalvos.push(item);
    localStorage.setItem('abastecimento', JSON.stringify(itensSalvos));

    // Limpar campos
    abastecer_item.value = "";

    quantidade_abastecer.value = "";
    
    // linha.onclick = removerlinha;
  }

  function carregarLinhasSalvas() {
    let itensSalvos = JSON.parse(localStorage.getItem('abastecimento')) || [];

    itensSalvos.forEach(item => {
      let categoriaRow = Array.from(tbody.querySelectorAll('tr')).find(row => row.dataset.categoria === item.categoria);

      if (!categoriaRow) {
        categoriaRow = document.createElement('tr');
        const categoriaCell = document.createElement('td');
        categoriaCell.colSpan = 6;
        categoriaCell.innerHTML = item.categoria.charAt(0).toUpperCase() + item.categoria.slice(1);
        categoriaCell.classList.add('categoria-row');
        categoriaRow.appendChild(categoriaCell);
        categoriaRow.dataset.categoria = item.categoria;
        tbody.appendChild(categoriaRow);
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
      tbody.insertBefore(linha, categoriaRow.nextSibling);
      linha.onclick = removerlinha;
    });

  }





  function limparDados() {
    localStorage.removeItem('abastecimento');
    location.reload();
  }

  window.onload = carregarLinhasSalvas;




  function removerlinha(event) {
    // Certificar-se de que o evento ocorreu em uma célula de uma linha
    const linhaSelecionada = event.target.closest('tr');
  
    // Se o elemento mais próximo não for uma linha ou se for uma linha de categoria, não faz nada
    if (!linhaSelecionada || linhaSelecionada.classList.contains('categoria-row')) return;
  
    // Pegar os dados da linha para excluir do localStorage
    const nome = linhaSelecionada.children[0].textContent;
    const quantidade = linhaSelecionada.children[1].textContent;
    const unidade = linhaSelecionada.children[2].textContent;
  
    // Remover do localStorage
    let itensSalvos = JSON.parse(localStorage.getItem('abastecimento')) || [];
    itensSalvos = itensSalvos.filter(item =>
      !(item.nome === nome && item.quantidade === quantidade && item.unidade === unidade)
    );
    localStorage.setItem('abastecimento', JSON.stringify(itensSalvos));
  
    // Encontrar a linha da categoria baseada no tipo de categoria
    let categoriaRow = linhaSelecionada.previousElementSibling;
    while (categoriaRow && !categoriaRow.classList.contains('categoria-row')) {
      categoriaRow = categoriaRow.previousElementSibling;
    }
  
    // Se categoriaRow for encontrado, remover a linha da categoria
    if (categoriaRow) {
      // Remover a linha selecionada
      linhaSelecionada.remove();
  
      // Verificar se ainda existem mais itens na categoria (baseado na classe)
      const categoriaClass = categoriaRow.classList[0]; // Ex: 'chocolate_rowz'
      const outrasLinhasDaCategoria = document.querySelectorAll(`tr.${categoriaClass}`);
  
      // Se não houver mais itens dessa categoria, remover a categoriaRow
      if (outrasLinhasDaCategoria.length <= 1) {
        categoriaRow.remove();
      }
    } else {
      // Se a linha não for de categoria, apenas remover
      linhaSelecionada.remove();
    }
  }
  
  
  function atualizarTabela() {
    const tbody = document.querySelector('tbody'); // Selecione a tabela onde as linhas estão
  
    // Limpa a tabela para atualizações
    const linhas = Array.from(tbody.querySelectorAll('tr:not(.categoria-row)')); // Exclui as linhas de categoria
    linhas.forEach(linha => linha.remove()); // Remove as linhas antigas
  
    // Recarrega os itens salvos do localStorage
    let itensSalvos = JSON.parse(localStorage.getItem('abastecimento')) || [];
  
    // Agrupa itens por categoria
    const categorias = {};
    itensSalvos.forEach(item => {
      const categoria = item.categoria || 'outros';  // Ajuste de acordo com sua estrutura
      if (!categorias[categoria]) categorias[categoria] = [];
      categorias[categoria].push(item);
    });
  
    // Cria as linhas novamente por categoria
    for (let categoria in categorias) {
      // Adiciona a linha de categoria
      const categoriaRow = document.createElement('tr');
      categoriaRow.classList.add(categoria + '_rowz', 'categoria-row');
      const categoriaCell = document.createElement('td');
      categoriaCell.colSpan = 6;
      categoriaCell.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);
      categoriaRow.appendChild(categoriaCell);
      tbody.appendChild(categoriaRow);
  
      // Adiciona os itens dessa categoria
      categorias[categoria].forEach(item => {
        const linha = document.createElement('tr');
        linha.classList.add(categoria + '_rowz');
  
        const celula1 = document.createElement('td');
        const celula2 = document.createElement('td');
        const celula3 = document.createElement('td');
        const celula4 = document.createElement('td');
        const celula5 = document.createElement('td');
        const celula6 = document.createElement('td');
  
        celula1.innerHTML = item.nome;
        celula2.innerHTML = item.quantidade;
        celula3.innerHTML = item.unidade;
        celula4.innerHTML = '...';  // Você pode personalizar isso
        celula5.innerHTML = '...';  // Você pode personalizar isso
        celula6.innerHTML = '...';  // Você pode personalizar isso
  
        // Adiciona as células à linha
        linha.appendChild(celula1);
        linha.appendChild(celula2);
        linha.appendChild(celula3);
        linha.appendChild(celula4);
        linha.appendChild(celula5);
        linha.appendChild(celula6);
  
        // Adiciona a linha à tabela
        tbody.appendChild(linha);
        
        // Adiciona o evento de remover para a nova linha
        linha.onclick = removerlinha;
      });
    }
  }
  




  tbody.addEventListener('dblclick', removerlinha);
  buttonadd.addEventListener('click', adicionarlinha)

}

async function itens() {
  const div_itens = document.getElementById('itens');
  fetch('produtos.json')
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
                <p>${item.nome}</p>
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
  const btn_estoque = document.getElementById('btn_estoque');
  const abastecimento = document.getElementById('abastecimento');
  const itens = document.getElementById('itens');
  const btn_header = document.getElementsByClassName('btn_header');
  const logo = document.getElementById('logo');
  const menu = document.getElementById('menu');
  const app = document.getElementById('app');
  const botoesmenus = document.querySelectorAll('.btn_menu');
  btn_header[1].addEventListener('click', function () {

    app.classList.add('hide');
    app.classList.remove('show')
    menu.classList.add('show');
    menu.classList.remove('hide')


  });
  btn_header[0].addEventListener('click', function () {

    app.classList.add('show');
    app.classList.remove('hide')
    menu.classList.add('hide');
    menu.classList.remove('show')


  });

  btn_abastecer.addEventListener('click', function () {
    abastecimento.style.display = 'flex';
    itens.style.display = 'none';
    console.log('abastecer');

    menu.classList.add('hide');
    menu.classList.remove('show')
    logo.classList.remove('hide')
    logo.classList.add('show')

  });

  btn_estoque.addEventListener('click', function () {
    itens.style.display = 'flex';
    abastecimento.style.display = 'none';
    console.log('estoque');

    menu.classList.add('hide');
    menu.classList.remove('show')
    logo.classList.remove('hide')
    logo.classList.add('show')
  });
  botoesmenus.forEach(botao => {
    botao.addEventListener('click', function () {
      menu.classList.add('hide');
      menu.classList.remove('show');
      app.classList.remove('hide');
      app.classList.add('show');
    });
  });


}

header();
abastecer_screen();
itens();


