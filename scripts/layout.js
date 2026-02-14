import { el, toque } from './utils.js';
import { getMarcasConfig } from './configs.js';

/**
 * ABA LAYOUT DINÂMICA
 * Baseada estritamente nas Configurações (Ordem e Visibilidade)
 */
export function layout() {
    const container = el('layout');
    if (!container) return;

    // 1. Garante a existência do input de arquivo oculto
    let inputFoto = el('input_layout_foto');
    if (!inputFoto) {
        inputFoto = document.createElement('input');
        inputFoto.type = 'file';
        inputFoto.id = 'input_layout_foto';
        inputFoto.accept = 'image/*';
        inputFoto.capture = 'environment';
        inputFoto.style.display = 'none';
        container.appendChild(inputFoto);
    }

    // 2. Garante a existência do container da lista
    let listaDinamica = el('lista_layout_dinamica');
    if (!listaDinamica) {
        listaDinamica = document.createElement('div');
        listaDinamica.id = ('lista_layout_dinamica');
        container.appendChild(listaDinamica);
    }

    let marcaSendoEditada = "";

    // Função interna para desenhar a interface
    const renderizarLayouts = () => {
        const cfgMarcas = getMarcasConfig(); // Pega o objeto de configs { MARCA: {ordem, visivel} }
        const fotosSalvas = JSON.parse(localStorage.getItem('app_layouts')) || {};

        // Transforma o objeto em array, filtra os visíveis e ORDENA conforme as Configs
        const marcasOrdenadas = Object.keys(cfgMarcas)
            .filter(marca => cfgMarcas[marca].visivel !== false) // Só os ativos
            .sort((a, b) => (cfgMarcas[a].ordem || 999) - (cfgMarcas[b].ordem || 999)); // Respeita o Drag & Drop

        if (marcasOrdenadas.length === 0) {
            listaDinamica.innerHTML = `
                <div style="text-align:center; padding:40px; color:#555;">
                    <p>Nenhuma marca ativa.</p>
                    <small>Ative e ordene as marcas na aba <b>Configurações</b>.</small>
                </div>`;
            return;
        }

        listaDinamica.innerHTML = marcasOrdenadas.map(marca => {
            const foto = fotosSalvas[marca];
            return `
                <div class="marca_layout" data-marca="${marca}">
                    <p class="titulo_layout">${marca.toUpperCase()}</p>
                    <div class="corpo_layout fechar">
                        ${foto ? `
                            <img src="${foto}" alt="Layout ${marca}">
                            <button class="btn_mudar_layout">📸 TROCAR FOTO</button>
                        ` : `
                            <div class="placeholder_upload">
                                <span style="font-size: 50px;">➕</span>
                                <span>ADICIONAR FOTO DE LAYOUT</span>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }).join('');

        configurarEventos();
    };

    // Configura os cliques de Accordion e Upload
    const configurarEventos = () => {
        container.querySelectorAll('.marca_layout').forEach(bloco => {
            const marca = bloco.dataset.marca;
            const titulo = bloco.querySelector('.titulo_layout');
            const corpo = bloco.querySelector('.corpo_layout');
            const btnTrocar = bloco.querySelector('.btn_mudar_layout');
            const placeholder = bloco.querySelector('.placeholder_upload');

            // Abrir/Fechar (Accordion)
            titulo.onclick = () => {
                const estaFechado = corpo.classList.contains('fechar');
                
                // Fecha todos para efeito sanfona
                container.querySelectorAll('.corpo_layout').forEach(c => {
                    c.classList.add('fechar');
                    c.classList.remove('abrir');
                });

                if (estaFechado) {
                    corpo.classList.remove('fechar');
                    corpo.classList.add('abrir');
                    toque('cursor_s');
                } else {
                    toque('decide_s');
                }
            };

            // Ação de abrir câmera/galeria
            const dispararUpload = () => {
                marcaSendoEditada = marca;
                inputFoto.click();
            };

            if (btnTrocar) btnTrocar.onclick = dispararUpload;
            if (placeholder) placeholder.onclick = dispararUpload;
        });
    };

    // Evento do input de arquivo (quando a foto é tirada)
    inputFoto.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result;
            const layouts = JSON.parse(localStorage.getItem('app_layouts')) || {};
            
            layouts[marcaSendoEditada] = base64;
            localStorage.setItem('app_layouts', JSON.stringify(layouts));

            toque('mario_coin_s');
            renderizarLayouts(); // Atualiza a lista na hora
        };
        reader.readAsDataURL(file);
    };

    // Inicializa a renderização
    renderizarLayouts();
}