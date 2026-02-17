import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

export async function verificar_login() {
    const loginContainer = el('login');
    const menuIcon = el('abrir_menu_icon');
    const userLogado = JSON.parse(localStorage.getItem('cadastros'));

    if (userLogado) {
        if (menuIcon) menuIcon.classList.remove('hide');
        renderizarPerfil(userLogado);
    } else {
        if (menuIcon) menuIcon.classList.add('hide');
        renderizarTelaLogin();
    }
}

function renderizarTelaLogin() {
    el('login').innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <img src="./img/logo.png" style="width: 100px; margin-bottom: 20px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">ACESSO RESTRITO</h2>
            <input type="text" id="auth_user" placeholder="Usuário" class="inpute" style="width: 100%; margin-bottom: 15px;">
            <input type="password" id="auth_pass" placeholder="Senha" class="inpute" style="width: 100%; margin-bottom: 20px;">
            <button id="btn_entrar" class="buttonadd" style="width: 100%;">ENTRAR NO SISTEMA</button>
            <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                <button id="btn_cadastrar" style="background:none; border:none; color:#2980b9; text-decoration:underline;">Criar nova conta</button>
            </div>
        </div>
    `;
    el('btn_entrar').onclick = realizarLogin;
    el('btn_cadastrar').onclick = realizarCadastro;
}

function renderizarPerfil(user) {
    el('login').innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <img id="perfil_foto" src="${user.foto || './img/user_placeholder.png'}" 
                 style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #2c3e50;">
            <div style="margin-top: 20px;">
                <img id="perfil_qrcode" src="${user.qrcode || './img/layout/login_confiança_jackson.jpeg'}" 
                     style="width: 180px; height: 180px; border-radius: 10px; border: 2px solid #ddd;">
            </div>
            <h2>${user.nome.toUpperCase()}</h2>
            <button id="logout_user_app" class="buttonadd" style="background: #e74c3c; width: 100%; margin-top: 20px;">SAIR DA CONTA</button>
        </div>
    `;
    el('perfil_foto').ondblclick = () => mudarFoto('foto');
    el('perfil_qrcode').ondblclick = () => mudarFoto('qrcode');
    el('logout_user_app').onclick = () => { localStorage.clear(); location.reload(); };
}

async function realizarLogin() {
    const user = el('auth_user').value.trim().toLowerCase();
    const pass = el('auth_pass').value.trim();
    if (!user || !pass) return alert("Preencha tudo!");

    try {
        const docSnap = await getDoc(doc(db, "usuarios", user));
        if (docSnap.exists() && docSnap.data().senha === pass) {
            localStorage.setItem('cadastros', JSON.stringify(docSnap.data()));
            alert("Login OK! Sincronizando nuvem...");
            await baixarTudoDaNuvem(user);
            location.reload();
        } else { alert("Dados incorretos!"); }
    } catch (e) { alert("Erro de conexão"); }
}

async function realizarCadastro() {
    const user = el('auth_user').value.trim().toLowerCase();
    const pass = el('auth_pass').value.trim();
    if (user.length < 3) return alert("Nome curto!");
    const snap = await getDoc(doc(db, "usuarios", user));
    if (snap.exists()) return alert("Já existe!");
    await setDoc(doc(db, "usuarios", user), { nome: user, senha: pass, foto: "", qrcode: "" });
    alert("Cadastrado! Agora clique em Entrar.");
}

async function mudarFoto(tipo) {
    const user = JSON.parse(localStorage.getItem('cadastros'));
    const image = await Camera.getPhoto({ quality: 50, resultType: 'base64', source: 'PROMPT', width: 600 });
    const formData = new FormData();
    formData.append("image", image.base64String);
    const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
    const res = await resp.json();
    if (res.success) {
        await setDoc(doc(db, "usuarios", user.nome), { [tipo]: res.data.url }, { merge: true });
        user[tipo] = res.data.url;
        localStorage.setItem('cadastros', JSON.stringify(user));
        location.reload();
    }
}

// SINCRONIZAÇÃO COMPLETA (FIREBASE -> CELULAR)
async function baixarTudoDaNuvem(username) {
    // 1. Validades
    const valSnap = await getDocs(collection(db, "usuarios", username, "validades"));
    localStorage.setItem('validades', JSON.stringify(valSnap.docs.map(d => d.data())));

    // 2. Giros
    const giroSnap = await getDocs(collection(db, "usuarios", username, "giros"));
    localStorage.setItem('giros_vendas', JSON.stringify(giroSnap.docs.map(d => d.data())));

    // 3. Layouts
    const laySnap = await getDocs(collection(db, "usuarios", username, "layouts"));
    const layoutsObj = {};
    laySnap.forEach(d => { layoutsObj[d.id] = d.data().fotos; });
    localStorage.setItem('app_layouts', JSON.stringify(layoutsObj));

    // 4. Configurações
    const confSnap = await getDoc(doc(db, "usuarios", username, "configs", "geral"));
    if (confSnap.exists()) localStorage.setItem('app_configs', JSON.stringify(confSnap.data()));
    
    const marcasSnap = await getDoc(doc(db, "usuarios", username, "configs", "marcas"));
    if (marcasSnap.exists()) localStorage.setItem('cfg_marcas', JSON.stringify(marcasSnap.data()));
}

export function pushvalidade() {
    const container = el('alertas-validade');
    const user = localStorage.getItem('cadastros');
    if (!container || !user) return;
    const validades = JSON.parse(localStorage.getItem('validades')) || [];
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    container.innerHTML = '';
    validades.forEach(item => {
        const dias = Math.ceil((new Date(item.validade + 'T12:00:00') - hoje) / 86400000);
        if (dias <= 10) {
            const div = document.createElement('div');
            div.className = dias <= 0 ? 'alerta-validade-venceu' : 'alerta-validade';
            div.textContent = `${dias <= 0 ? '❌' : '⚠️'} ${item.nome} (${dias}d)`;
            container.appendChild(div);
        }
    });
}