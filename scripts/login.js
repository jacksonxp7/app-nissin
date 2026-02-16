import { el, toque } from './utils.js';

const { Camera } = window.Capacitor?.Plugins || {};
const IMGBB_API_KEY = "9f6fd322c28c3a3bd00598cc314ba73d";

/* ============================================================
   1. VERIFICAÇÃO DE LOGIN E FOTO DE PERFIL
============================================================ */
export function verificar_login() {
    const txtNomeLogado = el('nomelogado');
    const btnLogar = el('logar_confianca');
    const btnLogout = el('logout_user_app');
    const imgPerfil = el('perfil_foto_user'); // ID da imagem no seu HTML
    
    const cadastro = JSON.parse(localStorage.getItem('cadastros'));

    // --- FUNÇÃO PARA REALIZAR LOGIN ---
    const realizarLogin = () => {
        const nome = prompt("Digite seu nome:");
        if (nome && nome.trim() !== "") {
            const novoUsuario = { 
                nome: nome.trim().toLowerCase(),
                foto: "" // Inicia sem foto
            };
            localStorage.setItem('cadastros', JSON.stringify(novoUsuario));
            location.reload();
        }
    };

    // --- FUNÇÃO PARA MUDAR/ADICIONAR FOTO DE PERFIL ---
    const mudarFotoPerfil = async () => {
        if (!cadastro) {
            alert("Faça login primeiro!");
            return;
        }

        try {
            const image = await Camera.getPhoto({
                quality: 60,
                resultType: 'base64',
                source: 'PROMPT', // Pergunta se quer Câmera ou Galeria
                width: 500 // Foto de perfil não precisa ser grande
            });

            if (imgPerfil) imgPerfil.style.opacity = "0.5"; // Feedback de carregamento

            const formData = new FormData();
            formData.append("image", image.base64String);
            
            const nomeArq = `perfil_${cadastro.nome}_${Date.now()}`;

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}&name=${nomeArq}`, {
                method: "POST",
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                const urlFoto = result.data.url;
                
                // Atualiza o LocalStorage mantendo o nome e trocando a foto
                cadastro.foto = urlFoto;
                localStorage.setItem('cadastros', JSON.stringify(cadastro));

                // Atualiza a imagem na tela na hora
                if (imgPerfil) {
                    imgPerfil.src = urlFoto;
                    imgPerfil.style.opacity = "1";
                }
                
                toque('mario_coin_s');
                alert("Foto de perfil atualizada!");
            }
        } catch (err) {
            console.log("Erro ou cancelamento:", err);
            if (imgPerfil) imgPerfil.style.opacity = "1";
        }
    };

    // --- CONFIGURAÇÃO DOS EVENTOS ---
    if (btnLogar) btnLogar.onclick = realizarLogin;
    
    if (btnLogout) btnLogout.onclick = () => {
        if (confirm("Deseja realmente sair?")) { 
            localStorage.removeItem('cadastros'); 
            location.reload(); 
        }
    };

    // Clique na foto para alterar
    if (imgPerfil) {
        imgPerfil.onclick = mudarFotoPerfil;
        
        // Se já tiver foto salva, exibe. Se não, usa uma padrão.
        if (cadastro && cadastro.foto) {
            imgPerfil.src = cadastro.foto;
        } else {
            imgPerfil.src = "img/user_placeholder.png"; // Tenha uma imagem padrão na pasta img
        }
    }

    if (txtNomeLogado) {
        txtNomeLogado.innerText = cadastro ? `LOGADO: ${cadastro.nome.toUpperCase()}` : "Ninguém logado";
    }
}

/* ============================================================
   2. ALERTAS DE VALIDADE
============================================================ */
export function pushvalidade() {
    const container = el('alertas-validade');
    if (!container) return;
    
    const validades = JSON.parse(localStorage.getItem('validades')) || [];
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    container.innerHTML = '';
    
    validades.forEach(item => {
        const dataVal = new Date(item.validade + 'T12:00:00');
        const dias = Math.ceil((dataVal - hoje) / 86400000);
        
        if (dias <= 10) {
            const div = document.createElement('div');
            div.className = dias <= 0 ? 'alerta-validade-venceu' : 'alerta-validade';
            div.textContent = `${dias <= 0 ? '❌' : '⚠️'} ${item.nome} (${dias}d)`;
            container.appendChild(div);
        }
    });
}