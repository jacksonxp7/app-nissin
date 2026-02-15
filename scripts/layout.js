import { el, toque } from './utils.js';
import { getMarcasConfig } from './configs.js';

const Plugins = window.Capacitor?.Plugins;
const { Filesystem, Camera } = Plugins || {};

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
        const fotosSalvas = JSON.parse(localStorage.getItem('app_layouts')) || {};

        const marcasOrdenadas = Object.keys(cfgMarcas)
            .filter(marca => cfgMarcas[marca].visivel !== false)
            .sort((a, b) => (cfgMarcas[a].ordem || 999) - (cfgMarcas[b].ordem || 999));

        listaDinamica.innerHTML = marcasOrdenadas.map(marca => {
            let foto = fotosSalvas[marca] || "";

            // Converte o caminho para exibição no Android
            if (window.Capacitor && foto.startsWith('file:')) {
                foto = window.Capacitor.convertFileSrc(foto);
            }

            return `
                <div class="marca_layout" data-marca="${marca}">
                    <p class="titulo_layout">${marca.toUpperCase()}</p>
                    <div class="corpo_layout fechar">
                        ${foto ? `
                            <img src="${foto}" loading="lazy" style="width:100%;">
                            <button class="btn_mudar_layout">📸 TROCAR FOTO</button>
                        ` : `
                            <div class="placeholder_upload" style="border:2px dashed #ccc; padding:20px; text-align:center;">
                                <span>➕ ADICIONAR LAYOUT</span>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }).join('');

        configurarEventos();
    };

    const configurarEventos = () => {
        container.querySelectorAll('.marca_layout').forEach(bloco => {
            const marca = bloco.dataset.marca;
            const titulo = bloco.querySelector('.titulo_layout');
            const corpo = bloco.querySelector('.corpo_layout');

            titulo.onclick = () => {
                const fechar = corpo.classList.contains('fechar');
                container.querySelectorAll('.corpo_layout').forEach(c => c.classList.add('fechar'));
                if (fechar) corpo.classList.remove('fechar');
            };

            const acaoFoto = async () => {
                try {
                    const image = await Camera.getPhoto({
                        quality: 70,
                        resultType: 'base64',
                        source: 'PROMPT',
                        width: 1000
                    });

                    let caminhoFinal = `data:image/jpeg;base64,${image.base64String}`;

                    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                        const nomeFile = `layout_${marca.replace(/\s+/g, '_')}.jpg`;
                        const salvo = await Filesystem.writeFile({
                            path: `layouts/${nomeFile}`,
                            data: image.base64String,
                            directory: 'DATA',
                            recursive: true
                        });
                        caminhoFinal = salvo.uri;
                    }

                    const layouts = JSON.parse(localStorage.getItem('app_layouts')) || {};
                    layouts[marca] = caminhoFinal;
                    localStorage.setItem('app_layouts', JSON.stringify(layouts));

                    toque('mario_coin_s');
                    renderizarLayouts();
                } catch (err) {
                    console.log("Captura cancelada.");
                }
            };

            const btn = bloco.querySelector('.btn_mudar_layout') || bloco.querySelector('.placeholder_upload');
            if (btn) btn.onclick = acaoFoto;
        });
    };

    renderizarLayouts();
}