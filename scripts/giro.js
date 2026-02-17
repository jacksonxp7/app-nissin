import { el, toque, hojeISO } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d"; 

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
            } catch (err) { console.log("Cancelou"); }
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
    const btn = el('btn_add_giro');
    const userLogado = JSON.parse(localStorage.getItem('cadastros'));

    if (!userLogado) { alert("Faça login para salvar!"); return; }
    if (!local || !data || !fotoBase64) { alert("Preencha tudo e tire a foto!"); return; }

    btn.innerText = "SINCRONIZANDO...";
    btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append("image", fotoBase64);
        const nomeArquivo = `${userLogado.nome}_giro_${Date.now()}`;

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}&name=${nomeArquivo}`, {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            const novoGiro = {
                id: Date.now(),
                local: local,
                data: data.split('-').reverse().join('/'),
                foto: result.data.url
            };

            // 1. Salva no LocalStorage
            const giros = JSON.parse(localStorage.getItem('giros_vendas')) || [];
            giros.push(novoGiro);
            localStorage.setItem('giros_vendas', JSON.stringify(giros));

            // 2. Salva no Firebase na pasta do usuário
            await setDoc(doc(db, "usuarios", userLogado.nome, "giros", String(novoGiro.id)), novoGiro);

            fotoBase64 = "";
            el('preview_container').style.display = 'none';
            toque('mario_coin_s');
            renderizarGirosAccordion();
            alert("Giro salvo e sincronizado!");
        }
    } catch (err) {
        alert("Erro: " + err.message);
    } finally {
        btn.innerText = "REGISTRAR GIRO";
        btn.disabled = false;
    }
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
        header.innerHTML = `${marca} (${agrupados[marca].length})`;

        const corpo = document.createElement('div');
        corpo.className = 'giro_aba_corpo fechar_giro';

        agrupados[marca].reverse().forEach(g => {
            const item = document.createElement('div');
            item.className = 'giro_item_foto';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; padding:10px; background:#f4f4f4; border-bottom:1px solid #ddd;">
                    <span>📅 ${g.data}</span>
                    <button class="btn_del" style="color:red; border:none; background:none; font-weight:bold;">EXCLUIR</button>
                </div>
                <img src="${g.foto}" loading="lazy" style="width:100%; display:block; min-height:150px; background:#eee;">
            `;

            item.querySelector('.btn_del').onclick = async () => {
                if(confirm("Excluir?")) {
                    const userLogado = JSON.parse(localStorage.getItem('cadastros'));
                    // Remove do Local
                    const filtrados = giros.filter(f => f.id !== g.id);
                    localStorage.setItem('giros_vendas', JSON.stringify(filtrados));
                    // Remove do Firebase
                    if (userLogado) await deleteDoc(doc(db, "usuarios", userLogado.nome, "giros", String(g.id)));
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