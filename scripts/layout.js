import { el, toque } from './utils.js';
import { getMarcasConfig } from './configs.js';
import { db } from './firebase.js';
import { collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

export async function layout() {
    const s = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!s) return;

    const renderizar = async () => {
        const container = el('layout');
        container.innerHTML = "Carregando layouts...";
        const [cfgM, snapL] = await Promise.all([getMarcasConfig(), getDocs(collection(db, "usuarios", s.nome, "layouts"))]);
        const layoutsFB = {}; snapL.forEach(d => layoutsFB[d.id] = d.data().fotos);
        const marcas = Object.keys(cfgM).filter(m => cfgM[m].visivel !== false).sort((a,b) => (cfgM[a].ordem || 999) - (cfgM[b].ordem || 999));
        
        container.innerHTML = '<div id="lista_layout_dinamica"></div>';
        const lista = el('lista_layout_dinamica');
        lista.innerHTML = marcas.map(m => {
            const fotos = layoutsFB[m] || [];
            return `<div class="marca_layout" data-marca="${m}" style="border:1px solid #ddd; margin-bottom:10px;">
                <p class="titulo_l" style="background:#2c3e50; color:white; padding:12px; margin:0;">${m.toUpperCase()} (${fotos.length})</p>
                <div class="corpo_l" style="display:none; background:#fff;">
                    ${fotos.map((url, i) => `<div style="position:relative;"><img src="${url}" width="100%"><button class="btn_del_l" data-index="${i}" data-marca="${m}" style="position:absolute; top:5px; right:5px; background:red; color:white;">X</button></div>`).join('')}
                    <button class="btn_add_l" data-marca="${m}" style="width:100%; padding:15px; background:#27ae60; color:white;">➕ ADICIONAR FOTO</button>
                </div>
            </div>`;
        }).join('');

        container.querySelectorAll('.titulo_l').forEach(t => t.onclick = (e) => {
            const corpo = e.target.nextElementSibling;
            corpo.style.display = corpo.style.display === 'none' ? 'block' : 'none';
        });

        container.querySelectorAll('.btn_add_l').forEach(btn => btn.onclick = async () => {
            const m = btn.dataset.marca;
            const img = await Camera.getPhoto({ quality: 60, resultType: 'base64', source: 'PROMPT', width: 1000 });
            const fd = new FormData(); fd.append("image", img.base64String);
            const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
            const res = await resp.json();
            if (res.success) {
                const fotos = layoutsFB[m] || []; fotos.push(res.data.url);
                await setDoc(doc(db, "usuarios", s.nome, "layouts", m), { fotos });
                renderizar();
            }
        });

        container.querySelectorAll('.btn_del_l').forEach(btn => btn.onclick = async () => {
            const m = btn.dataset.marca;
            const fotos = layoutsFB[m]; fotos.splice(btn.dataset.index, 1);
            await setDoc(doc(db, "usuarios", s.nome, "layouts", m), { fotos });
            renderizar();
        });
    };
    renderizar();
}