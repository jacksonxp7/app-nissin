import { el } from './utils.js';
import { toque } from './login.js';
import { db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

export async function configs_screen() {
    const container = el('lista_marcas_sortable');
    if (!container) return;

    container.innerHTML = "<p style='color:gray; padding:10px;'>Carregando marcas...</p>";
    const marcasDoFirebase = await buscarMarcasFirebase();
    renderizarMarcasSortable(marcasDoFirebase);
    
    carregarConfiguracoesGerais();
    initDragAndDrop();
    el('salvar_configs').onclick = salvarConfiguracoes;
}

async function buscarMarcasFirebase() {
    try {
        const snap = await getDocs(collection(db, 'produtos'));
        return snap.docs.map(doc => doc.id);
    } catch (e) { return []; }
}

function renderizarMarcasSortable(marcasFirebase) {
    const container = el('lista_marcas_sortable');
    const configsSalvas = JSON.parse(localStorage.getItem('cfg_marcas')) || {};

    const marcasOrdenadas = marcasFirebase.sort((a, b) => {
        return (configsSalvas[a]?.ordem || 999) - (configsSalvas[b]?.ordem || 999);
    });

    container.innerHTML = marcasOrdenadas.map(marca => {
        const visivel = configsSalvas[marca] ? configsSalvas[marca].visivel : true;
        return `
            <div class="marca_item" draggable="true" data-marca="${marca}">
                <span class="handle">☰</span>
                <span class="nome">${marca.toUpperCase()}</span>
                <label class="switch">
                    <input type="checkbox" class="check_visivel" ${visivel ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
        `;
    }).join('');
}

function initDragAndDrop() {
    const container = el('lista_marcas_sortable');
    
    container.addEventListener('dragstart', e => {
        if (e.target.classList.contains('marca_item')) {
            e.target.classList.add('dragging');
        }
    });

    container.addEventListener('dragend', e => {
        e.target.classList.remove('dragging');
    });

    container.addEventListener('dragover', e => {
        e.preventDefault();
        const draggingItem = document.querySelector('.dragging');
        if (!draggingItem) return;

        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
            container.appendChild(draggingItem);
        } else {
            container.insertBefore(draggingItem, afterElement);
        }
    });
}

// Função para melhorar a precisão do arrasto
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.marca_item:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function salvarConfiguracoes() {
    const configGeral = {
        diasAviso: el('cfg_dias_aviso').value || 7,
        horarios: el('cfg_horarios').value.split(',').map(h => h.trim())
    };
    localStorage.setItem('app_configs', JSON.stringify(configGeral));

    const novaOrdemConfig = {};
    document.querySelectorAll('.marca_item').forEach((item, index) => {
        const marca = item.dataset.marca;
        const visivel = item.querySelector('.check_visivel').checked;
        novaOrdemConfig[marca] = { ordem: index + 1, visivel: visivel };
    });

    localStorage.setItem('cfg_marcas', JSON.stringify(novaOrdemConfig));
    alert("Configurações salvas!");
    toque('mario_coin_s');
    location.reload(); 
}

function carregarConfiguracoesGerais() {
    const cfg = JSON.parse(localStorage.getItem('app_configs'));
    if (cfg) {
        if (el('cfg_dias_aviso')) el('cfg_dias_aviso').value = cfg.diasAviso;
        if (el('cfg_horarios')) el('cfg_horarios').value = cfg.horarios.join(', ');
    }
}

export function getConfigs() {
    return JSON.parse(localStorage.getItem('app_configs')) || { diasAviso: 7, horarios: ["06:00", "13:00"] };
}

export function getMarcasConfig() {
    return JSON.parse(localStorage.getItem('cfg_marcas')) || {};
}