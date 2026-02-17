import { el, toque, hojeISO } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d"; 

let fotoBase64 = ""; 

export async function giro_vendas_screen() {
    const areaFoto = el('giro_foto_area');
    if (el('giro_data')) el('giro_data').value = hojeISO();
    await carregarCategoriasGiro();

    if (areaFoto) {
        areaFoto.onclick = async () => {
            const image = await Camera.getPhoto({ quality: 60, resultType: 'base64', source: 'PROMPT', width: 800 });
            fotoBase64 = image.base64String;
            el('giro_foto_preview').src = `data:image/jpeg;base64,${fotoBase64}`;
            el('preview_container').style.display = 'block';
        };
    }
    el('btn_add_giro').onclick = adicionarGiro;
    renderizarGirosAccordion();
}

async function carregarCategoriasGiro() {
    const select = el('giro_local');
    if (!select) return;
    const snap = await getDocs(collection(db, 'produtos'));
    let html = '<option value="">Selecione a Marca</option><option value="PONTO EXTRA">⭐ PONTO EXTRA</option>';
    snap.forEach(doc => { html += `<option value="${doc.id.toUpperCase()}">${doc.id.toUpperCase()}</option>`; });
    select.innerHTML = html;
}

async function adicionarGiro() {
    const local = el('giro_local').value;
    const data = el('giro_data').value;
    const user = JSON.parse(localStorage.getItem('cadastros'));

    if (!user || !local || !fotoBase64) return alert("Preencha tudo!");
    el('btn_add_giro').innerText = "SINCRONIZANDO...";

    const formData = new FormData();
    formData.append("image", fotoBase64);
    const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}&name=${user.nome}_giro`, { method: "POST", body: formData });
    const res = await resp.json();

    if (res.success) {
        const novoGiro = { id: Date.now(), local, data: data.split('-').reverse().join('/'), foto: res.data.url };
        // Local
        const giros = JSON.parse(localStorage.getItem('giros_vendas')) || [];
        giros.push(novoGiro);
        localStorage.setItem('giros_vendas', JSON.stringify(giros));
        // Nuvem
        await setDoc(doc(db, "usuarios", user.nome, "giros", String(novoGiro.id)), novoGiro);
        
        fotoBase64 = ""; el('preview_container').style.display = 'none';
        el('btn_add_giro').innerText = "REGISTRAR GIRO";
        renderizarGirosAccordion();
    }
}

function renderizarGirosAccordion() {
    const container = el('lista_giros');
    if (!container) return;
    const giros = JSON.parse(localStorage.getItem('giros_vendas')) || [];
    container.innerHTML = '';
    const agrupados = giros.reduce((acc, g) => { (acc[g.local] = acc[g.local] || []).push(g); return acc; }, {});

    Object.keys(agrupados).forEach(marca => {
        const header = document.createElement('div');
        header.className = 'giro_aba_header';
        header.innerHTML = `${marca} (${agrupados[marca].length})`;
        const corpo = document.createElement('div');
        corpo.className = 'giro_aba_corpo fechar_giro';
        agrupados[marca].reverse().forEach(g => {
            const item = document.createElement('div');
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; padding:10px; background:#f4f4f4;">
                    <span>📅 ${g.data}</span>
                    <button class="btn_del" style="color:red; border:none; background:none;">EXCLUIR</button>
                </div>
                <img src="${g.foto}" loading="lazy" style="width:100%; display:block;">
            `;
            item.querySelector('.btn_del').onclick = async () => {
                if (confirm("Excluir?")) {
                    const user = JSON.parse(localStorage.getItem('cadastros'));
                    const filtrados = giros.filter(f => f.id !== g.id);
                    localStorage.setItem('giros_vendas', JSON.stringify(filtrados));
                    await deleteDoc(doc(db, "usuarios", user.nome, "giros", String(g.id)));
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