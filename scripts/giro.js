import { el } from './utils.js';
import { db } from './firebase.js';

export function giro_vendas_screen() {
    const btnAddGiro = el('btn_add_giro');
    if (btnAddGiro) btnAddGiro.onclick = adicionarGiro;
    renderizarGiros();
}

function adicionarGiro() {
    const local = el('giro_local').value;
    const data = el('giro_data').value;
    const foto = el('giro_foto_preview').src; // Assume que você capturou a foto

    const novoGiro = { local, data, foto, concluido: false };
    const giros = JSON.parse(localStorage.getItem('giros_vendas')) || [];
    giros.push(novoGiro);
    localStorage.setItem('giros_vendas', JSON.stringify(giros));
    renderizarGiros();
}

function renderizarGiros() {
    const container = el('lista_giros');
    if (!container) return;
    const giros = JSON.parse(localStorage.getItem('giros_vendas')) || [];
    container.innerHTML = giros.map(g => `
        <div class="card_giro">
            <img src="${g.foto}" style="width:100px">
            <p>${g.local} - <b>Data: ${g.data}</b></p>
        </div>
    `).join('');
}