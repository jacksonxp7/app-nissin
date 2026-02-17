import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

export async function getConfigs() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return { diasAviso: 7, horarios: ["07:00"] };
    const snap = await getDoc(doc(db, "usuarios", userSessao.nome, "configs", "geral"));
    return snap.exists() ? snap.data() : { diasAviso: 7, horarios: ["07:00"] };
}

export async function getMarcasConfig() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return {};
    const snap = await getDoc(doc(db, "usuarios", userSessao.nome, "configs", "marcas"));
    return snap.exists() ? snap.data() : {};
}

export async function configs_screen() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return;

    const marcasFirebase = (await getDocs(collection(db, 'produtos'))).docs.map(d => d.id);
    const cfgMarcas = await getMarcasConfig();
    const cfgGeral = await getConfigs();

    el('cfg_dias_aviso').value = cfgGeral.diasAviso;
    el('cfg_horarios').value = cfgGeral.horarios.join(', ');

    const container = el('lista_marcas_sortable');
    container.innerHTML = marcasFirebase.sort((a,b) => (cfgMarcas[a]?.ordem || 999) - (cfgMarcas[b]?.ordem || 999)).map(marca => `
        <div class="marca_item" data-marca="${marca}" style="display:flex; justify-content:space-between; padding:10px; background:white; margin-bottom:5px;">
            <span>☰ ${marca.toUpperCase()}</span>
            <input type="checkbox" class="check_visivel" ${cfgMarcas[marca]?.visivel !== false ? 'checked' : ''}>
        </div>
    `).join('');

    el('salvar_configs').onclick = async () => {
        const marcasObj = {};
        container.querySelectorAll('.marca_item').forEach((item, i) => {
            marcasObj[item.dataset.marca] = { ordem: i + 1, visivel: item.querySelector('.check_visivel').checked };
        });
        const geralObj = { diasAviso: parseInt(el('cfg_dias_aviso').value), horarios: el('cfg_horarios').value.split(',').map(h => h.trim()) };
        
        await setDoc(doc(db, "usuarios", userSessao.nome, "configs", "geral"), geralObj);
        await setDoc(doc(db, "usuarios", userSessao.nome, "configs", "marcas"), marcasObj);
        alert("Salvo na Nuvem!");
    };
}