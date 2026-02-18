import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const { Camera, CameraResultType, CameraSource } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

export async function verificar_login() {
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    const menuIcon = el('abrir_menu_icon');

    if (userSessao) {
        if (menuIcon) menuIcon.classList.remove('hide');
        const docSnap = await getDoc(doc(db, "usuarios", userSessao.nome));
        renderizarPerfil(docSnap.exists() ? docSnap.data() : userSessao);
        pushvalidade(); 
    } else {
        if (menuIcon) menuIcon.classList.add('hide');
        renderizarTelaLogin();
    }
}

function renderizarTelaLogin() {
    el('login').innerHTML = `
        <div class="login-container" style="text-align:center; padding:40px 20px;">
            <img src="./img/logo.png" style="width:120px; margin-bottom:20px;">
            <h2>SISTEMA IKEDA</h2>
            <input type="text" id="auth_user" placeholder="Usuário" class="inpute" style="width:100%; margin-bottom:15px;">
            <input type="password" id="auth_pass" placeholder="Senha" class="inpute" style="width:100%; margin-bottom:20px;">
            <button id="btn_entrar" class="buttonadd" style="width:100%;">ENTRAR</button>
            <button id="btn_cadastrar" style="margin-top:20px; background:none; border:none; color:#2980b9;">Criar nova conta</button>
        </div>
    `;
    el('btn_entrar').onclick = login;
    el('btn_cadastrar').onclick = cadastrar;
}

async function login() {
    const user = el('auth_user').value.trim().toLowerCase();
    const pass = el('auth_pass').value.trim();
    if (!user || !pass) return alert("Preencha tudo!");
    
    const snap = await getDoc(doc(db, "usuarios", user));
    if (snap.exists() && snap.data().senha === pass) {
        localStorage.setItem('sessao_ikeda', JSON.stringify({ nome: user }));
        toque('mario_coin_s');
        location.reload();
    } else {
        alert("Usuário ou senha inválidos!");
    }
}

async function cadastrar() {
    const user = el('auth_user').value.trim().toLowerCase();
    const pass = el('auth_pass').value.trim();
    if (user.length < 3) return alert("Usuário muito curto!");
    
    const snap = await getDoc(doc(db, "usuarios", user));
    if (snap.exists()) return alert("Usuário já existe!");

    await setDoc(doc(db, "usuarios", user), { nome: user, senha: pass, foto: "", qrcode: "" });
    alert("Conta criada! Agora faça login.");
}

function renderizarPerfil(user) {
    el('login').innerHTML = `
        <div style="text-align:center; padding:20px;">
            <p style="font-size:12px; color:gray; margin-bottom:10px;">(Dois cliques na imagem para alterar)</p>
            <img id="perfil_foto" src="${user.foto || './img/user_placeholder.png'}" 
                 style="width:120px; height:120px; border-radius:50%; object-fit:cover; border:3px solid #2c3e50; cursor:pointer;">
            
            <h3>${user.nome.toUpperCase()}</h3>
            
            <div style="margin:20px 0;">
                <img id="perfil_qrcode" src="${user.qrcode || './img/layout/login_confiança_jackson.jpeg'}" 
                     style="width:180px; border-radius:10px; cursor:pointer; border:1px solid #ddd;">
                <p style="font-size:11px; color:gray;">QR CODE DE PAGAMENTO</p>
            </div>
            
            <button id="logout_btn" class="buttonadd" style="background:#e74c3c; width:100%;">SAIR DO SISTEMA</button>
        </div>
    `;

    // Eventos de clique duplo
    el('perfil_foto').ondblclick = () => alterarImagem(user.nome, 'foto');
    el('perfil_qrcode').ondblclick = () => alterarImagem(user.nome, 'qrcode');

    el('logout_btn').onclick = () => { 
        localStorage.clear(); 
        location.reload(); 
    };
}

// FUNÇÃO PARA ALTERAR IMAGEM (CAMERA + IMGBB + FIREBASE)
async function alterarImagem(userName, campo) {
    const confirmacao = confirm(`Deseja alterar sua ${campo === 'foto' ? 'foto de perfil' : 'imagem de QR Code'}?`);
    if (!confirmacao) return;

    try {
        if (!Camera) {
            alert("Plugin de câmera não encontrado.");
            return;
        }

        // 1. Tirar foto ou escolher da galeria
        const image = await Camera.getPhoto({
            quality: 80,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Prompt // Pergunta se quer câmera ou galeria
        });

        if (image && image.base64String) {
            alert("Fazendo upload... aguarde.");

            // 2. Upload para ImgBB
            const formData = new FormData();
            formData.append("image", image.base64String);

            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: "POST",
                body: formData
            });

            const json = await res.json();

            if (json.success) {
                const urlFinal = json.data.url;

                // 3. Salvar no Firebase
                await updateDoc(doc(db, "usuarios", userName), {
                    [campo]: urlFinal
                });

                alert("Sucesso! Imagem atualizada.");
                location.reload(); // Recarrega para aplicar mudanças
            } else {
                alert("Erro ao enviar para o servidor de imagens.");
            }
        }
    } catch (error) {
        console.error("Erro ao alterar imagem:", error);
        alert("Operação cancelada ou erro no processo.");
    }
}

export async function pushvalidade() {
    const container = el('alertas-validade');
    const userSessao = JSON.parse(localStorage.getItem('sessao_ikeda'));
    if (!container || !userSessao) return;

    const snap = await getDocs(collection(db, "usuarios", userSessao.nome, "validades"));
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
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