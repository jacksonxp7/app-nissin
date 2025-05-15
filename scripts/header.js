import {toque} from './login.js'

export function header() {
  const btn_abastecer = document.getElementById('btn_abastecer');
  const btn_valida = document.getElementById('btn_valida');
  const btn_estoque = document.getElementById('btn_estoque');
  const btn_dashboard = document.getElementById('btn_dashboard');
  const btn_layout = document.getElementById('btn_layout');
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
  const layout = document.getElementById('layout');

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
    layout.style.display = 'none';
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
    layout.style.display = 'none';
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
    layout.style.display = 'none';


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
    layout.style.display = 'none';

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


  btn_layout.addEventListener('click', function () {
    validades.style.display = 'none';
    itens.style.display = 'none';
    abastecimento.style.display = 'none';
    dashboard.style.display = 'none';
    layout.style.display = 'flex';

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




 

}