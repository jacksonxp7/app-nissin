import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

export async function getConfigs() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return { diasAviso: 7, horarios: ["07:00"] };
    try {
        const snap = await getDoc(doc(db, "usuarios", userSessao.nome, "configs", "geral"));
        return snap.exists() ? snap.data() : { diasAviso: 7, horarios: ["07:00"] };
    } catch (e) { return { diasAviso: 7, horarios: ["07:00"] }; }
}

export async function getMarcasConfig() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return {};
    try {
        const snap = await getDoc(doc(db, "usuarios", userSessao.nome, "configs", "marcas"));
        return snap.exists() ? snap.data() : {};
    } catch (e) { return {}; }
}

/**
 * LÓGICA DE ARRASTE CUSTOMIZADA (SEM BIBLIOTECAS)
 */
function initManualDrag(container) {
    let dragItem = null;
    let placeholder = null;

    container.addEventListener('mousedown', startDrag);
    container.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
        // Só arrasta se clicar na handle (☰)
        const handle = e.target.closest('.handle');
        if (!handle) return;

        e.preventDefault();
        dragItem = handle.closest('.marca_item');
        
        // Cria um espaço vazio (placeholder) para manter o buraco na lista
        placeholder = document.createElement('div');
        placeholder.className = 'drag-placeholder';
        placeholder.style.height = dragItem.offsetHeight + 'px';
        placeholder.style.marginBottom = '10px';
        placeholder.style.borderRadius = '12px';
        placeholder.style.background = '#f1f2f6';
        placeholder.style.border = '2px dashed #ccc';

        // Estiliza o item que está sendo carregado
        const rect = dragItem.getBoundingClientRect();
        dragItem.style.width = rect.width + 'px';
        dragItem.style.position = 'fixed';
        dragItem.style.top = rect.top + 'px';
        dragItem.style.left = rect.left + 'px';
        dragItem.style.zIndex = '9999';
        dragItem.style.pointerEvents = 'none';
        dragItem.classList.add('dragging-active');

        dragItem.after(placeholder);

        window.addEventListener('mousemove', moveDrag);
        window.addEventListener('touchmove', moveDrag, { passive: false });
        window.addEventListener('mouseup', endDrag);
        window.addEventListener('touchend', endDrag);
    }

    function moveDrag(e) {
        if (!dragItem) return;

        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        
        // Faz o item seguir o mouse exatamente no centro
        const height = dragItem.offsetHeight;
        dragItem.style.top = (clientY - height / 2) + 'px';

        // Detecta sobre qual item estamos passando
        const siblings = [...container.querySelectorAll('.marca_item:not(.dragging-active)')];
        const nextSibling = siblings.find(sibling => {
            const rect = sibling.getBoundingClientRect();
            return clientY < rect.top + rect.height / 2;
        });

        if (nextSibling) {
            container.insertBefore(placeholder, nextSibling);
        } else {
            container.appendChild(placeholder);
        }
    }

    function endDrag() {
        if (!dragItem) return;

        // Finaliza o arraste colocando o item real no lugar do placeholder
        placeholder.after(dragItem);
        
        // Reseta estilos
        dragItem.style.position = '';
        dragItem.style.top = '';
        dragItem.style.left = '';
        dragItem.style.width = '';
        dragItem.style.zIndex = '';
        dragItem.style.pointerEvents = '';
        dragItem.classList.remove('dragging-active');
        
        placeholder.remove();
        dragItem = null;

        window.removeEventListener('mousemove', moveDrag);
        window.removeEventListener('touchmove', moveDrag);
        window.removeEventListener('mouseup', endDrag);
        window.removeEventListener('touchend', endDrag);
    }
}

export async function configs_screen() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return;

    const [marcasFirebaseSnap, cfgMarcas, cfgGeral] = await Promise.all([
        getDocs(collection(db, 'produtos')),
        getMarcasConfig(),
        getConfigs()
    ]);

    const marcasFirebase = marcasFirebaseSnap.docs.map(d => d.id);

    // Preenche inputs
    const cAviso = el('cfg_dias_aviso');
    const cHoras = el('cfg_horarios');
    if (cAviso) cAviso.value = cfgGeral.diasAviso || 7;
    if (cHoras) cHoras.value = (cfgGeral.horarios || []).join(', ');

    const container = el('lista_marcas_sortable');
    if (!container) return;

    // Estilos para o efeito visual
    if (!document.getElementById('manual-drag-style')) {
        const style = document.createElement('style');
        style.id = 'manual-drag-style';
        style.innerHTML = `
            .marca_item { transition: box-shadow 0.2s; }
            .dragging-active { 
                box-shadow: 0 15px 30px rgba(0,0,0,0.2) !important; 
                opacity: 0.95; 
                border-color: #3498db !important;
            }
            .handle { 
                cursor: grab; 
                padding: 10px 15px; 
                font-size: 20px; 
                color: #ccc; 
                user-select: none; 
            }
            .handle:active { cursor: grabbing; }
        `;
        document.head.appendChild(style);
    }

    // Ordena
    const marcasOrdenadas = marcasFirebase.sort((a, b) => {
        const ordemA = cfgMarcas[a]?.ordem ?? 999;
        const ordemB = cfgMarcas[b]?.ordem ?? 999;
        return ordemA - ordemB;
    });

    container.innerHTML = marcasOrdenadas.map(marca => `
        <div class="marca_item" data-marca="${marca}" style="display:flex; align-items:center; justify-content:space-between; padding:5px 15px; background:white; margin-bottom:10px; border-radius:12px; border:1px solid #ddd;">
            <div style="display:flex; align-items:center; flex:1;">
                <div class="handle">☰</div>
                <span style="font-weight:bold; color:#2c3e50;">${marca.toUpperCase()}</span>
            </div>
            <input type="checkbox" class="check_visivel" style="width:22px; height:22px; cursor:pointer;" ${cfgMarcas[marca]?.visivel !== false ? 'checked' : ''}>
        </div>
    `).join('');

    // Inicializa o sistema manual
    initManualDrag(container);

    // Botão Salvar
    const btn = el('salvar_configs');
    if (btn) {
        btn.onclick = async () => {
            btn.innerText = "SALVANDO...";
            btn.disabled = true;

            try {
                const marcasObj = {};
                container.querySelectorAll('.marca_item').forEach((item, index) => {
                    const nomeMarca = item.dataset.marca;
                    const estaVisivel = item.querySelector('.check_visivel').checked;
                    marcasObj[nomeMarca] = { ordem: index + 1, visivel: estaVisivel };
                });

                const geralObj = {
                    diasAviso: parseInt(el('cfg_dias_aviso').value) || 7,
                    horarios: el('cfg_horarios').value.split(',').map(h => h.trim()).filter(h => h !== "")
                };

                await setDoc(doc(db, "usuarios", userSessao.nome, "configs", "geral"), geralObj);
                await setDoc(doc(db, "usuarios", userSessao.nome, "configs", "marcas"), marcasObj);

                if (typeof toque === 'function') toque('mario_coin_s');
                alert("Configurações atualizadas!");
                location.reload();
            } catch (e) {
                alert("Erro ao salvar.");
            } finally {
                btn.innerText = "SALVAR CONFIGURAÇÕES";
                btn.disabled = false;
            }
        };
    }
}