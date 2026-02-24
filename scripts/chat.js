import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { 
    collection, addDoc, query, orderBy, limit, onSnapshot, 
    serverTimestamp, doc, deleteDoc, getDoc, getDocs, where, setDoc 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const Camera = window.Capacitor?.Plugins?.Camera;
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

let conversaAtualId = null;
let unsubMensagens = null;

export async function chat_screen() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!userSessao) return;

    alternarView('chat_view_lista');

    // Busca meus dados (foto atual)
    const meuSnap = await getDoc(doc(db, "usuarios", userSessao.nome));
    const minhaFoto = meuSnap.exists() ? meuSnap.data().foto : "";

    // -- NAVEGAÇÃO --
    el('btn_novo_chat').onclick = () => alternarView('chat_view_contatos');
    
    document.querySelectorAll('.btn_voltar_chat').forEach(btn => {
        btn.onclick = () => {
            if (unsubMensagens) unsubMensagens();
            alternarView('chat_view_lista');
            conversaAtualId = null;
        };
    });

    // -- INICIALIZAR LISTAS --
    carregarConversasRecentes(userSessao.nome);
    carregarContatos(userSessao.nome, minhaFoto);

    // -- INPUTS --
    el('btn_chat_menu').onclick = () => el('chat_menu_opcoes').classList.toggle('hide');
    el('opt_foto').onclick = () => { el('chat_menu_opcoes').classList.add('hide'); prepararFoto(userSessao.nome, minhaFoto); };
    el('opt_validade').onclick = () => { el('chat_menu_opcoes').classList.add('hide'); abrirModalValidades(userSessao.nome, minhaFoto); };

    el('btn_enviar_chat').onclick = () => enviarMensagem(userSessao.nome, minhaFoto);
    el('chat_input_texto').onkeypress = (e) => { if (e.key === 'Enter') enviarMensagem(userSessao.nome, minhaFoto); };
}

// 1. CARREGAR LISTA DE CONVERSAS (HOME DO CHAT)
async function carregarConversasRecentes(meuNome) {
    const lista = el('lista_conversas_ativas');
    const q = query(collection(db, "conversas"), where("participantes", "array-contains", meuNome));
    
    onSnapshot(q, async (snap) => {
        lista.innerHTML = "";

        // GRUPO GERAL
        const itemGeral = document.createElement('div');
        itemGeral.className = 'chat_item';
        itemGeral.style.background = "#f0f7ff";
        itemGeral.innerHTML = `
            <img src="./img/logo.png" class="chat_avatar">
            <div class="chat_info"><strong>GRUPO GERAL</strong><span>Chat da equipe</span></div>
        `;
        itemGeral.onclick = () => abrirConversa('geral', 'Grupo Geral', './img/logo.png');
        lista.appendChild(itemGeral);

        const convs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                     .sort((a,b) => (b.ultimaMensagemTime?.seconds || 0) - (a.ultimaMensagemTime?.seconds || 0));

        for (const conv of convs) {
            if (conv.id === "geral") continue;

            const outroUser = conv.participantes.find(p => p !== meuNome);
            
            // BUSCA A FOTO ATUAL DO OUTRO USUÁRIO NO BANCO DE DADOS
            const userSnap = await getDoc(doc(db, "usuarios", outroUser));
            const fotoReal = userSnap.exists() ? userSnap.data().foto : './img/user_placeholder.png';

            const item = document.createElement('div');
            item.className = 'chat_item';
            item.innerHTML = `
                <img src="${fotoReal}" class="chat_avatar">
                <div class="chat_info">
                    <strong>${outroUser.toUpperCase()}</strong>
                    <span>${conv.ultimaMensagem || 'Conversa aberta'}</span>
                </div>
            `;
            item.onclick = () => abrirConversa(conv.id, outroUser, fotoReal);
            lista.appendChild(item);
        }
    });
}

// 2. CARREGAR TODOS OS CONTATOS (SELEÇÃO)
async function carregarContatos(meuNome, minhaFoto) {
    const snap = await getDocs(collection(db, "usuarios"));
    const lista = el('lista_todos_usuarios');
    lista.innerHTML = "";

    snap.forEach(d => {
        const user = d.data();
        if (user.nome === meuNome) return;

        const item = document.createElement('div');
        item.className = 'chat_item';
        item.innerHTML = `
            <img src="${user.foto || './img/user_placeholder.png'}" class="chat_avatar">
            <div class="chat_info"><strong>${user.nome.toUpperCase()}</strong><span>Toque para iniciar</span></div>
        `;
        item.onclick = () => {
            const chatId = [meuNome, user.nome].sort().join('_');
            abrirConversa(chatId, user.nome, user.foto);
        };
        lista.appendChild(item);
    });
}

// 3. ABRIR CHAT (SALA)
async function abrirConversa(id, nomeDestino, fotoDestino) {
    conversaAtualId = id;
    alternarView('chat_view_room');
    
    // Buscar foto mais atualizada do destino para o cabeçalho
    let fotoCabecalho = fotoDestino;
    if (id !== 'geral') {
        const dSnap = await getDoc(doc(db, "usuarios", nomeDestino));
        if (dSnap.exists()) fotoCabecalho = dSnap.data().foto;
    }

    el('chat_room_nome').innerText = nomeDestino.toUpperCase();
    el('chat_room_foto').src = fotoCabecalho || './img/user_placeholder.png';
    el('chat_mensagens').innerHTML = "";

    const q = query(collection(db, "conversas", id, "mensagens"), orderBy("timestamp", "asc"), limit(70));
    
    if (unsubMensagens) unsubMensagens();

    unsubMensagens = onSnapshot(q, (snap) => {
        const box = el('chat_mensagens');
        box.innerHTML = "";
        const meuNome = JSON.parse(localStorage.getItem('sessao_ikeda')).nome;
        snap.forEach(d => renderizarMensagem({ id: d.id, ...d.data() }, meuNome));
        box.scrollTop = box.scrollHeight;
    });
}

// 4. SALVAR MENSAGEM
async function salvarMensagem(meuNome, minhaFoto, dados) {
    const refChat = doc(db, "conversas", conversaAtualId);
    
    const updateData = {
        participantes: conversaAtualId === 'geral' ? [] : conversaAtualId.split('_'),
        ultimaMensagem: dados.text || "Mídia",
        ultimaMensagemTime: serverTimestamp()
    };

    if (conversaAtualId !== 'geral') {
        updateData[`fotos.${meuNome}`] = minhaFoto;
    }

    await setDoc(refChat, updateData, { merge: true });

    await addDoc(collection(db, "conversas", conversaAtualId, "mensagens"), {
        ...dados,
        user: meuNome,
        userFoto: minhaFoto,
        timestamp: serverTimestamp()
    });
    toque('z_s');
}

async function enviarMensagem(meuNome, minhaFoto) {
    const input = el('chat_input_texto');
    const texto = input.value.trim();
    if (!texto || !conversaAtualId) return;
    input.value = "";
    await salvarMensagem(meuNome, minhaFoto, { type: 'text', text: texto });
}

// --- UTILITÁRIOS ---

function alternarView(idView) {
    document.querySelectorAll('.chat_view').forEach(v => v.classList.add('hide'));
    el(idView).classList.remove('hide');
    toque('cursor_s');
}

function renderizarMensagem(msg, meuNome) {
    const box = el('chat_mensagens');
    const isMinha = msg.user === meuNome;
    const data = msg.timestamp ? new Date(msg.timestamp.seconds * 1000) : new Date();
    const hora = data.getHours().toString().padStart(2, '0') + ':' + data.getMinutes().toString().padStart(2, '0');

    const div = document.createElement('div');
    div.className = `msg_row ${isMinha ? 'minha' : 'outra'}`;

    let html = "";
    if (msg.type === 'image') html = `<img src="${msg.image}" class="chat_img_msg">`;
    else if (msg.type === 'validade') {
        html = `<div class="card_validade_chat">
            <div class="info_vld"><strong>⚠️ VALIDADE</strong><span>${msg.vData.nome}</span><span>Vence: ${msg.vData.venc.split('-').reverse().join('/')}</span></div>
            ${msg.vData.imagem ? `<img src="${msg.vData.imagem}" class="img_vld_mini">` : ''}
        </div>`;
    } else html = `<div class="msg_texto">${msg.text}</div>`;

    div.innerHTML = `
        <img src="${msg.userFoto || './img/user_placeholder.png'}" class="chat_avatar">
        <div class="msg_corpo">
            ${conversaAtualId === 'geral' && !isMinha ? `<span class="msg_user">${msg.user}</span>` : ''}
            ${html}
            <span class="msg_hora">${hora}</span>
        </div>
    `;

    if (isMinha) {
        div.ondblclick = async () => {
            if (confirm("Apagar mensagem?")) await deleteDoc(doc(db, "conversas", conversaAtualId, "mensagens", msg.id));
        };
    }
    box.appendChild(div);
}

// --- FOTO E VALIDADE ---

async function prepararFoto(meuNome, minhaFoto) {
    try {
        const image = await Camera.getPhoto({ quality: 60, resultType: "base64" });
        const body = new FormData(); body.append('image', image.base64String);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body });
        const json = await res.json();
        if (json.success) await salvarMensagem(meuNome, minhaFoto, { type: 'image', image: json.data.url, text: '📷 Foto' });
    } catch (e) {}
}

async function abrirModalValidades(userName, userFoto) {
    const modal = el('modal_escolher_validade');
    const lista = el('lista_validades_chat');
    modal.classList.remove('hide');
    lista.innerHTML = "Buscando...";
    const snap = await getDocs(collection(db, "usuarios", userName, "validades"));
    lista.innerHTML = "";
    snap.forEach(d => {
        const v = d.data();
        const div = document.createElement('div');
        div.className = 'item_vld_chat';
        div.innerHTML = `<img src="${v.imagem || './img/logo.png'}" style="width:40px"> <strong>${v.nome}</strong>`;
        div.onclick = async () => {
            await salvarMensagem(userName, userFoto, { type: 'validade', vData: { nome: v.nome, venc: v.validade, imagem: v.imagem }, text: '📢 Validade' });
            modal.classList.add('hide');
        };
        lista.appendChild(div);
    });
    el('fechar_modal_vld').onclick = () => modal.classList.add('hide');
}