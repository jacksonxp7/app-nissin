import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

export async function verificar_login() {
    const sessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    const menuIcon = el('abrir_menu_icon');

    if (sessao) {
        if (menuIcon) menuIcon.classList.remove('hide');
        const snap = await getDoc(doc(db, "usuarios", sessao.nome));
        renderizarPerfil(snap.exists() ? snap.data() : sessao);
    } else {
        if (menuIcon) menuIcon.classList.add('hide');
        renderizarTelaLogin();
    }
}

function renderizarTelaLogin() {
    el('login').innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <img src="./img/logo.png" style="width: 100px; margin-bottom: 20px;">
            <input type="text" id="u" placeholder="Usuário" class="inpute" style="width:100%; margin-bottom:10px;">
            <input type="password" id="s" placeholder="Senha" class="inpute" style="width:100%; margin-bottom:20px;">
            <button id="btn_entrar" class="buttonadd" style="width:100%;">ENTRAR</button>
            <button id="btn_cad" style="margin-top:20px; background:none; border:none; color:blue; text-decoration:underline;">Criar Conta</button>
        </div>`;
    el('btn_entrar').onclick = async () => {
        const user = el('u').value.trim().toLowerCase();
        const pass = el('s').value.trim();
        const snap = await getDoc(doc(db, "usuarios", user));
        if (snap.exists() && snap.data().senha === pass) {
            localStorage.setItem('sessao_ikeda', JSON.stringify({ nome: user }));
            location.reload();
        } else { alert("Dados inválidos!"); }
    };
    el('btn_cad').onclick = async () => {
        const user = el('u').value.trim().toLowerCase();
        const pass = el('s').value.trim();
        if (user.length < 3) return alert("Nome curto!");
        await setDoc(doc(db, "usuarios", user), { nome: user, senha: pass, foto: "", qrcode: "" });
        alert("Cadastrado! Clique em Entrar.");
    };
}

function renderizarPerfil(user) {
    el('login').innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <img id="f_p" src="${user.foto || './img/user_placeholder.png'}" style="width:120px; height:120px; border-radius:50%; object-fit:cover; border:3px solid #2c3e50;">
            <div style="margin-top:20px;">
                <img id="f_q" src="${user.qrcode || './img/layout/login_confiança_jackson.jpeg'}" style="width:200px; height:200px; border-radius:10px; border:2px solid #ddd;">
            </div>
            <h2 style="margin:15px 0;">${user.nome.toUpperCase()}</h2>
            <button id="btn_sair" class="buttonadd" style="background:#e74c3c; width:100%;">SAIR DA CONTA</button>
        </div>`;
    el('f_p').ondblclick = () => mudarImg('foto');
    el('f_q').ondblclick = () => mudarImg('qrcode');
    el('btn_sair').onclick = () => { localStorage.clear(); location.reload(); };
}

async function mudarImg(tipo) {
    const sessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    const img = await Camera.getPhoto({ quality: 50, resultType: 'base64', source: 'PROMPT', width: 600 });
    const fd = new FormData(); fd.append("image", img.base64String);
    const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
    const res = await resp.json();
    if (res.success) {
        await setDoc(doc(db, "usuarios", sessao.nome), { [tipo]: res.data.url }, { merge: true });
        location.reload();
    }
}

export async function pushvalidade() {
    const container = el('alertas-validade');
    const sessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!container || !sessao) return;

    const snap = await getDocs(collection(db, "usuarios", sessao.nome, "validades"));
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    container.innerHTML = '';
    let alertou = false;

    snap.forEach(d => {
        const item = d.data();
        const dias = Math.ceil((new Date(item.validade + 'T12:00:00') - hoje) / 86400000);
        if (dias <= 10) {
            alertou = true;
            const div = document.createElement('div');
            div.className = dias <= 0 ? 'alerta-validade-venceu' : 'alerta-validade';
            div.textContent = `${dias <= 0 ? '❌' : '⚠️'} ${item.nome} (${dias}d)`;
            container.appendChild(div);
        }
    });
    alertou ? container.classList.remove('hide') : container.classList.add('hide');
}