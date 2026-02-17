import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

export async function verificar_login() {
    const authScreen = el('auth_screen');
    const profileScreen = el('profile_screen');
    const menuIcon = el('abrir_menu_icon');
    const menuNav = el('menu');
    
    const userLogado = JSON.parse(localStorage.getItem('cadastros'));

    if (userLogado) {
        // --- ESTÁ LOGADO ---
        if (authScreen) authScreen.classList.add('hide');
        if (profileScreen) profileScreen.classList.remove('hide');
        if (menuIcon) menuIcon.classList.remove('hide');

        // Preenche dados
        const nomeTxt = el('nomelogado');
        if (nomeTxt) nomeTxt.innerText = `OLÁ, ${userLogado.nome.toUpperCase()}`;

        const imgPerfil = el('perfil_foto_user');
        const imgQrCode = el('perfil_qrcode_user');

        if (imgPerfil) {
            imgPerfil.src = userLogado.foto || "./img/user_placeholder.png";
            imgPerfil.ondblclick = () => mudarFoto('foto');
        }
        if (imgQrCode) {
            imgQrCode.src = userLogado.qrcode || "./img/layout/login_confiança_jackson.jpeg";
            imgQrCode.ondblclick = () => mudarFoto('qrcode');
        }

        el('logout_user_app').onclick = () => {
            if(confirm("Deseja sair?")) {
                localStorage.removeItem('cadastros');
                location.reload();
            }
        };

    } else {
        // --- ESTÁ DESLOGADO ---
        if (authScreen) authScreen.classList.remove('hide');
        if (profileScreen) profileScreen.classList.add('hide');
        if (menuIcon) menuIcon.classList.add('hide');
        if (menuNav) menuNav.classList.add('hide');

        // Configura botões de Login e Cadastro
        el('btn_login_entrar').onclick = realizarLogin;
        el('btn_login_cadastrar').onclick = realizarCadastro;
    }
}

// --- FUNÇÃO LOGIN ---
async function realizarLogin() {
    const user = el('auth_user').value.trim().toLowerCase();
    const pass = el('auth_pass').value.trim();

    if (!user || !pass) return alert("Preencha usuário e senha!");

    try {
        const userRef = doc(db, "usuarios", user);
        const snap = await getDoc(userRef);

        if (snap.exists() && snap.data().senha === pass) {
            const dados = snap.data();
            localStorage.setItem('cadastros', JSON.stringify(dados));
            
            alert("Login realizado! Sincronizando dados...");
            await sincronizarDadosNuvem(user); // Puxa validades, giros etc do Firebase
            
            toque('mario_coin_s');
            location.reload();
        } else {
            alert("Usuário ou senha incorretos!");
        }
    } catch (e) { alert("Erro ao logar: " + e.message); }
}

// --- FUNÇÃO CADASTRO ---
async function realizarCadastro() {
    const user = el('auth_user').value.trim().toLowerCase();
    const pass = el('auth_pass').value.trim();

    if (user.length < 3 || pass.length < 3) return alert("Mínimo 3 caracteres para user e senha");

    try {
        const userRef = doc(db, "usuarios", user);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
            alert("Este nome de usuário já está em uso!");
        } else {
            const novoUser = { nome: user, senha: pass, foto: "", qrcode: "" };
            await setDoc(userRef, novoUser);
            alert("Cadastro realizado com sucesso! Agora clique em ENTRAR.");
        }
    } catch (e) { alert("Erro ao cadastrar: " + e.message); }
}

// --- MUDAR FOTO (PERFIL OU QRCODE) ---
async function mudarFoto(tipo) {
    const userLogado = JSON.parse(localStorage.getItem('cadastros'));
    try {
        const image = await Camera.getPhoto({ quality: 50, resultType: 'base64', source: 'PROMPT', width: 600 });
        alert("Subindo para nuvem...");

        const formData = new FormData();
        formData.append("image", image.base64String);
        const nomeArquivo = `${userLogado.nome}_${tipo}_${Date.now()}`;

        const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}&name=${nomeArquivo}`, {
            method: "POST", body: formData
        });
        const res = await resp.json();

        if (res.success) {
            const url = res.data.url;
            const userRef = doc(db, "usuarios", userLogado.nome);
            
            // Atualiza Firebase e Local
            await setDoc(userRef, { [tipo]: url }, { merge: true });
            userLogado[tipo] = url;
            localStorage.setItem('cadastros', JSON.stringify(userLogado));
            
            toque('mario_coin_s');
            location.reload();
        }
    } catch (e) { console.log("Cancelado"); }
}

// --- SINCRONIZAÇÃO TOTAL (Firebase -> LocalStorage) ---
async function sincronizarDadosNuvem(username) {
    // 1. Puxar Validades
    const valSnap = await getDocs(collection(db, "usuarios", username, "validades"));
    const validades = [];
    valSnap.forEach(d => validades.push(d.data()));
    localStorage.setItem('validades', JSON.stringify(validades));

    // 2. Puxar Configurações
    const confSnap = await getDoc(doc(db, "usuarios", username, "configs", "geral"));
    if (confSnap.exists()) localStorage.setItem('app_configs', JSON.stringify(confSnap.data()));

    // 3. Puxar Giros
    const giroSnap = await getDocs(collection(db, "usuarios", username, "giros"));
    const giros = [];
    giroSnap.forEach(d => giros.push(d.data()));
    localStorage.setItem('giros_vendas', JSON.stringify(giros));
}