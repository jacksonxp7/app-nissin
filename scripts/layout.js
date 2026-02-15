import { el, toque } from './utils.js';
import { getMarcasConfig } from './configs.js';

const { Filesystem } = window.Capacitor?.Plugins || {};

/**
 * Redimensiona a imagem para layout
 */
async function comprimirLayout(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1000; 
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
    });
}

export function layout() {
    const container = el('layout');
    if (!container) return;

    let inputFoto = el('input_layout_foto');
    if (!inputFoto) {
        inputFoto = document.createElement('input');
        inputFoto.type = 'file';
        inputFoto.id = 'input_layout_foto';
        inputFoto.accept = 'image/*';
        inputFoto.style.display = 'none';
        container.appendChild(inputFoto);
    }

    let listaDinamica = el('lista_layout_dinamica');
    if (!listaDinamica) {
        listaDinamica = document.createElement('div');
        listaDinamica.id = 'lista_layout_dinamica';
        container.appendChild(listaDinamica);
    }

    let marcaSendoEditada = "";

    const renderizarLayouts = () => {
        const cfgMarcas = getMarcasConfig();
        const fotosSalvas = JSON.parse(localStorage.getItem('app_layouts')) || {};

        const marcasOrdenadas = Object.keys(cfgMarcas)
            .filter(marca => cfgMarcas[marca].visivel !== false)
            .sort((a, b) => (cfgMarcas[a].ordem || 999) - (cfgMarcas[b].ordem || 999));

        listaDinamica.innerHTML = marcasOrdenadas.map(marca => {
            let foto = fotosSalvas[marca] || "";
            
            // Converte se for caminho de arquivo
            if (window.Capacitor && foto.startsWith('file:')) {
                foto = window.Capacitor.convertFileSrc(foto);
            }

            return `
                <div class="marca_layout" data-marca="${marca}">
                    <p class="titulo_layout">${marca.toUpperCase()}</p>
                    <div class="corpo_layout fechar">
                        ${foto ? `
                            <img src="${foto}" loading="lazy" alt="Layout ${marca}">
                            <button class="btn_mudar_layout">📸 TROCAR FOTO</button>
                        ` : `
                            <div class="placeholder_upload">
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
                if (fechar) {
                    corpo.classList.remove('fechar');
                    toque('cursor_s');
                }
            };

            const btn = bloco.querySelector('.btn_mudar_layout') || bloco.querySelector('.placeholder_upload');
            if (btn) btn.onclick = () => {
                marcaSendoEditada = marca;
                inputFoto.click();
            };
        });
    };

    inputFoto.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Comprimido = await comprimirLayout(reader.result);
            let caminhoParaSalvar = base64Comprimido;

            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                const nomeFile = `layout_${marcaSendoEditada}.jpg`;
                const salvo = await Filesystem.writeFile({
                    path: `layouts/${nomeFile}`,
                    data: base64Comprimido.split(',')[1],
                    directory: 'DATA',
                    recursive: true
                });
                caminhoParaSalvar = salvo.uri;
            }

            const layouts = JSON.parse(localStorage.getItem('app_layouts')) || {};
            layouts[marcaSendoEditada] = caminhoParaSalvar;
            localStorage.setItem('app_layouts', JSON.stringify(layouts));

            toque('mario_coin_s');
            renderizarLayouts();
        };
        reader.readAsDataURL(file);
    };

    renderizarLayouts();
}