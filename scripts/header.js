import { toque } from './login.js';

export function header() {
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  const telas = {
    abastecimento: $('abastecimento'),
    validades: $('validades'),
    itens: $('itens'),
    dashboard: $('dashboard'),
    layout: $('layout'),
    login: $('login')
  };

  const menu = $('menu');
  const app = $('app');
  const logo = $('logo');
  const btn_header = document.getElementsByClassName('btn_header');

  const botoes = {
    btn_abastecer: 'abastecimento',
    btn_valida: 'validades',
    btn_estoque: 'itens',
    btn_dashboard: 'dashboard',
    btn_layout: 'layout',
    btn_login: 'login'
  };

  const hide = el => {
    el.classList.add('hide');
    el.classList.remove('show');
  };

  const show = el => {
    el.classList.add('show');
    el.classList.remove('hide');
  };

  const mostrarTela = nome => {
    Object.values(telas).forEach(t => t.style.display = 'none');
    telas[nome].style.display = 'flex';

    hide(menu);
    show(logo);

    show(btn_header[0]);
    hide(btn_header[1]);

    btn_header[0].classList.add('coloron');
    btn_header[0].classList.remove('coloroff');
    btn_header[1].classList.remove('coloron');
    btn_header[1].classList.add('coloroff');

    toque('decide_s');
  };

  btn_header[0].addEventListener('click', () => {
    hide(app);
    show(menu);
    hide(btn_header[0]);
    show(btn_header[1]);

    btn_header[1].classList.add('coloron');
    btn_header[1].classList.remove('coloroff');
    btn_header[0].classList.remove('coloron');
    btn_header[0].classList.add('coloroff');

    toque('cursor_s');
  });

  btn_header[1].addEventListener('click', () => {
    show(app);
    hide(menu);
    show(btn_header[0]);
    hide(btn_header[1]);

    btn_header[0].classList.add('coloron');
    btn_header[0].classList.remove('coloroff');
    btn_header[1].classList.remove('coloron');
    btn_header[1].classList.add('coloroff');

    toque('decide_s');
  });

  $$('.btn_menu').forEach(botao => {
    botao.addEventListener('click', () => {
      hide(menu);
      show(app);
    });
  });

  Object.entries(botoes).forEach(([btnId, tela]) => {
    $(btnId).addEventListener('click', () => {
      mostrarTela(tela);
      const telasComScroll = ['itens', 'abastecimento', 'validades', 'layout'];

      if (telasComScroll.includes(tela)) {
        telas[tela].scrollTo({ top: 0, behavior: 'smooth' });
      }

    });
  });
}
