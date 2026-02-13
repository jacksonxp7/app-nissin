import { toque } from './login.js';

export function header() {
  const $ = id => document.getElementById(id);

  // Mapeamento das Divs de Conteúdo
  const telas = {
    abastecimento: $('abastecimento'),
    validades: $('validades'),
    itens: $('itens'),
    dashboard: $('dashboard'),
    layout: $('layout'),
    login: $('login'),
    giro_vendas: $('giro_vendas'),
    configs: $('configs')
  };

  const menu = $('menu');
  const app = $('app');
  const logo = $('logo');
  const abrirMenuBtn = $('abrir_menu_icon');
  const fecharMenuBtn = $('fechar_menu_icon');

  // Mapeamento dos Botões do Menu
  const botoes = {
    btn_abastecer: 'abastecimento',
    btn_valida: 'validades',
    btn_estoque: 'itens',
    btn_dashboard: 'dashboard',
    btn_layout: 'layout',
    btn_login: 'login',
    btn_giro: 'giro_vendas',
    btn_configs: 'configs'
  };

  const mostrarTela = nome => {
    // Esconde menu e mostra container do App
    if (menu) menu.classList.add('hide');
    if (menu) menu.classList.remove('show');
    if (app) app.classList.add('show');
    if (app) app.classList.remove('hide');

    // Reseta ícones do topo
    if (abrirMenuBtn) abrirMenuBtn.classList.add('show');
    if (abrirMenuBtn) abrirMenuBtn.classList.remove('hide');
    if (fecharMenuBtn) fecharMenuBtn.classList.add('hide');
    if (fecharMenuBtn) fecharMenuBtn.classList.remove('show');

    // Esconde todas as telas e mostra a selecionada
    Object.keys(telas).forEach(key => {
      if (telas[key]) {
        telas[key].classList.add('hide');
        telas[key].classList.remove('show');
      }
    });

    if (telas[nome]) {
        telas[nome].classList.add('show');
        telas[nome].classList.remove('hide');
        telas[nome].scrollTo(0, 0);
    }

    toque('decide_s');
  };

  if (abrirMenuBtn) {
    abrirMenuBtn.onclick = () => {
        if (app) app.classList.add('hide');
        if (app) app.classList.remove('show');
        if (menu) menu.classList.add('show');
        if (menu) menu.classList.remove('hide');
        abrirMenuBtn.classList.add('hide');
        abrirMenuBtn.classList.remove('show');
        if (fecharMenuBtn) fecharMenuBtn.classList.add('show');
        if (fecharMenuBtn) fecharMenuBtn.classList.remove('hide');
        toque('cursor_s');
    };
  }

  if (fecharMenuBtn) {
    fecharMenuBtn.onclick = () => {
        if (menu) menu.classList.add('hide');
        if (menu) menu.classList.remove('show');
        if (app) app.classList.add('show');
        if (app) app.classList.remove('hide');
        fecharMenuBtn.classList.add('hide');
        fecharMenuBtn.classList.remove('show');
        if (abrirMenuBtn) abrirMenuBtn.classList.add('show');
        if (abrirMenuBtn) abrirMenuBtn.classList.remove('hide');
        toque('decide_s');
    };
  }

  // Configura os botões do menu
  Object.entries(botoes).forEach(([btnId, telaNome]) => {
    const btn = $(btnId);
    if (btn) {
      btn.onclick = () => mostrarTela(telaNome);
    }
  });
}