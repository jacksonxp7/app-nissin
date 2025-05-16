import {toque} from './login.js'


export async function itens() {
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