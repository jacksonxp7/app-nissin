import { el, toque } from './utils.js';

export function verificar_login() {
    const txtNomeLogado = el('nomelogado');
    const btnLogar = el('logar_confianca');
    const btnLogout = el('logout_user_app');
    const cadastro = JSON.parse(localStorage.getItem('cadastros'));

    const realizarLogin = () => {
        const nome = prompt("Digite seu nome:");
        if (nome && nome.trim() !== "") {
            localStorage.setItem('cadastros', JSON.stringify({ nome: nome.trim().toLowerCase() }));
            location.reload();
        }
    };

    if (btnLogar) btnLogar.onclick = realizarLogin;
    if (btnLogout) btnLogout.onclick = () => {
        if (confirm("Sair?")) { localStorage.removeItem('cadastros'); location.reload(); }
    };

    if (txtNomeLogado) {
        txtNomeLogado.innerText = cadastro ? `LOGADO: ${cadastro.nome.toUpperCase()}` : "Ninguém logado";
    }
}

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