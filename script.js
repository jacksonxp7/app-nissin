const tabela = document.getElementById('tabela')
const buttonadd = document.getElementById('buttonadd')
const listaitens = document.getElementById('lista-itens')
const quantidade_abastecer = document.getElementById('quantidade_abastecer')
const unabastecer = document.getElementById('unabastecer')
const abastecer_item = document.getElementById('abastecer_item')
const tbody = document.getElementById('tbody')



function adicionarlinha() {
  const linha = document.createElement('tr')
  const celula1 = document.createElement('td')
  const celula2 = document.createElement('td')
  const celula3 = document.createElement('td')
  const celula4 = document.createElement('td')
  const celula5 = document.createElement('td')
  const celula6 = document.createElement('td')

  celula1.innerHTML = abastecer_item.value
  celula2.innerHTML = quantidade_abastecer.value
  celula3.innerHTML = unabastecer.value

  celula4.innerHTML = '...'
  celula5.innerHTML = '...'
  celula6.innerHTML = '...'


  celula1.classList.add('pedido');
  celula2.classList.add('pedido');
  celula3.classList.add('pedido');
  celula4.classList.add('resultado');
  celula5.classList.add('resultado');
  celula6.classList.add('resultado');






  if (abastecer_item.value == "") {
    return;
  } else {

    linha.appendChild(celula1)
    linha.appendChild(celula2)
    linha.appendChild(celula3)
    linha.appendChild(celula4)
    linha.appendChild(celula5)
    linha.appendChild(celula6)
    tabela.appendChild(linha)
  }
  abastecer_item.value = ""
  quantidade_abastecer.value = 1
}

buttonadd.addEventListener('click', adicionarlinha)

function removerlinha(event) {
  const linhaSelecionada = event.target.closest('tr');
  if (linhaSelecionada) {
    linhaSelecionada.remove();
  }
}

tbody.addEventListener('dblclick', removerlinha);


