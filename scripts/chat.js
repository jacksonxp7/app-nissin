import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { 
    collection, addDoc, query, orderBy, limit, onSnapshot, 
    serverTimestamp, doc, deleteDoc, getDoc, getDocs 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const Camera = window.Capacitor?.Plugins?.Camera;
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

export async function chat_screen() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return;

    // Busca foto do perfil do usuário logado
    const userSnap = await getDoc(doc(db, "usuarios", userSessao.nome));
    const minhaFoto = userSnap.exists() ? userSnap.data().foto : "";

    const btnMenu = el('btn_chat_menu');
    const menuOpcoes = el('chat_menu_opcoes');
    const boxMensagens = el('chat_mensagens');
    const inputTexto = el('chat_input_texto');
    const btnEnviar = el('btn_enviar_chat');

    // --- 1. ESCUTAR MENSAGENS EM TEMPO REAL ---
    const q = query(collection(db, "chat_geral"), orderBy("timestamp", "asc"), limit(100));
    onSnapshot(q, (snapshot) => {
        boxMensagens.innerHTML = "";
        snapshot.forEach((docSnap) => {
            renderizarMensagem({ id: docSnap.id, ...docSnap.data() }, userSessao.nome);
        });
        boxMensagens.scrollTop = boxMensagens.scrollHeight;
    });

    // --- 2. LÓGICA DO MENU (+) ---
    btnMenu.onclick = () => menuOpcoes.classList.toggle('hide');

    // --- 3. ENVIAR FOTO ---
    el('opt_foto').onclick = () => {
        menuOpcoes.classList.add('hide');
        prepararFoto(userSessao.nome, minhaFoto);
    };

    // --- 4. COMPARTILHAR VALIDADE ---
    el('opt_validade').onclick = () => {
        menuOpcoes.classList.add('hide');
        abrirModalValidades(userSessao.nome, minhaFoto);
    };

    // --- 5. ENVIAR TEXTO ---
    const enviarMensagemTexto = async () => {
        const texto = inputTexto.value.trim();
        if (!texto) return;
        inputTexto.value = "";
        await salvarFirebase({
            user: userSessao.nome,
            userFoto: minhaFoto,
            text: texto,
            type: 'text'
        });
    };

    btnEnviar.onclick = enviarMensagemTexto;
    inputTexto.onkeypress = (e) => { if (e.key === 'Enter') enviarMensagemTexto(); };
}

// --- FUNÇÕES DE APOIO ---

async function salvarFirebase(objeto) {
    try {
        await addDoc(collection(db, "chat_geral"), {
            ...objeto,
            timestamp: serverTimestamp()
        });
        toque('z_s');
    } catch (e) { console.error("Erro chat:", e); }
}

async function prepararFoto(userName, userFoto) {
    if (Camera) {
        try {
            const image = await Camera.getPhoto({
                quality: 60,
                allowEditing: false,
                resultType: "base64"
            });
            if (image.base64String) uploadChatImg(image.base64String, userName, userFoto);
        } catch (e) { acionarFallback(userName, userFoto); }
    } else {
        acionarFallback(userName, userFoto);
    }
}

function acionarFallback(userName, userFoto) {
    const input = el('chat_file_fallback');
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => uploadChatImg(reader.result.split(',')[1], userName, userFoto);
        reader.readAsDataURL(file);
    };
    input.click();
}

async function uploadChatImg(base64, userName, userFoto) {
    toque('cursor_s');
    try {
        const body = new FormData();
        body.append('image', base64);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body });
        const json = await res.json();
        if (json.success) {
            await salvarFirebase({
                user: userName,
                userFoto: userFoto,
                image: json.data.url,
                type: 'image',
                text: ''
            });
        }
    } catch (e) { alert("Erro ao subir imagem"); }
}

async function abrirModalValidades(userName, userFoto) {
    const modal = el('modal_escolher_validade');
    const lista = el('lista_validades_chat');
    modal.classList.remove('hide');
    lista.innerHTML = "<p style='text-align:center'>Buscando validades...</p>";

    const snap = await getDocs(collection(db, "usuarios", userName, "validades"));
    lista.innerHTML = "";

    if (snap.empty) {
        lista.innerHTML = "<p style='text-align:center; color:gray;'>Você não tem validades cadastradas.</p>";
    }

    snap.forEach(docSnap => {
        const v = docSnap.data();
        const div = document.createElement('div');
        div.className = 'item_vld_chat';
        
        // Pequena imagem no seletor do modal
        const imgSeletor = v.imagem ? `<img src="${v.imagem}">` : `<div style="width:40px; height:40px; background:#ddd; border-radius:5px"></div>`;

        div.innerHTML = `
            ${imgSeletor}
            <div>
                <strong>${v.nome}</strong>
                <span>Vencimento: ${v.validade.split('-').reverse().join('/')}</span>
            </div>
        `;
        
        div.onclick = async () => {
            await salvarFirebase({
                user: userName,
                userFoto: userFoto,
                type: 'validade',
                text: `Compartilhou uma validade`,
                vData: { 
                    nome: v.nome, 
                    venc: v.validade, 
                    qtd: v.quantidade,
                    imagem: v.imagem || "" 
                }
            });
            modal.classList.add('hide');
        };
        lista.appendChild(div);
    });

    el('fechar_modal_vld').onclick = () => modal.classList.add('hide');
}

function renderizarMensagem(msg, meuNome) {
    const box = el('chat_mensagens');
    const isMinha = msg.user === meuNome;
    const data = msg.timestamp ? new Date(msg.timestamp.seconds * 1000) : new Date();
    const hora = data.getHours().toString().padStart(2, '0') + ':' + data.getMinutes().toString().padStart(2, '0');

    const row = document.createElement('div');
    row.className = `msg_row ${isMinha ? 'minha' : 'outra'}`;

    let htmlConteudo = "";
    if (msg.type === 'image') {
        htmlConteudo = `<img src="${msg.image}" class="chat_img_msg">`;
    } else if (msg.type === 'validade') {
        const imgHtml = msg.vData.imagem ? `<img src="${msg.vData.imagem}" class="img_vld_mini">` : "";
        htmlConteudo = `
            <div class="card_validade_chat">
                <div class="info_vld">
                    <strong>⚠️ ALERTA DE VALIDADE</strong>
                    <span>Produto: ${msg.vData.nome}</span>
                    <span>Qtd: ${msg.vData.qtd}</span>
                    <span>Vence: ${msg.vData.venc.split('-').reverse().join('/')}</span>
                </div>
                ${imgHtml}
            </div>
        `;
    } else {
        htmlConteudo = `<div class="msg_texto">${msg.text}</div>`;
    }

    row.innerHTML = `
        <img src="${msg.userFoto || './img/user_placeholder.png'}" class="chat_avatar">
        <div class="msg_corpo ${msg.type === 'image' ? 'foto_msg' : ''}">
            ${!isMinha ? `<span class="msg_user">${msg.user}</span>` : ''}
            ${htmlConteudo}
            <span class="msg_hora">${hora}</span>
        </div>
    `;

    // Deletar com clique duplo
    if (isMinha) {
        row.ondblclick = async () => {
            if (confirm("Apagar esta mensagem para todos?")) {
                await deleteDoc(doc(db, "chat_geral", msg.id));
                toque('decide_s');
            }
        };
    }

    box.appendChild(row);
}