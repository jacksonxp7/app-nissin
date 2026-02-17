import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

export async function verificar_login() {
    const loginContainer = el('login');
    const menuNav = el('menu');
    const menuIcon = el('abrir_menu_icon');

    const userLogado = JSON.parse(localStorage.getItem('cadastros'));

    if (userLogado) {
        // --- INTERFACE DO USUÁRIO LOGADO ---
        if (menuNav) menuNav.classList.add('hide');
        if (menuIcon) menuIcon.classList.remove('hide');

        loginContainer.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="margin-bottom: 20px;">
                    <img id="perfil_foto_user" src="${userLogado.foto || './img/user_placeholder.png'}" 
                         style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #2c3e50;">
                    <p style="font-size: 10px; color: gray;">(Foto de Perfil - 2 cliques p/ mudar)</p>
                </div>

                <div style="margin-bottom: 20px;">
                    <img id="perfil_qrcode_user" src="${userLogado.qrcode || './img/layout/login_confiança_jackson.jpeg'}" 
                         style="width: 200px; height: 200px; border-radius: 10px; border: 2px solid #ddd;">
                    <p style="font-size: 10px; color: gray;">(Seu QR Code - 2 cliques p/ mudar)</p>
                </div>

                <h2 style="color: #2c3e50; margin: 10px 0;">Olá, ${userLogado.nome.toUpperCase()}</h2>
                
                <button id="logout_user_app" class="buttonadd" style="background: #e74c3c; width: 100%; padding: 15px; margin-top: 10px;">SAIR DA CONTA</button>
            </div>
        `;

        // Eventos de clique duplo para mudar as fotos
        el('perfil_foto_user').ondblclick = () => mudarFoto('foto');
        el('perfil_qrcode_user').ondblclick = () => mudarFoto('qrcode');

        el('logout_user_app').onclick = () => {
            if (confirm("Deseja sair do App?")) {
                localStorage.clear(); // Limpa tudo ao sair para segurança
                location.reload();
            }
        };

    } else {
        // --- INTERFACE DE LOGIN / CADASTRO ---
        if (menuNav) menuNav.classList.add('hide');
        if (menuIcon) menuIcon.classList.add('hide');

        loginContainer.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <img src="./img/logo.png" style="width: 100px; margin-bottom: 20px;">
                <h2 style="color: #2c3e50; margin-bottom: 20px;">ACESSO RESTRITO</h2>
                
                <input type="text" id="auth_user" placeholder="Nome de Usuário" class="inpute" style="width: 100%; margin-bottom: 15px; padding: 12px;">
                <input type="password" id="auth_pass" placeholder="Sua Senha" class="inpute" style="width: 100%; margin-bottom: 20px; padding: 12px;">
                
                <button id="btn_entrar" class="buttonadd" style="width: 100%; padding: 15px; font-weight: bold;">ENTRAR NO SISTEMA</button>
                
                <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                    <p style="font-size: 14px; color: #7f8c8d;">Ainda não tem uma conta?</p>
                    <button id="btn_cadastrar" style="background:none; border:none; color:#2980b9; text-decoration:underline; font-weight:bold; cursor:pointer; font-size: 16px;">Criar novo cadastro</button>
                </div>
            </div>
        `;

        el('btn_entrar').onclick = realizarLogin;
        el('btn_cadastrar').onclick = realizarCadastro;
    }
}

async function realizarLogin() {
    const user = el('auth_user').value.trim().toLowerCase();
    const pass = el('auth_pass').value.trim();

    if (!user || !pass) return alert("Preencha usuário e senha!");

    try {
        el('btn_entrar').innerText = "AUTENTICANDO...";
        const userRef = doc(db, "usuarios", user);
        const snap = await getDoc(userRef);

        if (snap.exists() && snap.data().senha === pass) {
            localStorage.setItem('cadastros', JSON.stringify(snap.data()));
            alert("Sucesso! Sincronizando seus dados...");

            // Puxa validades e configurações da nuvem para o celular
            await sincronizarTudo(user);

            toque('mario_coin_s');
            location.reload();
        } else {
            alert("Usuário ou senha incorretos!");
            el('btn_entrar').innerText = "ENTRAR NO SISTEMA";
        }
    } catch (e) { alert("Erro de conexão."); }
}

async function realizarCadastro() {
    const user = el('auth_user').value.trim().toLowerCase();
    const pass = el('auth_pass').value.trim();

    if (user.length < 3 || pass.length < 3) return alert("Usuário e senha devem ter 3+ dígitos.");

    try {
        const userRef = doc(db, "usuarios", user);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
            alert("Este nome já está sendo usado.");
        } else {
            await setDoc(userRef, { nome: user, senha: pass, foto: "", qrcode: "" });
            alert("Cadastro realizado! Agora você já pode ENTRAR.");
        }
    } catch (e) { alert("Erro ao cadastrar."); }
}

async function mudarFoto(tipo) {
    const userLogado = JSON.parse(localStorage.getItem('cadastros'));
    try {
        const image = await Camera.getPhoto({ quality: 50, resultType: 'base64', source: 'PROMPT', width: 600 });
        alert("Enviando imagem...");

        const formData = new FormData();
        formData.append("image", image.base64String);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const result = await response.json();

        if (result.success) {
            const url = result.data.url;
            // Atualiza Firebase
            await setDoc(doc(db, "usuarios", userLogado.nome), { [tipo]: url }, { merge: true });
            // Atualiza Local
            userLogado[tipo] = url;
            localStorage.setItem('cadastros', JSON.stringify(userLogado));
            location.reload();
        }
    } catch (e) { console.log("Cancelado"); }
}

// PUXA TODOS OS DADOS DA NUVEM PARA O CELULAR AO LOGAR
async function sincronizarTudo(username) {
    // 1. Validades
    const valSnap = await getDocs(collection(db, "usuarios", username, "validades"));
    const validades = [];
    valSnap.forEach(d => validades.push(d.data()));
    localStorage.setItem('validades', JSON.stringify(validades));

    // 2. Configurações
    const confSnap = await getDoc(doc(db, "usuarios", username, "configs", "geral"));
    if (confSnap.exists()) localStorage.setItem('app_configs', JSON.stringify(confSnap.data()));
    // Dentro da função sincronizarTudo no login.js
    const marcasSnap = await getDoc(doc(db, "usuarios", username, "configs", "marcas"));
    if (marcasSnap.exists()) localStorage.setItem('cfg_marcas', JSON.stringify(marcasSnap.data()));

    const geralSnap = await getDoc(doc(db, "usuarios", username, "configs", "geral"));
    if (geralSnap.exists()) localStorage.setItem('app_configs', JSON.stringify(geralSnap.data()));
}

/* ============================================================
   ALERTAS DE VALIDADE
============================================================ */
export function pushvalidade() {
    const container = el('alertas-validade');
    if (!container || !localStorage.getItem('cadastros')) {
        if (container) container.classList.add('hide');
        return;
    }

    const validades = JSON.parse(localStorage.getItem('validades')) || [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    container.innerHTML = '';

    let temAlerta = false;
    validades.forEach(item => {
        const dataVal = new Date(item.validade + 'T12:00:00');
        const dias = Math.ceil((dataVal - hoje) / 86400000);
        if (dias <= 10) {
            temAlerta = true;
            const div = document.createElement('div');
            div.className = dias <= 0 ? 'alerta-validade-venceu' : 'alerta-validade';
            div.textContent = `${dias <= 0 ? '❌' : '⚠️'} ${item.nome} (${dias}d)`;
            container.appendChild(div);
        }
    });

    temAlerta ? container.classList.remove('hide') : container.classList.add('hide');
}