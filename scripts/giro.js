import { el, toque, hojeISO } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Plugins do Capacitor
const Plugins = window.Capacitor?.Plugins;
const Filesystem = Plugins?.Filesystem;
const Camera = Plugins?.Camera;

let fotoBase64 = ""; 

/**
 * INICIALIZAÇÃO DA ABA GIRO
 */
export async function giro_vendas_screen() {
    const btnAddGiro = el('btn_add_giro');
    const areaFoto = el('giro_foto_area'); // Área onde o usuário clica para tirar foto
    const inputData = el('giro_data');
    const previewContainer = el('preview_container');
    const imgPreview = el('giro_foto_preview');

    if (inputData) inputData.value = hojeISO();

    await carregarCategoriasGiro();

    // 📸 FUNÇÃO PARA TIRAR FOTO OU ESCOLHER GALERIA
    const capturarFoto = async () => {
        if (!Camera) {
            alert("Plugin de Câmera não detectado.");
            return;
        }
        try {
            const image = await Camera.getPhoto({
                quality: 70,
                allowEditing: false,
                resultType: 'base64',
                source: 'PROMPT', // Pergunta se quer Câmera ou Galeria
                saveToGallery: false,
                width: 800 // Redimensiona para economizar memória RAM
            });

            fotoBase64 = `data:image/jpeg;base64,${image.base64String}`;
            if (imgPreview) imgPreview.src = fotoBase64;
            if (previewContainer) previewContainer.style.display = 'block';
            toque('cursor_s');
        } catch (err) {
            console.log("Usuário cancelou a captura.");
        }
    };

    if (areaFoto) areaFoto.onclick = capturarFoto;

    if (btnAddGiro) {
        btnAddGiro.onclick = null;
        btnAddGiro.onclick = adicionarGiro;
    }

    renderizarGirosAccordion();
}

/**
 * BUSCA MARCAS DO FIREBASE
 */
async function carregarCategoriasGiro() {
    const select = el('giro_local');
    if (!select) return;
    select.innerHTML = '<option value="PONTO EXTRA">⭐ PONTO EXTRA</option>';
    try {
        const snap = await getDocs(collection(db, 'produtos'));
        snap.forEach(doc => {
            const opt = document.createElement('option');
            opt.value = doc.id.toUpperCase();
            opt.textContent = doc.id.toUpperCase();
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Erro ao carregar categorias:", e);
    }
}

/**
 * SALVA O REGISTRO NO DISCO DO CELULAR
 */
async function adicionarGiro() {
    const local = el('giro_local').value;
    const data = el('giro_data').value;

    if (!local || !data || !fotoBase64) {
        alert("Preencha a Marca, Data e tire uma Foto!");
        return;
    }

    try {
        let caminhoFinal = fotoBase64;

        // Se estiver no celular, salvamos o arquivo físico
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            const nomeArquivo = `giro_${Date.now()}.jpg`;
            const gravado = await Filesystem.writeFile({
                path: `giros/${nomeArquivo}`,
                data: fotoBase64.split(',')[1],
                directory: 'DATA', // Pasta interna segura
                recursive: true
            });
            caminhoFinal = gravado.uri; // Guardamos o link do arquivo, não a foto toda
        }

        const novoGiro = {
            id: Date.now(),
            local: local,
            data: data.split('-').reverse().join('/'),
            foto: caminhoFinal
        };

        const giros = JSON.parse(localStorage.getItem('giros_vendas')) || [];
        giros.push(novoGiro);
        localStorage.setItem('giros_vendas', JSON.stringify(giros));

        fotoBase64 = "";
        if (el('preview_container')) el('preview_container').style.display = 'none';
        
        toque('mario_coin_s');
        alert("Giro registrado!");
        renderizarGirosAccordion();
    } catch (err) {
        alert("Erro ao salvar arquivo: " + err.message);
    }
}

/**
 * RENDERIZA LISTA (CORRIGIDO PARA EXIBIR FOTOS NO ANDROID)
 */
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
            // Conversão de caminho nativo para URL de exibição
            let srcExibicao = g.foto;
            if (window.Capacitor && g.foto.startsWith('file:')) {
                srcExibicao = window.Capacitor.convertFileSrc(g.foto);
            }

            const item = document.createElement('div');
            item.className = 'giro_item_foto';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px;">
                    <span style="font-size:13px; font-weight:bold;">📅 ${g.data}</span>
                    <button class="btn_excluir_g" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px;">EXCLUIR</button>
                </div>
                <img src="${srcExibicao}" loading="lazy" style="width:100%; display:block;">
            `;

            item.querySelector('.btn_excluir_g').onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`Excluir este registro?`)) {
                    // Tenta apagar o arquivo físico
                    if (window.Capacitor && g.foto.startsWith('file:')) {
                        try { await Filesystem.deleteFile({ path: g.foto }); } catch(err) {}
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