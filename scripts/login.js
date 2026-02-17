import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

/* ============================================================
   1. VERIFICAÇÃO DE SESSÃO E LOGIN
============================================================ */
export async function verificar_login() {
    const loginContainer = el('login');
    const menuIcon = el('abrir_menu_icon');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));

    if (userSessao) {
        // Usuário Logado: Mostra Ícone do Menu e Tela de Perfil
        if (menuIcon) menuIcon.classList.remove('hide');
        
        // Busca os dados mais recentes do perfil no Firebase (Foto e QR Code)
        try {
            const docSnap = await getDoc(doc(db, "usuarios", userSessao.nome));
            if (docSnap.exists()) {
                renderizarPerfil(docSnap.data());
            } else {
                renderizarPerfil(userSessao);
            }
        } catch (e) {
            renderizarPerfil(userSessao);
        }
    } else {
        // Usuário Deslogado: Esconde Menu e mostra Tela de Login
        if (menuIcon) menuIcon.classList.add('hide');
        renderizarTelaLogin();
    }
}

/* ============================================================
   2. TELA DE LOGIN / CADASTRO (INTERFACE)
============================================================ */
function renderizarTelaLogin() {
    el('login').innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <img src="./img/logo.png" style="width: 100px; margin-bottom: 20px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">ACESSO RESTRITO</h2>
            
            <input type="text" id="auth_user" placeholder="Usuário" class="inpute" style="width: 100%; margin-bottom: 15px;">
            <input type="password" id="auth_pass" placeholder="Senha" class="inpute" style="width: 100%; margin-bottom: 20px;">
            
            <button id="btn_entrar" class="buttonadd" style="width: 100%; padding: 15px;">ENTRAR NO SISTEMA</button>
            
            <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                <p style="font-size: 14px; color: #7f8c8d;">Novo por aqui?</p>
                <button id="btn_cadastrar" style="background:none; border:none; color:#2980b9; text-decoration:underline; font-weight:bold; font-size: 16px;">Criar nova conta</button>
            </div>
        </div>
    `;

    el('btn_entrar').onclick = login;
    el('btn_cadastrar').onclick = cadastrar;
}

/* ============================================================
   3. TELA DE PERFIL (INTERFACE)
============================================================ */
function renderizarPerfil(user) {
    el('login').innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="margin-bottom: 20px;">
                <img id="perfil_foto" src="${user.foto || './img/user_placeholder.png'}" 
                     style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #2c3e50;">
                <p style="font-size: 10px; color: gray;">(Foto de Perfil)</p>
            </div>

            <div style="margin-bottom: 20px;">
                <img id="perfil_qrcode" src="${user.qrcode || './img/layout/login_confiança_jackson.jpeg'}" 
                     style="width: 200px; height: 200px; border-radius: 10px; border: 2px solid #ddd;">
                <p style="font-size: 10px; color: gray;">(Seu QR Code - Confiança)</p>
            </div>

            <h2 style="color: #2c3e50;">OLÁ, ${user.nome.toUpperCase()}</h2>
            <p style="font-size: 11px; color: orange;">Toque duplo na imagem para alterar</p>
            
            <button id="logout_user_app" class="buttonadd" style="background: #e74c3c; width: 100%; margin-top: 20px; padding: 15px;">SAIR DA CONTA</button>
        </div>
    `;

    // Eventos de clique duplo
    el('perfil_foto').ondblclick = () => mudarFotoPerfil('foto');
    el('perfil_qrcode').ondblclick = () => mudarFotoPerfil('qrcode');

    el('logout_user_app').onclick = () => {
        if(confirm("Deseja realmente sair?")) {
            localStorage.clear(); // Limpa a sessão
            location.reload();
        }
    };
}

/* ============================================================
   4. LÓGICA DE AUTENTICAÇÃO (FIREBASE)
============================================================ */
async function login() {
    const user = el('auth_user').value.trim().toLowerCase();
    const pass = el('auth_pass').value.trim();

    if (!user || !pass) return alert("Preencha todos os campos!");

    try {
        const snap = await getDoc(doc(db, "usuarios", user));
        if (snap.exists() && snap.data().senha === pass) {
            // Salva APENAS o nome na sessão local
            localStorage.setItem('sessao_ikeda', JSON.stringify({ nome: user }));
            toque('mario_coin_s');
            location.reload();
        } else {
            alert("Usuário ou senha incorretos!");
        }
    } catch (e) {
        alert("Erro de conexão com o servidor.");
    }
}

async function cadastrar() {
    const user = el('auth_user').value.trim().toLowerCase();
    const pass = el('auth_pass').value.trim();

    if (user.length < 3 || pass.length < 3) return alert("Mínimo 3 caracteres!");

    try {
        const snap = await getDoc(doc(db, "usuarios", user));
        if (snap.exists()) return alert("Este usuário já existe!");

        await setDoc(doc(db, "usuarios", user), {
            nome: user,
            senha: pass,
            foto: "",
            qrcode: ""
        });

        alert("Conta criada com sucesso! Agora clique em ENTRAR.");
    } catch (e) {
        alert("Erro ao cadastrar usuário.");
    }
}

async function mudarFotoPerfil(tipo) {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    try {
        const image = await Camera.getPhoto({ quality: 50, resultType: 'base64', source: 'PROMPT', width: 600 });
        alert("Subindo para nuvem...");

        const formData = new FormData();
        formData.append("image", image.base64String);
        
        const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const res = await resp.json();

        if (res.success) {
            await setDoc(doc(db, "usuarios", userSessao.nome), { [tipo]: res.data.url }, { merge: true });
            alert("Imagem atualizada!");
            location.reload();
        }
    } catch (e) { console.log("Cancelado"); }
}

/* ============================================================
   5. ALERTAS DE VALIDADE (SINCRONIZADO NUVEM)
============================================================ */
export async function pushvalidade() {
    const container = el('alertas-validade');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    
    if (!container || !userSessao) {
        if(container) container.classList.add('hide');
        return;
    }
    
    try {
        // Busca as validades direto do Firebase do usuário para gerar os alertas
        const snap = await getDocs(collection(db, "usuarios", userSessao.nome, "validades"));
        const validades = snap.docs.map(d => d.data());
        
        const hoje = new Date();
        hoje.setHours(0,0,0,0);
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

        if (temAlerta) {
            container.classList.remove('hide');
            container.classList.add('show');
        } else {
            container.classList.add('hide');
        }
    } catch (e) {
        console.error("Erro nos alertas:", e);
    }
}