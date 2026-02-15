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

    // Capturar Foto
    if (areaFoto) {
        areaFoto.onclick = async () => {
            try {
                const image = await Camera.getPhoto({
                    quality: 80,
                    resultType: 'base64',
                    source: 'PROMPT',
                    width: 1000
                });
                fotoBase64 = image.base64String;
                el('giro_foto_preview').src = `data:image/jpeg;base64,${fotoBase64}`;
                el('preview_container').style.display = 'block';
            } catch (err) { console.log("Usuário cancelou"); }
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
            // SOLICITA PERMISSÃO REAL NO ANDROID
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
        alert("Salvo com sucesso!");
    } catch (err) { alert("Erro ao salvar: " + err.message); }
}

function renderizarGirosAccordion() {
    const container = el('lista_giros');
    if (!container) return;

    const giros = JSON.parse(localStorage.getItem('giros_vendas')) || [];
    container.innerHTML = '';

    const agrupados = giros.reduce((acc, g) => {
        if (!acc[g.local]) acc[g.local] = [];
        acc[g.local].push(g);
        return acc;
    }, {});

    Object.keys(agrupados).forEach(marca => {
        const header = document.createElement('div');
        header.className = 'giro_aba_header';
        header.innerHTML = `${marca.toUpperCase()} (${agrupados[marca].length})`;

        const corpo = document.createElement('div');
        corpo.className = 'giro_aba_corpo fechar_giro';

        agrupados[marca].reverse().forEach(g => {
            // CORREÇÃO PARA A IMAGEM APARECER: CONVERTE file:// PARA URL WEB
            let urlExibicao = g.foto;
            if (window.Capacitor && g.foto.startsWith('file:')) {
                urlExibicao = window.Capacitor.convertFileSrc(g.foto);
            }

            const item = document.createElement('div');
            item.className = 'giro_item_foto';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; padding:10px; background:#f4f4f4; border-bottom:1px solid #ddd;">
                    <span style="font-weight:bold;">📅 ${g.data}</span>
                    <button class="btn_del" style="color:red; border:none; background:none; font-weight:bold; cursor:pointer;">EXCLUIR</button>
                </div>
                <img src="${urlExibicao}" loading="lazy" style="width:100%; display:block; min-height:100px; background:#eee;">
            `;

            item.querySelector('.btn_del').onclick = () => {
                if(confirm("Excluir foto?")) {
                    const filtrados = giros.filter(f => f.id !== g.id);
                    localStorage.setItem('giros_vendas', JSON.stringify(filtrados));
                    renderizarGirosAccordion();
                }
            };
            corpo.appendChild(item);
        });

        header.onclick = () => {
            const isClosed = corpo.classList.contains('fechar_giro');
            document.querySelectorAll('.giro_aba_corpo').forEach(c => c.classList.add('fechar_giro'));
            if(isClosed) corpo.classList.remove('fechar_giro');
        };
        container.append(header, corpo);
    });
}