import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

export async function getConfigs() {
    const s = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!s) return { diasAviso: 7, horarios: ["07:00"] };
    const snap = await getDoc(doc(db, "usuarios", s.nome, "configs", "geral"));
    return snap.exists() ? snap.data() : { diasAviso: 7, horarios: ["07:00"] };
}

export async function getMarcasConfig() {
    const s = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!s) return {};
    const snap = await getDoc(doc(db, "usuarios", s.nome, "configs", "marcas"));
    return snap.exists() ? snap.data() : {};
}

export async function configs_screen() {
    const s = JSON.parse(localStorage.getItem('sessao_ikeda'));
    const container = el('lista_marcas_sortable');
    if (!container || !s) return;

    container.innerHTML = "Carregando...";
    const [snapP, cfgM, cfgG] = await Promise.all([getDocs(collection(db, 'produtos')), getMarcasConfig(), getConfigs()]);

    el('cfg_dias_aviso').value = cfgG.diasAviso;
    el('cfg_horarios').value = cfgG.horarios.join(', ');

    const marcas = snapP.docs.map(d => d.id).sort((a,b) => (cfgM[a]?.ordem || 999) - (cfgM[b]?.ordem || 999));

    container.innerHTML = marcas.map(m => `
        <div class="marca_item" draggable="true" data-marca="${m}" style="display:flex; justify-content:space-between; padding:12px; background:white; margin-bottom:8px; border-radius:8px; border:1px solid #ddd; cursor:move;">
            <span>☰ ${m.toUpperCase()}</span>
            <input type="checkbox" class="check_visivel" ${cfgM[m]?.visivel !== false ? 'checked' : ''}>
        </div>`).join('');

    el('salvar_configs').onclick = async () => {
        const mObj = {};
        container.querySelectorAll('.marca_item').forEach((item, i) => {
            mObj[item.dataset.marca] = { ordem: i + 1, visivel: item.querySelector('.check_visivel').checked };
        });
        const gObj = { diasAviso: parseInt(el('cfg_dias_aviso').value), horarios: el('cfg_horarios').value.split(',').map(h => h.trim()) };
        await setDoc(doc(db, "usuarios", s.nome, "configs", "geral"), gObj);
        await setDoc(doc(db, "usuarios", s.nome, "configs", "marcas"), mObj);
        toque('mario_coin_s'); alert("Salvo na Nuvem!");
    };
    initDragAndDrop();
}

function initDragAndDrop() {
    const container = el('lista_marcas_sortable');
    container.addEventListener('dragstart', e => { if (e.target.classList.contains('marca_item')) e.target.classList.add('dragging'); });
    container.addEventListener('dragend', e => { e.target.classList.remove('dragging'); });
    container.addEventListener('dragover', e => {
        e.preventDefault();
        const draggingItem = document.querySelector('.dragging');
        const afterElement = [...container.querySelectorAll('.marca_item:not(.dragging)')].reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = e.clientY - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
        if (afterElement == null) container.appendChild(draggingItem); else container.insertBefore(draggingItem, afterElement);
    });
}