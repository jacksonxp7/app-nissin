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
        alert("Preencha Marca, Data e Foto!");
        return;
    }

    try {
        let caminhoFinal = `data:image/jpeg;base64,${fotoBase64}`;

        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            // PEDIR PERMISSÃO EXPLÍCITA DE IMAGENS
            await Filesystem.requestPermissions();

            const nomeArquivo = `giro_${Date.now()}.jpg`;
            const path = `Pictures/Ikeda/Giro/${nomeArquivo}`;

            const gravado = await Filesystem.writeFile({
                path: path,
                data: fotoBase64,
                directory: 'EXTERNAL_STORAGE',
                recursive: true
            });
            caminhoFinal = gravado.uri;
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
        alert("Foto salva com sucesso!");

    } catch (err) {
        alert("ERRO AO SALVAR: " + err.message);
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
                <!-- LOG DE STATUS PARA VOCÊ VER NO CELULAR -->
                <div id="log_${g.id}" style="font-size:9px; color:blue; padding:5px; background:#fff; border:1px solid #ccc; word-break:break-all;">
                    Caminho: ${g.foto}
                </div>
                <img id="img_${g.id}" src="" style="width:100%; display:block; min-height:100px; background:#ddd;">
            `;

            corpo.appendChild(item);

            // Chama a função de leitura para exibir a imagem
            exibirImagemWebView(g.foto, g.id);

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

/**
 * FUNÇÃO DE DIAGNÓSTICO E EXIBIÇÃO
 */
async function exibirImagemWebView(caminho, id) {
    const img = document.getElementById(`img_${id}`);
    const log = document.getElementById(`log_${id}`);

    if (!window.Capacitor || !caminho.startsWith('file:')) {
        img.src = caminho;
        log.innerHTML += "<br><b>Status:</b> Usando Base64/URL direta.";
        return;
    }

    try {
        // TENTA LER O ARQUIVO FÍSICO (Único jeito seguro em WebView externa)
        const leitura = await Filesystem.readFile({
            path: caminho
        });
        
        img.src = `data:image/jpeg;base64,${leitura.data}`;
        log.style.color = "green";
        log.innerHTML += "<br><b>Status:</b> ✅ Arquivo lido com sucesso.";
    } catch (err) {
        log.style.color = "red";
        log.innerHTML += `<br><b>Status:</b> ❌ ERRO DE LEITURA: ${err.message}`;
        
        // Tentativa 2: Usar o convertFileSrc (caso a leitura falhe mas a permissão exista)
        img.src = window.Capacitor.convertFileSrc(caminho);
    }
}