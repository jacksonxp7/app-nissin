import { el, toque } from './utils.js';

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

/* ============================================================
   1. VERIFICAÇÃO DE LOGIN E FOTO DE PERFIL
============================================================ */
export function verificar_login() {
    const loginContainer = el('login');
    const menuNavegacao = el('menu');
    const iconeAbrirMenu = el('abrir_menu_icon'); 
    const txtNomeLogado = el('nomelogado');
    const btnLogar = el('logar_confianca');
    const btnLogout = el('logout_user_app');
    
    // Procura a imagem dentro da div login
    const imgPerfil = loginContainer ? loginContainer.querySelector('img') : null;

    const cadastro = JSON.parse(localStorage.getItem('cadastros'));

    // --- LÓGICA DE INTERFACE DINÂMICA ---
    if (cadastro) {
        // USUÁRIO LOGADO
        if (txtNomeLogado) txtNomeLogado.innerText = `LOGADO: ${cadastro.nome.toUpperCase()}`;
        if (btnLogar) btnLogar.classList.add('hide'); 
        
        if (btnLogout) {
            btnLogout.classList.remove('hide');
            // Estilização para o botão ficar grande
            btnLogout.style.display = "block";
            btnLogout.style.padding = "20px";
            btnLogout.style.width = "100%";
            btnLogout.style.fontSize = "18px";
            btnLogout.style.fontWeight = "bold";
            btnLogout.style.marginTop = "10px";
        }
        
        // MOSTRAR ÍCONE DO MENU
        if (iconeAbrirMenu) {
            iconeAbrirMenu.classList.remove('hide');
            iconeAbrirMenu.classList.add('show');
        }

        // --- CARREGAR FOTO DE PERFIL ---
        if (imgPerfil) {
            // Se o usuário tem uma foto salva no ImgBB, usa ela. Caso contrário, usa o QR Code padrão.
            const fotoParaExibir = (cadastro.foto && cadastro.foto !== "") ? cadastro.foto : "./img/layout/login_confiança_jackson.jpeg";
            imgPerfil.src = fotoParaExibir;
            
            // Forçar estilo para a foto não quebrar o layout
            imgPerfil.style.width = "250px";
            imgPerfil.style.height = "250px";
            imgPerfil.style.objectFit = "cover";
            imgPerfil.style.borderRadius = "15px";
            imgPerfil.style.display = "block";
            imgPerfil.style.margin = "0 auto 20px auto";
        }

    } else {
        // USUÁRIO DESLOGADO
        if (txtNomeLogado) txtNomeLogado.innerText = "ACESSO RESTRITO";
        if (btnLogar) btnLogar.classList.remove('hide');
        if (btnLogout) btnLogout.classList.add('hide');
        
        // ESCONDER MENU E ÍCONE TOTALMENTE
        if (menuNavegacao) menuNavegacao.classList.add('hide');
        if (iconeAbrirMenu) {
            iconeAbrirMenu.classList.remove('show');
            iconeAbrirMenu.classList.add('hide');
        }

        // Imagem padrão quando deslogado
        if (imgPerfil) {
            imgPerfil.src = "./img/layout/login_confiança_jackson.jpeg";
            imgPerfil.style.width = "250px";
            imgPerfil.style.height = "auto";
            imgPerfil.style.margin = "0 auto 20px auto";
            imgPerfil.style.display = "block";
        }
    }

    // --- FUNÇÃO PARA REALIZAR LOGIN ---
    const realizarLogin = () => {
        const nome = prompt("Digite seu nome:");
        if (nome && nome.trim() !== "") {
            const novoUsuario = { 
                nome: nome.trim().toLowerCase(),
                foto: "" 
            };
            localStorage.setItem('cadastros', JSON.stringify(novoUsuario));
            toque('mario_coin_s');
            location.reload();
        }
    };

    // --- FUNÇÃO PARA MUDAR FOTO (DOIS CLIQUES) ---
    const mudarFotoPerfil = async () => {
        if (!cadastro) return;

        try {
            const image = await Camera.getPhoto({
                quality: 60,
                resultType: 'base64',
                source: 'PROMPT',
                width: 600
            });

            if (imgPerfil) imgPerfil.style.opacity = "0.5";

            const formData = new FormData();
            formData.append("image", image.base64String);
            const nomeArq = `perfil_${cadastro.nome}_${Date.now()}`;

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}&name=${nomeArq}`, {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                cadastro.foto = result.data.url;
                localStorage.setItem('cadastros', JSON.stringify(cadastro));
                
                if (imgPerfil) {
                    imgPerfil.src = result.data.url;
                    imgPerfil.style.opacity = "1";
                }
                
                toque('mario_coin_s');
                alert("QR Code ou Foto atualizada com sucesso!");
            }
        } catch (err) {
            if (imgPerfil) imgPerfil.style.opacity = "1";
            console.log("Captura cancelada ou erro no upload");
        }
    };

    // --- ATRIBUIÇÃO DE EVENTOS ---
    if (btnLogar) btnLogar.onclick = realizarLogin;
    
    if (btnLogout) {
        btnLogout.onclick = () => {
            if (confirm("Deseja realmente sair do aplicativo?")) { 
                localStorage.removeItem('cadastros'); 
                location.reload(); 
            }
        };
    }

    if (imgPerfil) {
        imgPerfil.ondblclick = mudarFotoPerfil; 
    }
}

/* ============================================================
   2. ALERTAS DE VALIDADE
============================================================ */
export function pushvalidade() {
    const container = el('alertas-validade');
    if (!container) return;
    
    if (!localStorage.getItem('cadastros')) {
        container.classList.add('hide');
        return;
    }

    const validades = JSON.parse(localStorage.getItem('validades')) || [];
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    container.innerHTML = '';
    
    let encontrouAlerta = false;

    validades.forEach(item => {
        const dataVal = new Date(item.validade + 'T12:00:00');
        const dias = Math.ceil((dataVal - hoje) / 86400000);
        
        if (dias <= 10) {
            encontrouAlerta = true;
            const div = document.createElement('div');
            div.className = dias <= 0 ? 'alerta-validade-venceu' : 'alerta-validade';
            div.textContent = `${dias <= 0 ? '❌' : '⚠️'} ${item.nome} (${dias}d)`;
            container.appendChild(div);
        }
    });

    if (encontrouAlerta) {
        container.classList.remove('hide');
        container.classList.add('show');
    } else {
        container.classList.add('hide');
    }
}