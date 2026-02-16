import { el, toque, hojeISO } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const Plugins = window.Capacitor?.Plugins;
const { Filesystem, Camera } = Plugins || {};

let fotoBase64 = ""; 

export async function giro_vendas_screen() {
    const btnAddGiro = el('btn_add_giro');
    const areaFoto = el('giro_foto_area');
    const inputData = el('giro_data');

    if (inputData) inputData.value = hojeISO();
    await carregarCategoriasGiro();

    if (areaFoto) {
        areaFoto.onclick = async () => {
            try {
                const image = await Camera.getPhoto({
                    quality: 60, // Qualidade menor para não travar a WebView
                    resultType: 'base64',
                    source: 'PROMPT',
                    width: 800
                });
                fotoBase64 = image.base64String;
                el('giro_foto_preview').src = `data:image/jpeg;base64,${fotoBase64}`;
                el('preview_container').style.display = 'block';
            } catch (err) { console.log("Cancelado"); }
        };
    }

    if (btnAddGiro) btnAddGiro.onclick = adicionarGiro;
    renderizarGirosAccordion();
}

async function carregarCategoriasGiro() {
    const select = el('giro_local');
    if (!select) return;
    try {
        const snap = await getDocs(collection(db, 'produtos'));
        let html = '<option value="">Selecione a Marca</option><option value="PONTO EXTRA">⭐ PONTO EXTRA</option>';
        snap.forEach(doc => { html += `<option value="${doc.id.toUpperCase()}">${doc.id.toUpperCase()}</option>`; });
        select.innerHTML = html;
    } catch (e) { console.error(e); }
}

async function adicionarGiro() {
    const local = el('giro_local').value;
    const data = el('giro_data').value;

    if (!local || !data || !fotoBase64) {
        alert("Preencha Marca, Data e tire a Foto!");
        return;
    }

    try {
        let caminhoParaSalvar = `data:image/jpeg;base64,${fotoBase64}`;

        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            // FORÇA O PEDIDO DE PERMISSÃO NO ANDROID
            await Filesystem.requestPermissions();

            const nomeArquivo = `giro_${Date.now()}.jpg`;
            const result = await Filesystem.writeFile({
                path: `Pictures/Ikeda/Giro/${nomeArquivo}`,
                data: fotoBase64,
                directory: 'EXTERNAL_STORAGE',
                recursive: true
            });
            caminhoParaSalvar = result.uri;
        }

        const novoGiro = {
            id: Date.now(),
            local: local,
            data: data.split('-').reverse().join('/'),
            foto: caminhoParaSalvar
        };

        const giros = JSON.parse(localStorage.getItem('giros_vendas')) || [];
        giros.push(novoGiro);
        localStorage.setItem('giros_vendas', JSON.stringify(giros));

        fotoBase64 = "";
        el('preview_container').style.display = 'none';
        toque('mario_coin_s');
        renderizarGirosAccordion();
        alert("Salvo na Galeria e no App!");
    } catch (err) { alert("Erro ao salvar: " + err.message); }
}

async function renderizarGirosAccordion() {
    const container = el('lista_giros');
    if (!container) return;

    const giros = JSON.parse(localStorage.getItem('giros_vendas')) || [];
    container.innerHTML = '';

    const agrupados = giros.reduce((acc, g) => {
        if (!acc[g.local]) acc[g.local] = [];
        acc[g.local].push(g);
        return acc;
    }, {});

    for (const marca of Object.keys(agrupados)) {
        const header = document.createElement('div');
        header.className = 'giro_aba_header';
        header.innerHTML = `${marca.toUpperCase()} (${agrupados[marca].length})`;

        const corpo = document.createElement('div');
        corpo.className = 'giro_aba_corpo fechar_giro';

        for (const g of agrupados[marca].reverse()) {
            const item = document.createElement('div');
            item.className = 'giro_item_foto';
            
            // LÓGICA DE EXIBIÇÃO PARA WEBVIEW EXTERNA (GITHUB)
            let srcFinal = g.foto;
            
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; padding:10px; background:#f4f4f4;">
                    <span>📅 ${g.data}</span>
                    <button class="btn_del" style="color:red; border:none; background:none;">EXCLUIR</button>
                </div>
                <img id="img_${g.id}" src="img/placeholder.png" style="width:100%; display:block; min-height:150px;">
            `;

            corpo.appendChild(item);

            // Tenta carregar a imagem de forma assíncrona
            carregarImagemNoElemento(g.foto, `img_${g.id}`);

            item.querySelector('.btn_del').onclick = () => {
                if(confirm("Excluir?")) {
                    const filtrados = giros.filter(f => f.id !== g.id);
                    localStorage.setItem('giros_vendas', JSON.stringify(filtrados));
                    renderizarGirosAccordion();
                }
            };
        }

        header.onclick = () => {
            const isClosed = corpo.classList.contains('fechar_giro');
            document.querySelectorAll('.giro_aba_corpo').forEach(c => c.classList.add('fechar_giro'));
            if(isClosed) corpo.classList.remove('fechar_giro');
        };
        container.append(header, corpo);
    }
}

// FUNÇÃO CHAVE: Lê o arquivo e injeta na imagem
async function carregarImagemNoElemento(path, elementId) {
    const imgElement = document.getElementById(elementId);
    if (!imgElement) return;

    if (window.Capacitor && path.startsWith('file:')) {
        try {
            const conteudo = await Filesystem.readFile({ path: path });
            imgElement.src = `data:image/jpeg;base64,${conteudo.data}`;
        } catch (e) {
            console.error("Erro ao ler arquivo local", e);
            imgElement.src = "img/erro-imagem.png";
        }
    } else {
        imgElement.src = path;
    }
}