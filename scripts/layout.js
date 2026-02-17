import { el, toque } from './utils.js';
import { getMarcasConfig } from './configs.js';
import { db } from './firebase.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

export function layout() {
    const container = el('layout');
    if (!container) return;
    let lista = el('lista_layout_dinamica') || document.createElement('div');
    lista.id = 'lista_layout_dinamica'; container.appendChild(lista);

    const renderizarLayouts = () => {
        const cfgMarcas = getMarcasConfig();
        const fotosSalvas = JSON.parse(localStorage.getItem('app_layouts')) || {};
        const marcasOrdenadas = Object.keys(cfgMarcas)
            .filter(marca => cfgMarcas[marca].visivel !== false)
            .sort((a, b) => (cfgMarcas[a].ordem || 999) - (cfgMarcas[b].ordem || 999));

        lista.innerHTML = marcasOrdenadas.map(marca => {
            const fotos = Array.isArray(fotosSalvas[marca]) ? fotosSalvas[marca] : (fotosSalvas[marca] ? [fotosSalvas[marca]] : []);
            return `
                <div class="marca_layout" data-marca="${marca}" style="margin-bottom:10px; border:1px solid #ddd;">
                    <p class="titulo_layout" style="background:#2c3e50; color:white; padding:12px; margin:0; cursor:pointer;">${marca.toUpperCase()} (${fotos.length})</p>
                    <div class="corpo_layout fechar" style="display:none; background:#fff;">
                        ${fotos.map((url, i) => `
                            <div style="position:relative;">
                                <img src="${url}" loading="lazy" style="width:100%;">
                                <button class="btn_del_l" data-index="${i}" style="position:absolute; top:5px; right:5px; background:red; color:white;">X</button>
                            </div>
                        `).join('')}
                        <button class="btn_add_l" style="width:100%; padding:15px; background:#27ae60; color:white;">➕ NOVA FOTO</button>
                    </div>
                </div>`;
        }).join('');

        configurarEventos(fotosSalvas);
    };

    const configurarEventos = (fotosSalvas) => {
        container.querySelectorAll('.marca_layout').forEach(bloco => {
            const marca = bloco.dataset.marca;
            bloco.querySelector('.titulo_layout').onclick = () => {
                const c = bloco.querySelector('.corpo_layout');
                const isClosed = c.style.display === 'none';
                container.querySelectorAll('.corpo_layout').forEach(x => x.style.display = 'none');
                c.style.display = isClosed ? 'block' : 'none';
            };

            bloco.querySelectorAll('.btn_del_l').forEach(btn => {
                btn.onclick = async () => {
                    if (confirm("Remover?")) {
                        const user = JSON.parse(localStorage.getItem('cadastros'));
                        fotosSalvas[marca].splice(btn.dataset.index, 1);
                        localStorage.setItem('app_layouts', JSON.stringify(fotosSalvas));
                        await setDoc(doc(db, "usuarios", user.nome, "layouts", marca), { fotos: fotosSalvas[marca] });
                        renderizarLayouts();
                    }
                };
            });

            bloco.querySelector('.btn_add_l').onclick = async () => {
                const user = JSON.parse(localStorage.getItem('cadastros'));
                const image = await Camera.getPhoto({ quality: 60, resultType: 'base64', source: 'PROMPT', width: 1000 });
                const formData = new FormData(); formData.append("image", image.base64String);
                const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}&name=${user.nome}_layout`, { method: "POST", body: formData });
                const res = await resp.json();
                if (res.success) {
                    fotosSalvas[marca] = Array.isArray(fotosSalvas[marca]) ? fotosSalvas[marca] : [];
                    fotosSalvas[marca].push(res.data.url);
                    localStorage.setItem('app_layouts', JSON.stringify(fotosSalvas));
                    await setDoc(doc(db, "usuarios", user.nome, "layouts", marca), { fotos: fotosSalvas[marca] });
                    renderizarLayouts();
                }
            };
        });
    };
    renderizarLayouts();
}