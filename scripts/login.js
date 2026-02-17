import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

export async function verificar_login() {
    const loginContainer = el('login');
    const menuNavegacao = el('menu');
    const iconeAbrirMenu = el('abrir_menu_icon');
    const currentUser = JSON.parse(localStorage.getItem('cadastros'));

    if (currentUser) {
        // Usuário Logado: Mostra Perfil e Menu
        renderizarPerfil(currentUser);
        if (menuNavegacao) menuNavegacao.classList.remove('hide');
        if (iconeAbrirMenu) iconeAbrirMenu.classList.remove('hide');
    } else {
        // Deslogado: Mostra tela de Login/Cadastro
        renderizarTelaAcesso();
        if (menuNavegacao) menuNavegacao.classList.add('hide');
        if (iconeAbrirMenu) iconeAbrirMenu.classList.add('hide');
    }
}

// --- TELA DE ACESSO (LOGIN / CADASTRO) ---
function renderizarTelaAcesso() {
    const container = el('login');
    container.innerHTML = `
        <div class="auth-container" style="padding: 20px; text-align: center;">
            <img src="./img/logo.png" style="width: 80px; margin-bottom: 20px;">
            <h2>BEM-VINDO</h2>
            <input type="text" id="auth_user" placeholder="Usuário" class="inpute" style="margin-bottom: 10px;">
            <input type="password" id="auth_pass" placeholder="Senha" class="inpute" style="margin-bottom: 10px;">
            <button id="btn_login_entrar" class="buttonadd" style="width: 100%; margin-bottom: 10px;">ENTRAR</button>
            <p style="font-size: 12px; color: gray;">Não tem conta?</p>
            <button id="btn_login_cadastrar" style="background: none; border: none; color: blue; text-decoration: underline;">Cadastrar Novo Usuário</button>
        </div>
    `;

    el('btn_login_entrar').onclick = login;
    el('btn_login_cadastrar').onclick = cadastrar;
}

// --- TELA DE PERFIL (LOGADO) ---
async function renderizarPerfil(user) {
    const container = el('login');
    container.innerHTML = `
        <div style="padding: 20px; text-align: center;">
            <div style="position: relative; display: inline-block;">
                <img id="perfil_foto" src="${user.foto || './img/user_placeholder.png'}" 
                     style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #2c3e50;">
                <p style="font-size: 10px;">(Foto de Perfil)</p>
            </div>
            
            <div style="margin-top: 20px;">
                <img id="perfil_qrcode" src="${user.qrcode || './img/layout/login_confiança_jackson.jpeg'}" 
                     style="width: 200px; height: 200px; border-radius: 10px; border: 2px solid #ddd;">
                <p style="font-size: 10px;">(Seu QR Code)</p>
            </div>

            <h3 id="nomelogado">OLÁ, ${user.nome.toUpperCase()}</h3>
            <p style="font-size: 11px; color: orange;">Dica: Toque duplo na imagem para alterar</p>
            
            <button id="logout_user_app" class="buttonadd" style="background: red; width: 100%; padding: 15px; margin-top: 20px;">SAIR DA CONTA</button>
        </div>
    `;

    // Eventos de troca de imagem
    el('perfil_foto').ondblclick = () => mudarImagem('foto');
    el('perfil_qrcode').ondblclick = () => mudarImagem('qrcode');
    
    el('logout_user_app').onclick = () => {
        localStorage.removeItem('cadastros');
        location.reload();
    };
}

// --- LÓGICA DE CADASTRO ---
async function cadastrar() {
    const nome = el('auth_user').value.trim().toLowerCase();
    const senha = el('auth_pass').value.trim();

    if (nome.length < 3 || senha.length < 3) {
        alert("Nome e senha devem ter pelo menos 3 caracteres.");
        return;
    }

    const userRef = doc(db, "usuarios", nome);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        alert("Este usuário já existe!");
    } else {
        await setDoc(userRef, { nome, senha, foto: "", qrcode: "" });
        alert("Cadastro realizado! Agora faça login.");
    }
}

// --- LÓGICA DE LOGIN E SINCRONIZAÇÃO ---
async function login() {
    const nome = el('auth_user').value.trim().toLowerCase();
    const senha = el('auth_pass').value.trim();

    const userRef = doc(db, "usuarios", nome);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists() && docSnap.data().senha === senha) {
        const userData = docSnap.data();
        localStorage.setItem('cadastros', JSON.stringify(userData));
        
        // SINCRONIZAR DADOS DA NUVEM PARA O CELULAR (Validades, Giros, etc)
        await baixarDadosNuvem(nome);
        
        toque('mario_coin_s');
        location.reload();
    } else {
        alert("Usuário ou senha incorretos!");
    }
}

// --- MUDAR IMAGEM (PERFIL OU QRCODE) ---
async function mudarImagem(tipo) {
    const user = JSON.parse(localStorage.getItem('cadastros'));
    try {
        const image = await Camera.getPhoto({ quality: 60, resultType: 'base64', source: 'PROMPT', width: 600 });
        alert("Subindo imagem...");

        const formData = new FormData();
        formData.append("image", image.base64String);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const result = await response.json();

        if (result.success) {
            const url = result.data.url;
            const userRef = doc(db, "usuarios", user.nome);
            
            // Atualiza Firestore e LocalStorage
            const updateData = tipo === 'foto' ? { foto: url } : { qrcode: url };
            await setDoc(userRef, updateData, { merge: true });
            
            user[tipo] = url;
            localStorage.setItem('cadastros', JSON.stringify(user));
            location.reload();
        }
    } catch (e) { console.log("Cancelado"); }
}

// --- SINCRONIZAR DADOS DO FIREBASE PARA O LOCALSTORAGE ---
async function baixarDadosNuvem(nomeUsuario) {
    // Exemplo para Validades (Repita para Giros e Layouts se desejar)
    const querySnapshot = await getDocs(collection(db, "usuarios", nomeUsuario, "validades"));
    const dados = [];
    querySnapshot.forEach((doc) => dados.push(doc.data()));
    if (dados.length > 0) localStorage.setItem('validades', JSON.stringify(dados));
}