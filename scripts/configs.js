import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

/* ============================================================
   1. INICIALIZAÇÃO DA TELA
============================================================ */
export async function configs_screen() {
    const container = el('lista_marcas_sortable');
    if (!container) return;

    container.innerHTML = "<p style='color:gray; padding:10px;'>Carregando marcas...</p>";
    
    // 1. Busca as marcas do catálogo geral (Firebase)
    const marcasDoFirebase = await buscarMarcasFirebase();
    
    // 2. Renderiza a lista com Drag and Drop e Switches
    renderizarMarcasSortable(marcasDoFirebase);
    
    // 3. Ativa as funções de Arrastar (Drag and Drop)
    initDragAndDrop();

    // 4. Configura o botão de salvar (Local + Nuvem)
    const btnSalvar = el('salvar_configs');
    if (btnSalvar) {
        btnSalvar.onclick = salvarConfiguracoes;
    }
    
    // 5. Carrega os inputs de dias e horários
    carregarConfiguracoesGerais();
}

/* ============================================================
   2. BUSCA E RENDERIZAÇÃO
============================================================ */
async function buscarMarcasFirebase() {
    try {
        const snap = await getDocs(collection(db, 'produtos'));
        return snap.docs.map(doc => doc.id);
    } catch (e) { 
        console.error("Erro marcas:", e);
        return []; 
    }
}

function renderizarMarcasSortable(marcasFirebase) {
    const container = el('lista_marcas_sortable');
    const configsSalvas = JSON.parse(localStorage.getItem('cfg_marcas')) || {};

    // Ordena as marcas conforme a ordem salva ou joga para o fim (999)
    const marcasOrdenadas = marcasFirebase.sort((a, b) => {
        return (configsSalvas[a]?.ordem || 999) - (configsSalvas[b]?.ordem || 999);
    });

    container.innerHTML = marcasOrdenadas.map(marca => {
        const visivel = configsSalvas[marca] ? configsSalvas[marca].visivel : true;
        return `
            <div class="marca_item" draggable="true" data-marca="${marca}" 
                 style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border-bottom: 1px solid #eee; background: white; margin-bottom: 5px; border-radius: 5px; cursor: move;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="handle" style="color: #ccc; font-size: 20px;">☰</span>
                    <span class="nome" style="font-weight: bold; color: #2c3e50;">${marca.toUpperCase()}</span>
                </div>
                <label class="switch">
                    <input type="checkbox" class="check_visivel" ${visivel ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
        `;
    }).join('');
}

/* ============================================================
   3. LÓGICA DE ARRASTAR (DRAG AND DROP)
============================================================ */
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

/* ============================================================
   4. SALVAMENTO (SINCRONIZADO COM USUÁRIO)
============================================================ */
async function salvarConfiguracoes() {
    const userLogado = JSON.parse(localStorage.getItem('cadastros'));
    if (!userLogado) {
        alert("Faça login para salvar as configurações permanentemente!");
        return;
    }

    const btn = el('salvar_configs');
    btn.innerText = "SINCRONIZANDO...";
    btn.disabled = true;

    // 1. Coleta Configurações de Notificação
    const configGeral = {
        diasAviso: parseInt(el('cfg_dias_aviso').value) || 7,
        horarios: el('cfg_horarios').value.split(',').map(h => h.trim())
    };

    // 2. Coleta Ordem e Visibilidade das Marcas
    const novaOrdemConfig = {};
    document.querySelectorAll('.marca_item').forEach((item, index) => {
        const marca = item.dataset.marca;
        const visivel = item.querySelector('.check_visivel').checked;
        novaOrdemConfig[marca] = { 
            ordem: index + 1, 
            visivel: visivel 
        };
    });

    try {
        // --- SALVAMENTO LOCAL ---
        localStorage.setItem('app_configs', JSON.stringify(configGeral));
        localStorage.setItem('cfg_marcas', JSON.stringify(novaOrdemConfig));

        // --- SALVAMENTO NA NUVEM (Firebase do Usuário) ---
        const userRefGeral = doc(db, "usuarios", userLogado.nome, "configs", "geral");
        const userRefMarcas = doc(db, "usuarios", userLogado.nome, "configs", "marcas");

        await setDoc(userRefGeral, configGeral);
        await setDoc(userRefMarcas, novaOrdemConfig);

        toque('mario_coin_s');
        alert("Configurações salvas e sincronizadas na sua conta!");
        location.reload(); 

    } catch (err) {
        console.error(err);
        alert("Erro ao sincronizar com a nuvem.");
    } finally {
        btn.innerText = "SALVAR TUDO";
        btn.disabled = false;
    }
}

function carregarConfiguracoesGerais() {
    const cfg = JSON.parse(localStorage.getItem('app_configs'));
    if (cfg) {
        if (el('cfg_dias_aviso')) el('cfg_dias_aviso').value = cfg.diasAviso;
        if (el('cfg_horarios')) el('cfg_horarios').value = cfg.horarios.join(', ');
    }
}

/* ============================================================
   5. EXPORTS PARA OUTROS MÓDULOS
============================================================ */
export function getConfigs() {
    // Retorna salvo ou padrão (7 dias, 07:00)
    return JSON.parse(localStorage.getItem('app_configs')) || { diasAviso: 7, horarios: ["07:00"] };
}

export function getMarcasConfig() {
    return JSON.parse(localStorage.getItem('cfg_marcas')) || {};
}