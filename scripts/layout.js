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
        if (!container) return;

        let lista = el('lista_layout_dinamica');
        if (!lista) {
            lista = document.createElement('div');
            lista.id = 'lista_layout_dinamica';
            container.appendChild(lista);
        }

        lista.innerHTML = "<p style='padding:20px; text-align:center;'>Sincronizando layouts...</p>";

        try {
            // Busca configurações de exibição e layouts salvos na nuvem
            const cfgMarcas = await getMarcasConfig();
            const snap = await getDocs(collection(db, "usuarios", userSessao.nome, "layouts"));
            
            const layoutsFirebase = {};
            snap.forEach(d => layoutsFirebase[d.id] = d.data().fotos || []);

            // Filtra e ordena marcas baseada na config do usuário
            const marcasOrdenadas = Object.keys(cfgMarcas)
                .filter(marca => cfgMarcas[marca].visivel !== false)
                .sort((a, b) => (cfgMarcas[a].ordem || 999) - (cfgMarcas[b].ordem || 999));

            if (marcasOrdenadas.length === 0) {
                lista.innerHTML = "<p style='padding:20px; text-align:center; color:gray;'>Nenhuma marca visível. Vá em Configurações.</p>";
                return;
            }

            lista.innerHTML = marcasOrdenadas.map(marca => {
                const fotos = layoutsFirebase[marca] || [];
                return `
                    <div class="marca_layout" data-marca="${marca}" style="margin-bottom:10px; border:1px solid #ddd; border-radius:8px; overflow:hidden;">
                        <p class="titulo_l" style="background:#2c3e50; color:white; padding:15px; margin:0; cursor:pointer; display:flex; justify-content:space-between;">
                            <span>${marca.toUpperCase()}</span>
                            <span>${fotos.length} fotos</span>
                        </p>
                        <div class="corpo_l" style="display:none; background:#fff;">
                            ${fotos.map((url, i) => `
                                <div style="position:relative; border-bottom:1px solid #eee;">
                                    <img src="${url}" loading="lazy" style="width:100%; display:block;">
                                    <button class="btn_del_l" data-index="${i}" data-marca="${marca}" style="position:absolute; top:10px; right:10px; background:rgba(255,0,0,0.7); color:white; border:none; width:30px; height:30px; border-radius:50%; font-weight:bold;">X</button>
                                </div>
                            `).join('')}
                            <button class="btn_add_l" data-marca="${marca}" style="width:100%; padding:15px; background:#27ae60; color:white; border:none; font-weight:bold;">➕ ADICIONAR FOTO DE LAYOUT</button>
                        </div>
                    </div>`;
            }).join('');

            // Ativa Evento Abrir/Fechar
            container.querySelectorAll('.titulo_l').forEach(t => {
                t.onclick = (e) => {
                    const corpo = t.nextElementSibling;
                    const isHidden = corpo.style.display === 'none';
                    corpo.style.display = isHidden ? 'block' : 'none';
                    toque('cursor_s');
                };
            });

            // Ativa Evento Adicionar Foto
            container.querySelectorAll('.btn_add_l').forEach(btn => {
                btn.onclick = async () => {
                    const marca = btn.dataset.marca;
                    try {
                        const image = await Camera.getPhoto({ quality: 60, resultType: 'base64', source: 'PROMPT', width: 1000 });
                        btn.innerText = "ENVIANDO...";
                        btn.disabled = true;

                        const formData = new FormData(); 
                        formData.append("image", image.base64String);
                        
                        const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
                        const res = await resp.json();

                        if (res.success) {
                            const fotosAtuais = layoutsFirebase[marca] || [];
                            fotosAtuais.push(res.data.url);
                            await setDoc(doc(db, "usuarios", userSessao.nome, "layouts", marca), { fotos: fotosAtuais });
                            renderizar(); // Atualiza a tela
                        }
                    } catch (e) { 
                        console.log("Cancelado ou Erro"); 
                        btn.innerText = "➕ ADICIONAR FOTO DE LAYOUT";
                        btn.disabled = false;
                    }
                };
            });

            // Ativa Evento Deletar Foto
            container.querySelectorAll('.btn_del_l').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    if (confirm("Deseja remover esta foto de layout da nuvem?")) {
                        const marca = btn.dataset.marca;
                        const index = parseInt(btn.dataset.index);
                        const fotosAtuais = layoutsFirebase[marca];
                        fotosAtuais.splice(index, 1);
                        await setDoc(doc(db, "usuarios", userSessao.nome, "layouts", marca), { fotos: fotosAtuais });
                        renderizar();
                    }
                };
            });

        } catch (err) {
            lista.innerHTML = "<p style='color:red; padding:20px;'>Erro ao carregar layouts da nuvem.</p>";
        }
    };

    renderizar();
}