import { el, toque, hojeISO } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

export async function giro_vendas_screen() {
    if (el('giro_data')) el('giro_data').value = hojeISO();

    const fotoArea = el('giro_foto_area');
    if (fotoArea) {
        fotoArea.onclick = async () => {
            try {
                const image = await Camera.getPhoto({ quality: 60, resultType: 'base64', source: 'PROMPT', width: 800 });
                window.fotoGiroTemp = image.base64String;
                el('giro_foto_preview').src = `data:image/jpeg;base64,${image.base64String}`;
                el('preview_container').style.display = 'block';
            } catch (e) { console.log("Câmera cancelada"); }
        };
    }

    if (el('btn_add_giro')) el('btn_add_giro').onclick = adicionarGiro;
    renderizarGirosFirebase();
}

async function adicionarGiro() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    const local = el('giro_local').value;
    const data = el('giro_data').value;
    const btn = el('btn_add_giro');

    if (!userSessao) return alert("Faça login primeiro!");
    if (!window.fotoGiroTemp) return alert("Tire a foto do giro primeiro!");

    btn.innerText = "ENVIANDO...";
    btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append("image", window.fotoGiroTemp);

        const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const res = await resp.json();

        if (res.success) {
            const id = String(Date.now());
            const novoGiro = {
                id,
                local,
                data: data.split('-').reverse().join('/'),
                foto: res.data.url,
                timestamp: new Date()
            };

            await setDoc(doc(db, "usuarios", userSessao.nome, "giros", id), novoGiro);

            window.fotoGiroTemp = null;
            el('preview_container').style.display = 'none';
            toque('mario_coin_s');
            renderizarGirosFirebase();
        }
    } catch (e) {
        alert("Erro ao salvar giro na nuvem.");
    } finally {
        btn.innerText = "REGISTRAR GIRO";
        btn.disabled = false;
    }
}

async function renderizarGirosFirebase() {
    const container = el('lista_giros');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!container || !userSessao) return;

    container.innerHTML = "<p style='padding:20px; text-align:center;'>Carregando fotos...</p>";

    try {
        const q = query(collection(db, "usuarios", userSessao.nome, "giros"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);

        container.innerHTML = '';
        const giros = snap.docs.map(d => d.data());

        // Agrupa por local (marca)
        const agrupados = giros.reduce((acc, g) => {
            (acc[g.local] = acc[g.local] || []).push(g);
            return acc;
        }, {});

        Object.keys(agrupados).forEach(local => {
            const header = document.createElement('div');
            header.className = 'giro_aba_header';
            header.innerHTML = `<span>${local.toUpperCase()}</span> <span>(${agrupados[local].length})</span>`;

            const corpo = document.createElement('div');
            corpo.className = 'giro_aba_corpo fechar_giro';

            agrupados[local].forEach(g => {
                const item = document.createElement('div');
                item.className = 'giro_card_item';
                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; padding:10px; background:#f9f9f9; align-items:center; border-bottom:1px solid #eee;">
                        <span style="font-size:12px; font-weight:bold;">📅 ${g.data}</span>
                        <button class="btn_del_giro" style="background:red; color:white; border:none; padding:5px 10px; border-radius:4px; font-size:10px;">EXCLUIR</button>
                    </div>
                    <img src="${g.foto}" loading="lazy" style="width:100%; display:block; border-bottom:2px solid #ddd;">
                `;

                item.querySelector('.btn_del_giro').onclick = async (e) => {
                    e.stopPropagation();
                    if (confirm("Deseja excluir esta foto de giro da nuvem?")) {
                        await deleteDoc(doc(db, "usuarios", userSessao.nome, "giros", g.id));
                        renderizarGirosFirebase();
                    }
                };
                corpo.appendChild(item);
            });

            header.onclick = () => corpo.classList.toggle('fechar_giro');
            container.append(header, corpo);
        });
    } catch (e) {
        container.innerHTML = "<p style='color:red;'>Erro ao carregar giros.</p>";
    }
}