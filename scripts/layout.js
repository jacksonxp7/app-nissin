import { el, toque } from './utils.js';
import { getMarcasConfig } from './configs.js';

const Plugins = window.Capacitor?.Plugins;
const { Filesystem, Camera } = Plugins || {};

export function layout() {
    const container = el('layout');
    if (!container) return;

    // Garante que o container interno exista
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

        if (marcasOrdenadas.length === 0) {
            listaDinamica.innerHTML = '<p style="text-align:center; padding:20px;">Nenhuma marca ativa no Config.</p>';
            return;
        }

        listaDinamica.innerHTML = marcasOrdenadas.map(marca => {
            let foto = fotosSalvas[marca] || "";
            if (window.Capacitor && foto.startsWith('file:')) {
                foto = window.Capacitor.convertFileSrc(foto);
            }

            return `
                <div class="marca_layout" data-marca="${marca}" style="margin-bottom:10px; border:1px solid #ddd; border-radius:8px; overflow:hidden;">
                    <p class="titulo_layout" style="background:#2c3e50; color:white; padding:12px; margin:0; cursor:pointer; font-weight:bold;">${marca.toUpperCase()}</p>
                    <div class="corpo_layout fechar" style="background:#fff;">
                        ${foto ? `
                            <img src="${foto}" loading="lazy" style="width:100%; display:block;">
                            <button class="btn_mudar_layout" style="width:100%; padding:10px; background:#34495e; color:white; border:none;">📸 TROCAR FOTO</button>
                        ` : `
                            <div class="placeholder_upload" style="padding:40px; text-align:center; color:#7f8c8d; cursor:pointer;">
                                <span style="font-size:30px;">➕</span><br>ADICIONAR LAYOUT
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
                // Efeito sanfona: fecha os outros
                container.querySelectorAll('.corpo_layout').forEach(c => {
                    c.style.display = 'none';
                    c.classList.add('fechar');
                });

                if (fechar) {
                    corpo.style.display = 'block';
                    corpo.classList.remove('fechar');
                    toque('cursor_s');
                }
            };

            // Se estiver fechado inicialmente, garantimos que o CSS acompanhe
            corpo.style.display = corpo.classList.contains('fechar') ? 'none' : 'block';

            const capturarLayout = async () => {
                try {
                    const image = await Camera.getPhoto({
                        quality: 80,
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
                } catch (err) { console.log("Cancelado"); }
            };

            const btn = bloco.querySelector('.btn_mudar_layout') || bloco.querySelector('.placeholder_upload');
            if (btn) btn.onclick = capturarLayout;
        });
    };

    renderizarLayouts();
}