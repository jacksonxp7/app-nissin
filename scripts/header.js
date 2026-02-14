import { el, toque } from './utils.js';
import { rodarDashboard } from './dashboard.js';

export function header() {
    const telas = {
        abastecimento: el('abastecimento'),
        validades: el('validades'),
        itens: el('itens'),
        dashboard: el('dashboard'),
        layout: el('layout'),
        login: el('login'),
        giro_vendas: el('giro_vendas'),
        configs: el('configs')
    };

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
        if (nome === 'dashboard') rodarDashboard();
        Object.keys(telas).forEach(k => {
            if (telas[k]) { telas[k].classList.replace('show', 'hide'); }
        });
        if (telas[nome]) { telas[nome].classList.replace('hide', 'show'); }
        el('menu').classList.replace('show', 'hide');
        el('app').classList.replace('hide', 'show');
        toque('decide_s');
    };

    Object.entries(botoes).forEach(([id, tela]) => {
        const b = el(id);
        if (b) b.onclick = () => mostrarTela(tela);
    });

    el('abrir_menu_icon').onclick = () => {
        el('app').classList.replace('show', 'hide');
        el('menu').classList.replace('hide', 'show');
        toque('cursor_s');
    };
}