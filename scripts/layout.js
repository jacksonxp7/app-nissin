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
            if (window.Capacitor && foto.startsWith('file:')) {
                foto = window.Capacitor.convertFileSrc(foto);
            }

            return `
                <div class="marca_layout" data-marca="${marca}" style="margin-bottom:10px; border:1px solid #ddd; border-radius:8px; overflow:hidden;">
                    <p class="titulo_layout" style="background:#2c3e50; color:white; padding:12px; margin:0; cursor:pointer;">${marca.toUpperCase()}</p>
                    <div class="corpo_layout fechar" style="display:none; background:#fff;">
                        ${foto ? `
                            <img src="${foto}" loading="lazy" style="width:100%; display:block; min-height:100px;">
                            <button class="btn_mudar_layout" style="width:100%; padding:12px; background:#34495e; color:white; border:none;">📸 TROCAR FOTO</button>
                        ` : `
                            <div class="placeholder_upload" style="padding:40px; text-align:center; color:#7f8c8d; cursor:pointer;">
                                ➕ ADICIONAR LAYOUT
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

            const capturarLayout = async () => {
                try {
                    const image = await Camera.getPhoto({
                        quality: 90,
                        resultType: 'base64',
                        source: 'PROMPT',
                        width: 1200
                    });

                    let caminhoFinal = `data:image/jpeg;base64,${image.base64String}`;

                    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                        // SOLICITA PERMISSÃO DE ARMAZENAMENTO
                        const perms = await Filesystem.requestPermissions();
                        if (perms.publicStorage !== 'granted') {
                            alert("Permissão negada para salvar.");
                            return;
                        }

                        const nomeFile = `layout_${marca.replace(/\s+/g, '_')}.jpg`;
                        const salvo = await Filesystem.writeFile({
                            path: `Pictures/Ikeda/Layout/${nomeFile}`,
                            data: image.base64String,
                            directory: 'EXTERNAL_STORAGE',
                            recursive: true
                        });
                        caminhoFinal = salvo.uri;
                    }

                    const layouts = JSON.parse(localStorage.getItem('app_layouts')) || {};
                    layouts[marca] = caminhoFinal;
                    localStorage.setItem('app_layouts', JSON.stringify(layouts));

                    toque('mario_coin_s');
                    renderizarLayouts();
                } catch (err) { console.log("Cancelado"); }
            };

            const btn = bloco.querySelector('.btn_mudar_layout') || bloco.querySelector('.placeholder_upload');
            if (btn) btn.onclick = capturarLayout;
        });
    };

    renderizarLayouts();
}