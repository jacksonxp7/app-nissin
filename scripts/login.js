import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Tenta pegar os plugins do Capacitor ou define como objeto vazio para evitar erros
const Camera = window.Capacitor?.Plugins?.Camera;
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
            <p style="font-size:11px; color:#7f8c8d; margin-bottom:15px;">Dê dois cliques na imagem para alterar</p>
            
            <div style="position:relative; display:inline-block;">
                <img id="perfil_foto" src="${user.foto || './img/user_placeholder.png'}" 
                     style="width:130px; height:130px; border-radius:50%; object-fit:cover; border:4px solid #2c3e50;">
            </div>

            <h2 style="margin: 15px 0 5px 0;">${user.nome.toUpperCase()}</h2>
            <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">

            <div style="margin:20px 0;">
                <p style="font-weight:bold; margin-bottom:10px;">SEU QR CODE:</p>
                <img id="perfil_qrcode" src="${user.qrcode || './img/layout/login_confiança_jackson.jpeg'}" 
                     style="width:200px; height:200px; border-radius:12px; border:2px dashed #bdc3c7; padding:5px; object-fit:contain;">
            </div>
            
            <button id="logout_btn" class="buttonadd" style="background:#e74c3c; width:100%; margin-top:30px;">SAIR DO SISTEMA</button>
            
            <!-- Input escondido para fallback caso a camera falhe -->
            <input type="file" id="input_file_fallback" style="display:none;" accept="image/*">
        </div>
    `;

    // Eventos de clique duplo
    el('perfil_foto').ondblclick = () => prepararTroca(user.nome, 'foto');
    el('perfil_qrcode').ondblclick = () => prepararTroca(user.nome, 'qrcode');

    el('logout_btn').onclick = () => { 
        localStorage.clear(); 
        location.reload(); 
    };
}

// Função que decide se usa Câmera ou Seletor de Arquivos
async function prepararTroca(userName, campo) {
    if (!confirm(`Deseja alterar esta imagem?`)) return;

    if (Camera) {
        // Tenta usar plugin do Capacitor (Celular)
        try {
            const image = await Camera.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: "base64" // Aqui o Capacitor pede a string como literal
            });
            if (image && image.base64String) {
                enviarParaImgBB(image.base64String, userName, campo);
            }
        } catch (err) {
            console.log("Câmera nativa indisponível, tentando seletor de arquivos...");
            acionarFallback(userName, campo);
        }
    } else {
        // Se não houver capacitor (Navegador), usa o input file
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
            // Remove o prefixo "data:image/png;base64," que o reader adiciona
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
            
            // Atualiza no Firebase Firestore
            const userRef = doc(db, "usuarios", userName);
            await updateDoc(userRef, {
                [campo]: urlFinal
            });

            alert("Sucesso! Imagem atualizada.");
            location.reload();
        } else {
            throw new Error("Erro no retorno do ImgBB");
        }
    } catch (error) {
        console.error(error);
        alert("Erro ao salvar imagem. Verifique sua conexão.");
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