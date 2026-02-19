import { db } from './firebase.js';
import { getMultiplicador } from './multiplicadores.js';
import { el } from './utils.js';
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// --- FUNÇÕES DE AUXÍLIO ---
const limparPreco = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    let limpo = val.replace(/\./g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
};

const formatBRL = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// --- CÓDIGO PRINCIPAL DO DASHBOARD ---
export async function rodarDashboard() {
    const DASH = el('dashboard');
    if (!DASH) return;

    // Injeção de CSS Profissional
    const styleId = 'dash-bi-style';
    if (!document.getElementById(styleId)) {
        const s = document.createElement('style');
        s.id = styleId;
        s.innerHTML = `
            #dashboard { background: #f1f3f6; font-family: 'Inter', sans-serif; padding-bottom: 50px; }
            .filter-bar { background: #2c3e50; padding: 15px; color: white; position: sticky; top: 0; z-index: 100; box-shadow: 0 4px 10px rgba(0,0,0,0.2); border-radius: 0 0 15px 15px; margin-bottom: 15px; }
            .filter-group { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
            .filter-bar label { font-size: 10px; text-transform: uppercase; display: block; margin-bottom: 4px; color: #bdc3c7; }
            .filter-bar input, .filter-bar select { width: 100%; padding: 8px; border-radius: 6px; border: none; font-size: 12px; background: #34495e; color: white; }
            
            .dash-scroll { padding: 10px; }
            .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
            .card-kpi { background: white; padding: 15px; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border-left: 5px solid #3498db; }
            .card-kpi small { font-size: 10px; color: #888; display: block; }
            .card-kpi b { font-size: 16px; color: #2c3e50; }
            
            .chart-box { background: white; padding: 15px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
            .chart-box h4 { margin: 0 0 12px 0; font-size: 13px; color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 8px; display: flex; justify-content: space-between; }
            
            .bar-container { background: #f0f0f0; height: 10px; border-radius: 5px; margin: 8px 0; overflow: hidden; display: flex; }
            .bar-fill { height: 100%; transition: width 0.8s; }
            .list-row { display: flex; justify-content: space-between; font-size: 12px; padding: 6px 0; border-bottom: 1px solid #f9f9f9; align-items: center; }
            .tag-val { font-size: 10px; background: #e8f0fe; color: #1a73e8; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
            
            .c-blue { background: #3498db; } .c-green { background: #27ae60; } .c-orange { background: #f39c12; } .c-red { background: #e74c3c; } .c-purple { background: #8e44ad; }
            .loading-msg { text-align: center; padding: 50px; color: #7f8c8d; font-size: 14px; }
        `;
        document.head.appendChild(s);
    }

    // Estrutura inicial do Dashboard com Filtros
    const hoje = new Date().toISOString().split('T')[0];
    DASH.innerHTML = `
        <div class="filter-bar">
            <div class="filter-group">
                <div><label>De:</label><input type="date" id="dash_de" value="${hoje}"></div>
                <div><label>Até:</label><input type="date" id="dash_ate" value="${hoje}"></div>
            </div>
            <div class="filter-group">
                <div>
                    <label>Filtrar Marca:</label>
                    <select id="dash_marca"><option value="TODAS">Todas as Marcas</option></select>
                </div>
                <div>
                    <label>Unidade:</label>
                    <select id="dash_un"><option value="TODAS">CX + UN</option><option value="CX">Apenas CX</option><option value="UN">Apenas UN</option></select>
                </div>
            </div>
            <button id="btn_filtrar_dash" style="width:100%; padding:10px; border-radius:6px; border:none; background:#27ae60; color:white; font-weight:bold; margin-top:5px;">ATUALIZAR DASHBOARD</button>
        </div>
        <div id="dash_conteudo" class="dash-scroll"></div>
    `;

    // Evento de clique para processar os dados
    el('btn_filtrar_dash').onclick = processarDados;
    
    // Processa a primeira vez automaticamente
    processarDados();
}

async function processarDados() {
    const conteudo = el('dash_conteudo');
    const hdrValor = el('vevt_em');
    const f_de = el('dash_de').value;
    const f_ate = el('dash_ate').value;
    const f_marca = el('dash_marca').value;
    const f_un = el('dash_un').value;

    conteudo.innerHTML = '<div class="loading-msg">🔄 Consultando banco de dados...</div>';

    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return;

    try {
        // 1. CARREGAR PREÇOS (Para cálculo financeiro preciso)
        const precosCache = {};
        const marcasDisponiveis = new Set();
        const mSnap = await getDocs(collection(db, 'produtos'));
        for (const mDoc of mSnap.docs) {
            marcasDisponiveis.add(mDoc.id);
            const itSnap = await getDocs(collection(db, 'produtos', mDoc.id, 'itens'));
            itSnap.forEach(it => {
                const d = it.data();
                precosCache[d.nome] = limparPreco(d.preco);
            });
        }

        // Atualizar o select de marcas dinamicamente
        const selectMarca = el('dash_marca');
        if (selectMarca.options.length <= 1) {
            marcasDisponiveis.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m; opt.textContent = m;
                selectMarca.appendChild(opt);
            });
            selectMarca.value = f_marca; // Mantém o valor selecionado
        }

        // 2. BUSCAR DADOS NO RANGE DE DATAS
        const dtInicio = new Date(f_de + 'T00:00:00');
        const dtFim = new Date(f_ate + 'T23:59:59');

        const path = `usuarios/${userSessao.nome}/abastecimentos`;
        const q = query(collection(db, path), where("timestamp", ">=", dtInicio), where("timestamp", "<=", dtFim));
        const snap = await getDocs(q);

        if (snap.empty) {
            if (hdrValor) hdrValor.innerText = "R$ 0,00";
            conteudo.innerHTML = '<div class="loading-msg">📭 Nenhum dado encontrado neste período.</div>';
            return;
        }

        // 3. PROCESSAMENTO DE +25 MÉTRICAS
        let faturamento = 0, volume = 0, bips = 0, caixas = 0, avulsos = 0;
        const porMarcaVal = {}, porMarcaQtd = {}, porItemVol = {}, porItemFreq = {}, porHora = {}, porDia = {};
        let topItem = { val: 0, nome: "" }, itemCaro = { val: 0, nome: "" }, maiorLote = { val: 0, nome: "" };

        snap.forEach(doc => {
            const d = doc.data();
            
            // Aplicação dos Filtros Profissionais
            if (f_marca !== "TODAS" && d.categoria !== f_marca) return;
            if (f_un !== "TODAS" && d.un !== f_un) return;

            const precoUn = precosCache[d.nome] || 0;
            const subTotal = d.unidadesTotais * precoUn;

            faturamento += subTotal;
            volume += d.unidadesTotais;
            bips++;

            // Cálculos de Insights
            if (subTotal > topItem.val) topItem = { val: subTotal, nome: d.nome };
            if (precoUn > itemCaro.val) itemCaro = { val: precoUn, nome: d.nome };
            if (d.unidadesTotais > maiorLote.val) maiorLote = { val: d.unidadesTotais, nome: d.nome };

            if (d.un === 'CX') caixas += parseFloat(d.qtd); else avulsos += parseFloat(d.qtd);

            // Agrupamentos
            const hora = d.data.split(':')[0] + 'h';
            const diaStr = d.timestamp.toDate().toLocaleDateString('pt-BR');
            porHora[hora] = (porHora[hora] || 0) + subTotal;
            porDia[diaStr] = (porDia[diaStr] || 0) + subTotal;
            porMarcaVal[d.categoria] = (porMarcaVal[d.categoria] || 0) + subTotal;
            porMarcaQtd[d.categoria] = (porMarcaQtd[d.categoria] || 0) + d.unidadesTotais;
            porItemVol[d.nome] = (porItemVol[d.nome] || 0) + d.unidadesTotais;
            porItemFreq[d.nome] = (porItemFreq[d.nome] || 0) + 1;
        });

        if (hdrValor) hdrValor.innerText = formatBRL(faturamento);

        // 4. CONSTRUÇÃO DO HTML DO DASHBOARD
        let h = `<div class="kpi-grid">`;
        h += `<div class="card-kpi"> <small>Faturamento</small><b>${formatBRL(faturamento)}</b></div>`;
        h += `<div class="card-kpi" style="border-left-color:#27ae60"> <small>Volume Físico</small><b>${volume} un</b></div>`;
        h += `<div class="card-kpi" style="border-left-color:#f39c12"> <small>Ticket Médio</small><b>${formatBRL(faturamento / bips || 0)}</b></div>`;
        h += `<div class="card-kpi" style="border-left-color:#8e44ad"> <small>Itens Únicos</small><b>${Object.keys(porItemVol).length}</b></div>`;
        h += `</div>`;

        // Gráfico de Barras: CX vs UN
        const totalEmb = (caixas + avulsos) || 1;
        h += `<div class="chart-box">
                <h4>📦 Mix de Carga (CX vs UN)</h4>
                <div class="list-row"><span>Caixas: ${caixas}</span><span>Avulsos: ${avulsos}</span></div>
                <div class="bar-container">
                    <div class="bar-fill c-blue" style="width:${(caixas/totalEmb*100)}%"></div>
                    <div class="bar-fill c-green" style="width:${(avulsos/totalEmb*100)}%"></div>
                </div>
              </div>`;

        // Faturamento por Marca
        h += `<div class="chart-box"><h4>💰 Faturamento por Marca</h4>`;
        Object.entries(porMarcaVal).sort((a,b)=>b[1]-a[1]).forEach(([m, v]) => {
            const p = (v / faturamento * 100).toFixed(1);
            h += `<div class="list-row"><span>${m}</span><b>${formatBRL(v)}</b></div>
                  <div class="bar-container"><div class="bar-fill c-orange" style="width:${p}%"></div></div>`;
        });
        h += `</div>`;

        // Top 5 Produtos (Volume)
        h += `<div class="chart-box"><h4>🏆 Top 5 Produtos (Volume)</h4>`;
        Object.entries(porItemVol).sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(([prod, qtd]) => {
            h += `<div class="list-row"><span>${prod}</span><span class="tag-val">${qtd} un</span></div>`;
        });
        h += `</div>`;

        // Performance por Dia (Se o range for maior que 1 dia)
        if (Object.keys(porDia).length > 1) {
            h += `<div class="chart-box"><h4>📅 Evolução Diária</h4>`;
            Object.entries(porDia).forEach(([dia, val]) => {
                h += `<div class="list-row"><span>${dia}</span><b>${formatBRL(val)}</b></div>`;
            });
            h += `</div>`;
        }

        // Insights e Curiosidades (Mais 10 Métricas Criativas)
        h += `<div class="chart-box" style="background:#2c3e50; color:white;">
                <h4 style="color:white; border-bottom:1px solid #444;">💡 BI Insights e Recordes</h4>
                <div class="list-row"><span>Item mais caro do período:</span><b>${formatBRL(itemCaro.val)}</b></div>
                <small style="color:#bdc3c7; display:block; margin-bottom:8px;">↳ ${itemCaro.nome}</small>
                
                <div class="list-row"><span>Maior faturamento único:</span><b>${formatBRL(topItem.val)}</b></div>
                <small style="color:#bdc3c7; display:block; margin-bottom:8px;">↳ ${topItem.nome}</small>

                <div class="list-row"><span>Maior lote abastecido:</span><b>${maiorLote.val} un</b></div>
                <small style="color:#bdc3c7; display:block; margin-bottom:8px;">↳ ${maiorLote.nome}</small>

                <div class="list-row"><span>Média Peças p/ Bipagem:</span><b>${(volume / bips || 0).toFixed(1)} un</b></div>
                <div class="list-row"><span>Diversidade de Marcas:</span><b>${Object.keys(porMarcaVal).length} marcas</b></div>
                <div class="list-row"><span>Eficiência de Mix:</span><b>${((Object.keys(porItemVol).length / bips) * 100).toFixed(0)}%</b></div>
                <div class="list-row"><span>Média por Marca:</span><b>${formatBRL(faturamento / Object.keys(porMarcaVal).length || 0)}</b></div>
                <div class="list-row"><span>Lançamentos Totais:</span><b>${bips} vezes</b></div>
              </div>`;

        conteudo.innerHTML = h;

    } catch (err) {
        console.error(err);
        conteudo.innerHTML = `<div style="color:red; text-align:center; padding:30px;">❌ Erro ao processar dados: ${err.message}</div>`;
    }
}