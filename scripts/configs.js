import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

/**
 * Busca configurações gerais de aviso e horários do Firebase
 */
export async function getConfigs() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return { diasAviso: 7, horarios: ["07:00"] };
    try {
        const snap = await getDoc(doc(db, "usuarios", userSessao.nome, "configs", "geral"));
        return snap.exists() ? snap.data() : { diasAviso: 7, horarios: ["07:00"] };
    } catch (e) { return { diasAviso: 7, horarios: ["07:00"] }; }
}

/**
 * Busca a ordem e visibilidade das marcas do Firebase
 */
export async function getMarcasConfig() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return {};
    try {
        const snap = await getDoc(doc(db, "usuarios", userSessao.nome, "configs", "marcas"));
        return snap.exists() ? snap.data() : {};
    } catch (e) { return {}; }
}

/**
 * Inicializa a tela de configurações
 */
export async function configs_screen() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return;

    // 1. Busca dados do Firebase
    const marcasFirebaseSnap = await getDocs(collection(db, 'produtos'));
    const marcasFirebase = marcasFirebaseSnap.docs.map(d => d.id);
    const cfgMarcas = await getMarcasConfig();
    const cfgGeral = await getConfigs();

    // 2. Preenche os inputs de texto
    el('cfg_dias_aviso').value = cfgGeral.diasAviso || 7;
    el('cfg_horarios').value = (cfgGeral.horarios || []).join(', ');

    // 3. Renderiza a lista de marcas para ordenar e ocultar
    const container = el('lista_marcas_sortable');
    if (!container) return;

    // Ordena as marcas conforme o que está salvo na nuvem antes de mostrar
    const marcasOrdenadas = marcasFirebase.sort((a, b) => {
        const ordemA = cfgMarcas[a]?.ordem ?? 999;
        const ordemB = cfgMarcas[b]?.ordem ?? 999;
        return ordemA - ordemB;
    });

    container.innerHTML = marcasOrdenadas.map(marca => `
        <div class="marca_item" data-marca="${marca}" style="display:flex; align-items:center; justify-content:space-between; padding:15px; background:white; margin-bottom:8px; border-radius:10px; border:1px solid #ddd; cursor: grab;">
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="color:#aaa; font-size:20px;">☰</span>
                <span style="font-weight:bold; color:#2c3e50;">${marca.toUpperCase()}</span>
            </div>
            <input type="checkbox" class="check_visivel" style="width:22px; height:22px;" ${cfgMarcas[marca]?.visivel !== false ? 'checked' : ''}>
        </div>
    `).join('');

    // 4. ATIVA O ARRASTAR (SortableJS)
    // Nota: Certifique-se de ter o script <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script> no seu index.html
    if (window.Sortable) {
        new Sortable(container, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            handle: '.marca_item'
        });
    } else {
        console.warn("Biblioteca SortableJS não encontrada no index.html");
    }

    // 5. BOTÃO SALVAR
    el('salvar_configs').onclick = async () => {
        const btn = el('salvar_configs');
        btn.innerText = "SALVANDO NA NUVEM...";
        btn.disabled = true;

        try {
            const marcasObj = {};
            // Pega a ordem atual dos elementos na tela após o arrasto
            container.querySelectorAll('.marca_item').forEach((item, index) => {
                const nomeMarca = item.dataset.marca;
                const estaVisivel = item.querySelector('.check_visivel').checked;
                marcasObj[nomeMarca] = {
                    ordem: index + 1,
                    visivel: estaVisivel
                };
            });

            const horariosArray = el('cfg_horarios').value.split(',').map(h => h.trim()).filter(h => h !== "");
            const geralObj = {
                diasAviso: parseInt(el('cfg_dias_aviso').value) || 7,
                horarios: horariosArray
            };

            // Grava no Firebase (Conta do Usuário)
            await setDoc(doc(db, "usuarios", userSessao.nome, "configs", "geral"), geralObj);
            await setDoc(doc(db, "usuarios", userSessao.nome, "configs", "marcas"), marcasObj);

            toque('mario_coin_s');
            alert("Configurações atualizadas com sucesso!");

            // 6. ATUALIZA O SISTEMA
            // Forçamos um reload ou chamamos as funções de carregamento para que a nova ordem 
            // seja aplicada imediatamente no Estoque e no Layout.
            location.reload();

        } catch (e) {
            console.error(e);
            alert("Erro ao salvar no Firebase.");
        } finally {
            btn.innerText = "SALVAR CONFIGURAÇÕES";
            btn.disabled = false;
        }
    };
}