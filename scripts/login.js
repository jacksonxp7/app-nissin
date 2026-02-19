
import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Tenta pegar os plugins do Capacitor ou define como objeto vazio para evitar erros
const Camera = window.Capacitor?.Plugins?.Camera;
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

export async function verificar_login() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    const menuIcon = el('abrir_menu_icon');
    const logoDiv = el('logo'); // Elemento que será escondido/mostrado

    if (userSessao) {
        // LOGADO
        if (menuIcon) menuIcon.classList.remove('hide');
        if (logoDiv) logoDiv.style.display = 'flex'; // Mostra o logo se logado

        const docSnap = await getDoc(doc(db, "usuarios", userSessao.nome));
        renderizarPerfil(docSnap.exists() ? docSnap.data() : userSessao);
        pushvalidade();
    } else {
        // DESLOGADO
        if (menuIcon) menuIcon.classList.add('hide');
        if (logoDiv) logoDiv.style.display = 'none'; // Esconde o logo se deslogado

        renderizarTelaLogin();
    }
}

function renderizarTelaLogin() {
    // Ajuste de fundo do body para uma aparência de App profissional
    document.body.style.backgroundColor = "#3498db";
    document.body.style.margin = "0";
    document.body.style.fontFamily = "'Segoe UI', Roboto, sans-serif";

    el('login').innerHTML = `
        <div id="login_container" style="
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            min-height: 80vh; 
            padding: 20px;
        ">
            <div class="login-card" style="
                background: #ffffff; 
                padding: 40px 30px; 
                border-radius: 20px; 
                box-shadow: 0 10px 25px rgba(0,0,0,0.08); 
                width: 100%; 
                max-width: 350px; 
                text-align: center;
            ">
                <img src="./img/logo.png" style="width: 110px; margin-bottom: 20px;">
                
                <h2 style="color: #2c3e50; margin-bottom: 8px; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">SISTEMA IKEDA</h2>
                <p style="color: #95a5a6; font-size: 14px; margin-bottom: 30px;">Bem-vindo! Por favor, faça login.</p>

                <div style="margin-bottom: 15px; text-align: left;">
                    <label style="font-size: 11px; font-weight: 700; color: #34495e; margin-left: 5px; text-transform: uppercase;">Usuário</label>
                    <input type="text" id="auth_user" placeholder="Seu nome de usuário" style="
                        width: 100%; padding: 14px; margin-top: 5px; border: 1px solid #e0e6ed; 
                        border-radius: 10px; box-sizing: border-box; font-size: 15px; outline: none; background: #f9fafb;
                    ">
                </div>

                <div style="margin-bottom: 25px; text-align: left;">
                    <label style="font-size: 11px; font-weight: 700; color: #34495e; margin-left: 5px; text-transform: uppercase;">Senha</label>
                    <input type="password" id="auth_pass" placeholder="••••••••" style="
                        width: 100%; padding: 14px; margin-top: 5px; border: 1px solid #e0e6ed; 
                        border-radius: 10px; box-sizing: border-box; font-size: 15px; outline: none; background: #f9fafb;
                    ">
                </div>

                <button id="btn_entrar" style="
                    width: 100%; padding: 15px; background: #2980b9; color: white; border: none; 
                    border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; 
                    transition: 0.3s; box-shadow: 0 4px 12px rgba(41, 128, 185, 0.2);
                ">ENTRAR NO SISTEMA</button>

                <button id="btn_cadastrar" style="
                    margin-top: 25px; background: none; border: none; color: #7f8c8d; 
                    font-size: 13px; cursor: pointer; text-decoration: underline; font-weight: 500;
                ">Não tenho uma conta? Cadastrar</button>
            </div>
        </div>
    `;

    // Efeitos de Hover para o botão Entrar
    const btnEntrar = el('btn_entrar');
    btnEntrar.onmouseover = () => {
        btnEntrar.style.background = '#2471a3';
        btnEntrar.style.transform = 'translateY(-1px)';
    };
    btnEntrar.onmouseout = () => {
        btnEntrar.style.background = '#2980b9';
        btnEntrar.style.transform = 'translateY(0)';
    };

    el('btn_entrar').onclick = login;
    el('btn_cadastrar').onclick = cadastrar;
}

async function login() {
    const user = el('auth_user').value.trim().toLowerCase();
    const pass = el('auth_pass').value.trim();
    if (!user || !pass) return alert("Preencha todos os campos!");

    try {
        const snap = await getDoc(doc(db, "usuarios", user));
        if (snap.exists() && snap.data().senha === pass) {
            localStorage.setItem('sessao_ikeda', JSON.stringify({ nome: user }));
            toque('mario_coin_s');
            location.reload();
        } else {
            alert("Usuário ou senha incorretos.");
        }
    } catch (e) {
        alert("Erro ao conectar com o banco de dados.");
    }
}

async function cadastrar() {
    const user = el('auth_user').value.trim().toLowerCase();
    const pass = el('auth_pass').value.trim();

    if (user.length < 3) return alert("O usuário deve ter pelo menos 3 caracteres.");
    if (pass.length < 4) return alert("A senha deve ter pelo menos 4 caracteres.");

    const snap = await getDoc(doc(db, "usuarios", user));
    if (snap.exists()) return alert("Este nome de usuário já está em uso.");

    try {
        await setDoc(doc(db, "usuarios", user), {
            nome: user,
            senha: pass,
            foto: "",
            qrcode: ""
        });
        alert("Conta criada com sucesso! Faça o login agora.");
    } catch (e) {
        alert("Erro ao criar conta.");
    }
}

function renderizarPerfil(user) {
    el('login').innerHTML = `
        <div style="text-align:center; padding:30px 20px; width: 90vw; margin: auto; background: white; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
            <p style="font-size:12px; color:#95a5a6; font-weight: 500;">Dê dois cliques na imagem para alterar</p>
            
            <div style="position:relative; display:inline-block; margin-bottom: 10px;">
                <img id="perfil_foto" src="${user.foto || './img/user_placeholder.png'}" 
                     style="width:140px; height:140px; border-radius:50%; object-fit:cover; border:5px solid #f1f4f8; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            </div>

            <h2 style="margin: 10px 0 5px 0; color: #2c3e50; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;">${user.nome}</h2>
            
            

            <div style="margin:25px 0;">
                <p style="font-size: 12px; font-weight:800; color: #7f8c8d; margin-bottom:15px; text-transform: uppercase;">Seu Identificador QR:</p>
                <div style="background: #f9fafb; padding: 15px; border-radius: 15px; display: inline-block; border: 1px solid #eee;">
                    <img id="perfil_qrcode" src="${user.qrcode || './img/layout/login_confiança_jackson.jpeg'}" 
                         style="width:180px; height:180px; object-fit:contain;">
                </div>
            </div>
            
            <button id="logout_btn" style="
                background: #e74c3c; color: #ffffff; width: 100%; margin-top: 30px; 
                padding: 14px 20px; border: none; border-radius: 12px; 
                font-family: 'Segoe UI', sans-serif; font-weight: 700; font-size: 14px; 
                letter-spacing: 1px; cursor: pointer; transition: 0.3s;
                box-shadow: 0 4px 12px rgba(231, 76, 60, 0.2);
            ">
                SAIR DA CONTA
            </button>
            
            <input type="file" id="input_file_fallback" style="display:none;" accept="image/*">
        </div>
    `;

    // Evento de Sair
    el('logout_btn').onclick = () => {
        if (confirm("Deseja realmente sair?")) {
            localStorage.clear();
            location.reload();
        }
    };

    // Hover do botão Sair
    const btnSair = el('logout_btn');
    btnSair.onmouseover = () => btnSair.style.background = '#c0392b';
    btnSair.onmouseout = () => btnSair.style.background = '#e74c3c';

    // Eventos de clique duplo para trocar imagem
    el('perfil_foto').ondblclick = () => prepararTroca(user.nome, 'foto');
    el('perfil_qrcode').ondblclick = () => prepararTroca(user.nome, 'qrcode');
}

async function prepararTroca(userName, campo) {
    if (!confirm(`Deseja alterar esta imagem?`)) return;

    if (Camera) {
        try {
            const image = await Camera.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: "base64"
            });
            if (image && image.base64String) {
                enviarParaImgBB(image.base64String, userName, campo);
            }
        } catch (err) {
            console.log("Câmera indisponível, usando seletor de arquivos.");
            acionarFallback(userName, campo);
        }
    } else {
        acionarFallback(userName, campo);
    }
}

function acionarFallback(userName, campo) {
    const input = el('input_file_fallback');
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const base64Limpo = reader.result.split(',')[1];
            enviarParaImgBB(base64Limpo, userName, campo);
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

async function enviarParaImgBB(base64Data, userName, campo) {
    try {
        alert("Enviando imagem... aguarde.");

        const body = new FormData();
        body.append('image', base64Data);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: body
        });

        const result = await response.json();

        if (result.success) {
            const urlFinal = result.data.url;
            const userRef = doc(db, "usuarios", userName);
            await updateDoc(userRef, { [campo]: urlFinal });
            alert("Imagem atualizada com sucesso!");
            location.reload();
        } else {
            throw new Error("Erro no upload");
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar imagem no servidor.");
    }
}

export async function pushvalidade() {
    const container = el('alertas-validade');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!container || !userSessao) return;

    const snap = await getDocs(collection(db, "usuarios", userSessao.nome, "validades"));
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    container.innerHTML = '';

    let alertas = [];
    snap.forEach(d => {
        const item = d.data();
        const dataVal = new Date(item.validade + 'T12:00:00');
        const dias = Math.ceil((dataVal - hoje) / 86400000);
        if (dias <= 10) alertas.push({ ...item, dias });
    });

    if (alertas.length > 0) {
        container.classList.remove('hide');
        alertas.forEach(a => {
            const div = document.createElement('div');
            div.className = a.dias <= 0 ? 'alerta-validade-venceu' : 'alerta-validade';
            div.textContent = `${a.dias <= 0 ? '❌' : '⚠️'} ${a.nome} (${a.dias}d)`;
            container.appendChild(div);
        });
    } else {
        container.classList.add('hide');
    }
}