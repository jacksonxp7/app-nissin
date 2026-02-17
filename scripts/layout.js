import { el, toque } from './utils.js';
import { getMarcasConfig } from './configs.js';
import { db } from './firebase.js';
import { collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

export async function layout() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return;

    const renderizar = async () => {
        const container = el('layout');
        let lista = el('lista_layout_dinamica') || document.createElement('div');
        lista.id = 'lista_layout_dinamica'; container.appendChild(lista);

        // Busca marcas e layouts direto do Firebase
        const cfgMarcas = await getMarcasConfig();
        const snap = await getDocs(collection(db, "usuarios", userSessao.nome, "layouts"));
        const layoutsFirebase = {};
        snap.forEach(d => layoutsFirebase[d.id] = d.data().fotos);

        const marcasOrdenadas = Object.keys(cfgMarcas)
            .filter(marca => cfgMarcas[marca].visivel !== false)
            .sort((a, b) => (cfgMarcas[a].ordem || 999) - (cfgMarcas[b].ordem || 999));

        lista.innerHTML = marcasOrdenadas.map(marca => {
            const fotos = layoutsFirebase[marca] || [];
            return `
                <div class="marca_layout" data-marca="${marca}" style="margin-bottom:10px; border:1px solid #ddd;">
                    <p class="titulo_l" style="background:#2c3e50; color:white; padding:12px; margin:0; cursor:pointer;">${marca.toUpperCase()} (${fotos.length})</p>
                    <div class="corpo_l fechar" style="display:none; background:#fff;">
                        ${fotos.map((url, i) => `
                            <div style="position:relative;">
                                <img src="${url}" loading="lazy" style="width:100%;">
                                <button class="btn_del_l" data-index="${i}" data-marca="${marca}" style="position:absolute; top:5px; right:5px; background:red; color:white;">X</button>
                            </div>
                        `).join('')}
                        <button class="btn_add_l" data-marca="${marca}" style="width:100%; padding:15px; background:#27ae60; color:white;">➕ NOVA FOTO</button>
                    </div>
                </div>`;
        }).join('');

        // Eventos
        container.querySelectorAll('.titulo_l').forEach(t => t.onclick = (e) => {
            const c = e.target.nextElementSibling;
            c.style.display = c.style.display === 'none' ? 'block' : 'none';
        });

        container.querySelectorAll('.btn_add_l').forEach(btn => btn.onclick = async () => {
            const marca = btn.dataset.marca;
            const image = await Camera.getPhoto({ quality: 60, resultType: 'base64', source: 'PROMPT', width: 1000 });
            const formData = new FormData(); formData.append("image", image.base64String);
            const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
            const res = await resp.json();
            if (res.success) {
                const fotosAtuais = layoutsFirebase[marca] || [];
                fotosAtuais.push(res.data.url);
                await setDoc(doc(db, "usuarios", userSessao.nome, "layouts", marca), { fotos: fotosAtuais });
                renderizar();
            }
        });

        container.querySelectorAll('.btn_del_l').forEach(btn => btn.onclick = async () => {
            if (confirm("Remover?")) {
                const marca = btn.dataset.marca;
                const fotosAtuais = layoutsFirebase[marca];
                fotosAtuais.splice(btn.dataset.index, 1);
                await setDoc(doc(db, "usuarios", userSessao.nome, "layouts", marca), { fotos: fotosAtuais });
                renderizar();
            }
        });
    };
    renderizar();
}