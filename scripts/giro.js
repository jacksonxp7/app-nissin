import { el, toque, hojeISO } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const Plugins = window.Capacitor?.Plugins;
const { Filesystem, Camera } = Plugins || {};

let fotoBase64 = ""; 

export async function giro_vendas_screen() {
    const btnAddGiro = el('btn_add_giro');
    const areaFoto = el('giro_foto_area');
    if (el('giro_data')) el('giro_data').value = hojeISO();

    await carregarCategoriasGiro();

    if (areaFoto) {
        areaFoto.onclick = async () => {
            try {
                const image = await Camera.getPhoto({
                    quality: 60,
                    resultType: 'base64',
                    source: 'PROMPT',
                    width: 800
                });
                fotoBase64 = image.base64String;
                el('giro_foto_preview').src = `data:image/jpeg;base64,${fotoBase64}`;
                el('preview_container').style.display = 'block';
            } catch (err) { console.log("Captura cancelada"); }
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
        alert("Preencha tudo!");
        return;
    }

    try {
        let caminhoFinal = `data:image/jpeg;base64,${fotoBase64}`;

        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            // PEDIR PERMISSÃO EXPLÍCITA
            const perm = await Filesystem.requestPermissions();
            console.log("Status Permissão:", perm);

            const nomeArquivo = `giro_${Date.now()}.jpg`;
            const path = `Pictures/Ikeda/Giro/${nomeArquivo}`;

            const gravado = await Filesystem.writeFile({
                path: path,
                data: fotoBase64,
                directory: 'EXTERNAL_STORAGE',
                recursive: true
            });
            caminhoFinal = gravado.uri;
            console.log("Arquivo Gravado em:", caminhoFinal);
            alert("Arquivo salvo em: " + caminhoFinal);
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
        el('preview_container').style.display = 'none';
        toque('mario_coin_s');
        renderizarGirosAccordion();

    } catch (err) {
        alert("ERRO AO SALVAR: " + err.message);
        console.error(err);
    }
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
        header.innerHTML = `${marca} (${agrupados[marca].length})`;

        const corpo = document.createElement('div');
        corpo.className = 'giro_aba_corpo fechar_giro';

        for (const g of agrupados[marca].reverse()) {
            const item = document.createElement('div');
            item.className = 'giro_item_foto';
            
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; padding:10px; background:#f4f4f4;">
                    <span>📅 ${g.data}</span>
                    <button class="btn_del" style="color:red; border:none; background:none;">EXCLUIR</button>
                </div>
                <div id="status_${g.id}" style="font-size:10px; color:blue; padding:5px; word-break:break-all;">
                    Tentando carregar: ${g.foto}
                </div>
                <img id="img_${g.id}" src="" style="width:100%; display:block; min-height:100px; background:#eee;">
            `;

            corpo.appendChild(item);

            // Tenta carregar a imagem
            tentarCarregarImagem(g.foto, g.id);

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

// FUNÇÃO DE DIAGNÓSTICO
async function tentarCarregarImagem(path, id) {
    const img = document.getElementById(`img_${id}`);
    const status = document.getElementById(`status_${id}`);

    if (!window.Capacitor || !path.startsWith('file:')) {
        img.src = path;
        status.innerHTML = "Carregado via URL/Base64 padrão.";
        return;
    }

    try {
        // Tenta ler o arquivo físico
        const conteudo = await Filesystem.readFile({
            path: path
        });
        img.src = `data:image/jpeg;base64,${conteudo.data}`;
        status.innerHTML = "✅ Sucesso: Arquivo lido e convertido em Base64.";
        status.style.color = "green";
    } catch (e) {
        console.error("Erro ao ler arquivo:", e);
        status.innerHTML = `❌ ERRO: Não foi possível ler o arquivo. <br> Motivo: ${e.message}`;
        status.style.color = "red";
    }
}