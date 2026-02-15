import { el, toque, hojeISO } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Acesso aos plugins do Capacitor
const { Filesystem, Directory } = window.Capacitor?.Plugins || {};

let fotoBase64 = ""; 

/**
 * Redimensiona a imagem para não travar a memória RAM
 */
async function comprimirImagem(base64Str) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800; // Tamanho ideal para celular
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7)); // Qualidade 70%
        };
    });
}

export async function giro_vendas_screen() {
    const btnAddGiro = el('btn_add_giro');
    const inputFoto = el('giro_foto');
    const inputData = el('giro_data');
    const previewContainer = el('preview_container');
    const imgPreview = el('giro_foto_preview');

    if (inputData) inputData.value = hojeISO();

    await carregarCategoriasGiro();

    if (inputFoto) {
        inputFoto.removeAttribute('capture'); 
        inputFoto.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onloadend = async () => {
                // Comprime antes de mostrar no preview
                fotoBase64 = await comprimirImagem(reader.result);
                if (imgPreview) imgPreview.src = fotoBase64;
                if (previewContainer) previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        };
    }

    if (btnAddGiro) {
        btnAddGiro.onclick = null;
        btnAddGiro.onclick = adicionarGiro;
    }

    renderizarGirosAccordion();
}

async function carregarCategoriasGiro() {
    const select = el('giro_local');
    if (!select) return;
    select.innerHTML = '<option value="PONTO EXTRA">⭐ PONTO EXTRA</option>';
    try {
        const snap = await getDocs(collection(db, 'produtos'));
        snap.forEach(doc => {
            const opt = document.createElement('option');
            const nomeMarca = doc.id.toUpperCase();
            opt.value = nomeMarca;
            opt.textContent = nomeMarca;
            select.appendChild(opt);
        });
    } catch (e) { console.error(e); }
}

/**
 * SALVA NO DISCO DO CELULAR
 */
async function adicionarGiro() {
    const local = el('giro_local').value;
    const data = el('giro_data').value;

    if (!local || !data || !fotoBase64) {
        alert("Preencha tudo e selecione uma Foto!");
        return;
    }

    try {
        let caminhoFinal = fotoBase64;

        // Se estiver no celular, salva como arquivo real
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const nomeArquivo = `giro_${Date.now()}.jpg`;
            const gravado = await Filesystem.writeFile({
                path: `giros/${nomeArquivo}`,
                data: fotoBase64.split(',')[1],
                directory: 'DATA', // Salva na memória interna do App
                recursive: true
            });
            caminhoFinal = gravado.uri;
        }

        const novoGiro = {
            id: Date.now(),
            local: local,
            data: data.split('-').reverse().join('/'),
            foto: caminhoFinal // Agora guarda apenas o link do arquivo
        };

        const giros = JSON.parse(localStorage.getItem('giros_vendas')) || [];
        giros.push(novoGiro);
        localStorage.setItem('giros_vendas', JSON.stringify(giros));

        fotoBase64 = "";
        if (el('preview_container')) el('preview_container').style.display = 'none';
        toque('mario_coin_s');
        renderizarGirosAccordion();
    } catch (err) {
        alert("Erro ao salvar foto: " + err.message);
    }
}

function renderizarGirosAccordion() {
    const container = el('lista_giros');
    if (!container) return;

    const giros = JSON.parse(localStorage.getItem('giros_vendas')) || [];
    container.innerHTML = '';

    const agrupados = giros.reduce((acc, giro) => {
        if (!acc[giro.local]) acc[giro.local] = [];
        acc[giro.local].push(giro);
        return acc;
    }, {});

    Object.keys(agrupados).forEach(marca => {
        const btnHeader = document.createElement('div');
        btnHeader.className = 'giro_aba_header'; 
        btnHeader.innerHTML = `<span>${marca}</span> <small>(${agrupados[marca].length})</small>`;

        const corpoLista = document.createElement('div');
        corpoLista.className = 'giro_aba_corpo fechar_giro'; 

        agrupados[marca].reverse().forEach(g => {
            // Converte o caminho do arquivo para algo que o HTML consiga ler
            const srcFinal = (window.Capacitor && g.foto.startsWith('file:')) 
                ? window.Capacitor.convertFileSrc(g.foto) 
                : g.foto;

            const item = document.createElement('div');
            item.className = 'giro_item_foto';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px; border-bottom: 1px solid #eee;">
                    <span style="font-size:13px; font-weight:bold;">📅 ${g.data}</span>
                    <button class="giro_btn_excluir" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px;">EXCLUIR</button>
                </div>
                <img src="${srcFinal}" loading="lazy" style="width:100%; border-radius:0 0 8px 8px; display:block;">
            `;

            item.querySelector('.giro_btn_excluir').onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`Excluir foto?`)) {
                    // Tenta apagar o arquivo físico também
                    if (window.Capacitor && g.foto.startsWith('file:')) {
                        try { await Filesystem.deleteFile({ path: g.foto }); } catch(e){}
                    }
                    const filtrados = giros.filter(f => f.id !== g.id);
                    localStorage.setItem('giros_vendas', JSON.stringify(filtrados));
                    renderizarGirosAccordion();
                }
            };
            corpoLista.appendChild(item);
        });

        btnHeader.onclick = () => {
            const estaFechado = corpoLista.classList.contains('fechar_giro');
            document.querySelectorAll('.giro_aba_corpo').forEach(c => c.classList.add('fechar_giro'));
            if (estaFechado) {
                corpoLista.classList.remove('fechar_giro');
                toque('cursor_s');
            }
        };
        container.append(btnHeader, corpoLista);
    });
}