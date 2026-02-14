import { db } from './firebase.js';
import { getMultiplicador } from './multiplicadores.js';
import { el, hojeISO } from './utils.js';
import { getMarcasConfig } from './configs.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

export async function rodarDashboard() {
    const containerValor = el('vevt_em');
    const containerGraficos = el('dashboard-valores');
    if (!containerValor || !containerGraficos) return;

    containerValor.innerText = "R$ 0,00";
    const userLS = localStorage.getItem('cadastros');
    const usuario = userLS ? JSON.parse(userLS).nome : null;
    if (!usuario) return;

    try {
        const dataHoje = hojeISO();
        const cfgMarcas = getMarcasConfig();
        const querySnap = await getDocs(collection(db, 'historico', usuario, 'Geral', dataHoje, 'itens'));

        let totalGeral = 0, totalCaixas = 0, totalUnidades = 0;
        const categorias = {}, ranking = {};

        querySnap.forEach(doc => {
            const item = doc.data();
            const cat = item.categoria || "Outros";

            if (cfgMarcas[cat] && cfgMarcas[cat].visivel === false) return;

            const preco = parseFloat(item.preco) || 0;
            const mult = getMultiplicador(item.produto);
            const qtd = parseFloat(item.quantidade) || 0;
            const unidadesReais = (item.unidade === 'CX') ? qtd * mult : qtd;
            const valorVenda = unidadesReais * preco;

            totalGeral += valorVenda;
            categorias[cat] = (categorias[cat] || 0) + valorVenda;
            ranking[item.produto] = (ranking[item.produto] || 0) + unidadesReais;

            if (item.unidade === 'CX') totalCaixas += qtd;
            else totalUnidades += qtd;
        });

        containerValor.innerText = totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        let html = `<div class="card_dash"><h4>💰 Valor por Marca</h4>`;
        Object.entries(categorias).sort((a,b)=>b[1]-a[1]).forEach(([n, v]) => {
            const p = totalGeral > 0 ? (v / totalGeral * 100).toFixed(1) : 0;
            html += `<div style="margin-bottom:10px;"><div style="display:flex; justify-content:space-between; font-size:12px;"><span>${n}</span><span>${v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</span></div>
            <div style="background:#eee; height:8px; border-radius:4px; overflow:hidden;"><div style="background:#f39c12; width:${p}%; height:100%;"></div></div></div>`;
        });
        html += `</div>`;

        const tEmb = (totalCaixas + totalUnidades) || 1;
        html += `<div class="card_dash"><h4>📦 Mix de Abastecimento</h4>
            <div style="display:flex; height:25px; border-radius:12px; overflow:hidden; border:1px solid #ddd;">
                <div style="background:#2980b9; width:${(totalCaixas/tEmb*100)}%; color:white; font-size:10px; display:flex; align-items:center; justify-content:center;">CX</div>
                <div style="background:#27ae60; width:${(totalUnidades/tEmb*100)}%; color:white; font-size:10px; display:flex; align-items:center; justify-content:center;">UN</div>
            </div></div>`;

        html += `<div class="card_dash"><h4>🏆 Top 5 Produtos</h4>`;
        Object.entries(ranking).sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(([n, q]) => {
            html += `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f2f2f2; font-size:12px;"><span>${n}</span><b>${q} un</b></div>`;
        });
        html += `</div>`;

        containerGraficos.innerHTML = html;
    } catch (e) { console.error(e); }
}