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
    const previewContainer = el('preview_container');
    const imgPreview = el('giro_foto_preview');

    if (inputData) inputData.value = hojeISO();
    await carregarCategoriasGiro();

    const capturarFoto = async () => {
        try {
            const image = await Camera.getPhoto({
                quality: 90,
                resultType: 'base64',
                source: 'PROMPT',
                width: 1200
            });
            fotoBase64 = image.base64String;
            if (imgPreview) imgPreview.src = `data:image/jpeg;base64,${fotoBase64}`;
            if (previewContainer) previewContainer.style.display = 'block';
        } catch (err) { console.log("Cancelado"); }
    };

    if (areaFoto) areaFoto.onclick = capturarFoto;
    if (btnAddGiro) btnAddGiro.onclick = adicionarGiro;

    renderizarGirosAccordion();
}

async function carregarCategoriasGiro() {
    const select = el('giro_local');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione a Marca</option><option value="PONTO EXTRA">⭐ PONTO EXTRA</option>';
    try {
        const snap = await getDocs(collection(db, 'produtos'));
        snap.forEach(doc => {
            const opt = document.createElement('option');
            opt.value = doc.id.toUpperCase();
            opt.textContent = doc.id.toUpperCase();
            select.appendChild(opt);
        });
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
        let caminhoParaSalvar = `data:image/jpeg;base64,${fotoBase64}`;

        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            // SOLICITA PERMISSÃO DE ARMAZENAMENTO
            const perms = await Filesystem.requestPermissions();
            if (perms.publicStorage !== 'granted') {
                alert("Permissão de galeria negada. O app não pode salvar fotos.");
                return;
            }

            const nomeArquivo = `giro_${Date.now()}.jpg`;
            const gravado = await Filesystem.writeFile({
                path: `Pictures/Ikeda/Giro/${nomeArquivo}`,
                data: fotoBase64,
                directory: 'EXTERNAL_STORAGE',
                recursive: true
            });
            caminhoParaSalvar = gravado.uri;
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
    } catch (err) { alert("Erro: " + err.message); }
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
            let srcExibicao = g.foto;
            if (window.Capacitor && g.foto.startsWith('file:')) {
                srcExibicao = window.Capacitor.convertFileSrc(g.foto);
            }

            const item = document.createElement('div');
            item.className = 'giro_item_foto';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px; background:#eee;">
                    <span>📅 ${g.data}</span>
                    <button class="exc_g" style="background:red; color:white; border:none; padding:5px; border-radius:5px;">X</button>
                </div>
                <img src="${srcExibicao}" loading="lazy" style="width:100%; display:block; min-height:100px;">
            `;

            item.querySelector('.exc_g').onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Excluir foto?`)) {
                    const filtrados = giros.filter(f => f.id !== g.id);
                    localStorage.setItem('giros_vendas', JSON.stringify(filtrados));
                    renderizarGirosAccordion();
                }
            };
            corpoLista.appendChild(item);
        });

        btnHeader.onclick = () => {
            const fechado = corpoLista.classList.contains('fechar_giro');
            document.querySelectorAll('.giro_aba_corpo').forEach(c => c.classList.add('fechar_giro'));
            if (fechado) corpoLista.classList.remove('fechar_giro');
        };
        container.append(btnHeader, corpoLista);
    });
}