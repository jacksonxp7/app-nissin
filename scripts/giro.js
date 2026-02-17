import { el, toque, hojeISO } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

export async function giro_vendas_screen() {
    if (el('giro_data')) el('giro_data').value = hojeISO();
    
    el('giro_foto_area').onclick = async () => {
        const image = await Camera.getPhoto({ quality: 60, resultType: 'base64', source: 'PROMPT', width: 800 });
        window.fotoGiroTemp = image.base64String;
        el('giro_foto_preview').src = `data:image/jpeg;base64,${image.base64String}`;
        el('preview_container').style.display = 'block';
    };

    el('btn_add_giro').onclick = adicionarGiro;
    renderizarGirosFirebase();
}

async function adicionarGiro() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    const local = el('giro_local').value;
    const data = el('giro_data').value;

    if (!userSessao || !window.fotoGiroTemp) return alert("Tire a foto primeiro!");

    el('btn_add_giro').innerText = "ENVIANDO...";
    const formData = new FormData();
    formData.append("image", window.fotoGiroTemp);
    
    const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
    const res = await resp.json();

    if (res.success) {
        const id = Date.now();
        const novo = { id, local, data: data.split('-').reverse().join('/'), foto: res.data.url };
        await setDoc(doc(db, "usuarios", userSessao.nome, "giros", String(id)), novo);
        window.fotoGiroTemp = null;
        el('preview_container').style.display = 'none';
        el('btn_add_giro').innerText = "REGISTRAR GIRO";
        renderizarGirosFirebase();
    }
}

async function renderizarGirosFirebase() {
    const container = el('lista_giros');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!container || !userSessao) return;

    container.innerHTML = "Carregando...";
    const snap = await getDocs(collection(db, "usuarios", userSessao.nome, "giros"));
    const giros = snap.docs.map(d => d.data());
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
                    await deleteDoc(doc(db, "usuarios", userSessao.nome, "giros", String(g.id)));
                    renderizarGirosFirebase();
                }
            };
            corpo.appendChild(item);
        });
        header.onclick = () => corpo.classList.toggle('fechar_giro');
        container.append(header, corpo);
    });
}