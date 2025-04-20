const tabela = document.getElementById('tabela');
const buttonadd = document.getElementById('buttonadd');
const listaitens = document.getElementById('lista-itens');
const quantidade_abastecer = document.getElementById('quantidade_abastecer');
const unabastecer = document.getElementById('unabastecer');
const abastecer_item = document.getElementById('abastecer_item');
const tbody = document.getElementById('tbody');
const datalist = document.getElementById('lista-itens');



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
    categoriaRow.appendChild(categoriaCell);
    categoriaRow.dataset.categoria = categoria;
    tbody.appendChild(categoriaRow);
  }

  const linha = document.createElement('tr');
  const celula1 = document.createElement('td');
  const celula2 = document.createElement('td');
  const celula3 = document.createElement('td');
  const celula4 = document.createElement('td');
  const celula5 = document.createElement('td');
  const celula6 = document.createElement('td');

  celula1.innerHTML = abastecer_item.value;
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

  if (abastecer_item.value === "") {
    console.log('escreva um item');
    return;
  } else {
    linha.appendChild(celula1);
    linha.appendChild(celula2);
    linha.appendChild(celula3);
    linha.appendChild(celula4);
    linha.appendChild(celula5);
    linha.appendChild(celula6);

    tbody.insertBefore(linha, categoriaRow.nextSibling);
  }

  abastecer_item.value = "";
  quantidade_abastecer.value = 1;
}



function removerlinha(event) {
  const linhaSelecionada = event.target.closest('tr');
  if (linhaSelecionada) {
    linhaSelecionada.remove();
  }
}






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


tbody.addEventListener('dblclick', removerlinha);
buttonadd.addEventListener('click', adicionarlinha)