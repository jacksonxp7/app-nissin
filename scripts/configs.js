import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

/* ============================================================
   1. EXPORTS PARA OUTROS MÓDULOS (BUSCA NA NUVEM)
============================================================ */

// Retorna as configurações gerais (dias e horas) do Firebase
export async function getConfigs() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return { diasAviso: 7, horarios: ["07:00"] };

    try {
        const snap = await getDoc(doc(db, "usuarios", userSessao.nome, "configs", "geral"));
        return snap.exists() ? snap.data() : { diasAviso: 7, horarios: ["07:00"] };
    } catch (e) {
        return { diasAviso: 7, horarios: ["07:00"] };
    }
}

// Retorna a ordem e visibilidade das marcas do Firebase
export async function getMarcasConfig() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return {};

    try {
        const snap = await getDoc(doc(db, "usuarios", userSessao.nome, "configs", "marcas"));
        return snap.exists() ? snap.data() : {};
    } catch (e) {
        return {};
    }
}

/* ============================================================
   2. INICIALIZAÇÃO DA TELA DE CONFIGURAÇÕES
============================================================ */
export async function configs_screen() {
    const container = el('lista_marcas_sortable');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    
    if (!container || !userSessao) return;

    container.innerHTML = "<p style='color:gray; padding:10px;'>Buscando suas preferências...</p>";
    
    try {
        // 1. Busca as Marcas Globais e as Configurações do Usuário em paralelo
        const [snapProdutos, cfgMarcas, cfgGeral] = await Promise.all([
            getDocs(collection(db, 'produtos')),
            getMarcasConfig(),
            getConfigs()
        ]);

        const marcasFirebase = snapProdutos.docs.map(d => d.id);

        // 2. Preenche os campos de notificações
        if (el('cfg_dias_aviso')) el('cfg_dias_aviso').value = cfgGeral.diasAviso;
        if (el('cfg_horarios')) el('cfg_horarios').value = cfgGeral.horarios.join(', ');

        // 3. Renderiza a lista sortable
        renderizarMarcasSortable(marcasFirebase, cfgMarcas);
        
        // 4. Ativa Drag and Drop
        initDragAndDrop();

        // 5. Configura o Botão Salvar
        el('salvar_configs').onclick = () => salvarConfiguracoes(userSessao.nome);

    } catch (err) {
        container.innerHTML = "<p style='color:red;'>Erro ao carregar configurações.</p>";
        console.error(err);
    }
}

/* ============================================================
   3. RENDERIZAÇÃO DA LISTA
============================================================ */
function renderizarMarcasSortable(marcas, configsUso) {
    const container = el('lista_marcas_sortable');

    // Ordena: marcas que já tem ordem salva primeiro, depois as novas (alfabético)
    const ordenadas = marcas.sort((a, b) => {
        const ordemA = configsUso[a]?.ordem || 999;
        const ordemB = configsUso[b]?.ordem || 999;
        return ordemA - ordemB;
    });

    container.innerHTML = ordenadas.map(marca => {
        const visivel = configsUso[marca]?.visivel !== false; // Padrão true
        return `
            <div class="marca_item" draggable="true" data-marca="${marca}" 
                 style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:white; margin-bottom:8px; border-radius:8px; border:1px solid #ddd; cursor:move;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="color:#ccc;">☰</span>
                    <span style="font-weight:bold; color:#2c3e50;">${marca.toUpperCase()}</span>
                </div>
                <input type="checkbox" class="check_visivel" ${visivel ? 'checked' : ''} style="width:20px; height:20px;">
            </div>
        `;
    }).join('');
}

/* ============================================================
   4. SALVAMENTO NA NUVEM
============================================================ */
async function salvarConfiguracoes(username) {
    const btn = el('salvar_configs');
    btn.innerText = "SINCRONIZANDO...";
    btn.disabled = true;

    const marcasObj = {};
    const itens = document.querySelectorAll('.marca_item');
    
    itens.forEach((item, index) => {
        const nome = item.dataset.marca;
        const visivel = item.querySelector('.check_visivel').checked;
        marcasObj[nome] = {
            ordem: index + 1,
            visivel: visivel
        };
    });

    const geralObj = {
        diasAviso: parseInt(el('cfg_dias_aviso').value) || 7,
        horarios: el('cfg_horarios').value.split(',').map(h => h.trim())
    };

    try {
        // Salva as duas partes no Firebase do usuário
        await setDoc(doc(db, "usuarios", username, "configs", "marcas"), marcasObj);
        await setDoc(doc(db, "usuarios", username, "configs", "geral"), geralObj);

        toque('mario_coin_s');
        alert("Configurações salvas na nuvem com sucesso!");
    } catch (e) {
        alert("Erro ao salvar.");
    } finally {
        btn.innerText = "SALVAR TUDO";
        btn.disabled = false;
    }
}

/* ============================================================
   5. DRAG AND DROP (ARRASTAR)
============================================================ */
function initDragAndDrop() {
    const container = el('lista_marcas_sortable');

    container.addEventListener('dragstart', e => {
        if (e.target.classList.contains('marca_item')) e.target.classList.add('dragging');
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