import { el, toque } from './utils.js';
import { getMarcasConfig } from './configs.js';

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

export function layout() {
    const container = el('layout');
    if (!container) return;

    let listaDinamica = el('lista_layout_dinamica');
    if (!listaDinamica) {
        listaDinamica = document.createElement('div');
        listaDinamica.id = 'lista_layout_dinamica';
        container.appendChild(listaDinamica);
    }

    const renderizarLayouts = () => {
        const cfgMarcas = getMarcasConfig();
        // Agora o app_layouts guarda um objeto onde cada marca tem um ARRAY de fotos
        const fotosSalvas = JSON.parse(localStorage.getItem('app_layouts')) || {};

        const marcasOrdenadas = Object.keys(cfgMarcas)
            .filter(marca => cfgMarcas[marca].visivel !== false)
            .sort((a, b) => (cfgMarcas[a].ordem || 999) - (cfgMarcas[b].ordem || 999));

        listaDinamica.innerHTML = marcasOrdenadas.map(marca => {
            // Garante que fotos seja um array
            const fotos = Array.isArray(fotosSalvas[marca]) ? fotosSalvas[marca] : (fotosSalvas[marca] ? [fotosSalvas[marca]] : []);
            
            return `
                <div class="marca_layout" data-marca="${marca}" style="margin-bottom:10px; border:1px solid #ddd; border-radius:8px; overflow:hidden;">
                    <p class="titulo_layout" style="background:#2c3e50; color:white; padding:12px; margin:0; cursor:pointer;">
                        ${marca.toUpperCase()} <span style="float:right;">(${fotos.length})</span>
                    </p>
                    <div class="corpo_layout fechar" style="display:none; background:#fff;">
                        <div class="lista_fotos_layout" style="display: flex; flex-direction: column; gap: 5px;">
                            ${fotos.map((url, index) => `
                                <div style="position:relative; border-bottom: 2px solid #eee;">
                                    <img src="${url}" loading="lazy" style="width:100%; display:block;">
                                    <button class="btn_del_layout" data-index="${index}" style="position:absolute; top:5px; right:5px; background:rgba(231, 76, 60, 0.8); color:white; border:none; padding:5px 10px; border-radius:5px;">X</button>
                                </div>
                            `).join('')}
                        </div>
                        <button class="btn_add_foto_layout" style="width:100%; padding:15px; background:#27ae60; color:white; border:none; font-weight:bold;">
                            ➕ ADICIONAR NOVA FOTO
                        </button>
                    </div>
                </div>`;
        }).join('');

        configurarEventos();
    };

    const configurarEventos = () => {
        container.querySelectorAll('.marca_layout').forEach(bloco => {
            const marca = bloco.dataset.marca;
            const titulo = bloco.querySelector('.titulo_layout');
            const corpo = bloco.querySelector('.corpo_layout');

            titulo.onclick = () => {
                const fechado = corpo.classList.contains('fechar');
                container.querySelectorAll('.corpo_layout').forEach(c => {
                    c.style.display = 'none';
                    c.classList.add('fechar');
                });
                if (fechado) {
                    corpo.style.display = 'block';
                    corpo.classList.remove('fechar');
                }
            };

            // BOTÃO DE EXCLUIR FOTO ESPECÍFICA
            bloco.querySelectorAll('.btn_del_layout').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm("Remover esta foto?")) {
                        const index = parseInt(btn.dataset.index);
                        const layouts = JSON.parse(localStorage.getItem('app_layouts')) || {};
                        layouts[marca].splice(index, 1);
                        localStorage.setItem('app_layouts', JSON.stringify(layouts));
                        renderizarLayouts();
                    }
                };
            });

            // BOTÃO DE ADICIONAR FOTO
            const btnAdd = bloco.querySelector('.btn_add_foto_layout');
            if (btnAdd) {
                btnAdd.onclick = async () => {
                    try {
                        const image = await Camera.getPhoto({
                            quality: 60,
                            resultType: 'base64',
                            source: 'PROMPT',
                            width: 1000
                        });

                        btnAdd.innerText = "SUBINDO FOTO...";
                        btnAdd.disabled = true;

                        const usuario = JSON.parse(localStorage.getItem('cadastros'))?.nome || 'anonimo';
                        const nomeArquivo = `${usuario}_layout_${marca}_${Date.now()}`;

                        const formData = new FormData();
                        formData.append("image", image.base64String);

                        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}&name=${nomeArquivo}`, {
                            method: "POST",
                            body: formData
                        });

                        const result = await response.json();

                        if (result.success) {
                            const layouts = JSON.parse(localStorage.getItem('app_layouts')) || {};
                            if (!Array.isArray(layouts[marca])) {
                                layouts[marca] = layouts[marca] ? [layouts[marca]] : [];
                            }
                            layouts[marca].push(result.data.url);
                            localStorage.setItem('app_layouts', JSON.stringify(layouts));

                            toque('mario_coin_s');
                            renderizarLayouts();
                        }
                    } catch (err) { console.log("Erro: " + err.message); }
                    finally {
                        btnAdd.innerText = "➕ ADICIONAR NOVA FOTO";
                        btnAdd.disabled = false;
                    }
                };
            }
        });
    };

    renderizarLayouts();
}