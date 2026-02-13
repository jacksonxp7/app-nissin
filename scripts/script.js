import { header } from './header.js';
import { layout } from './layout.js';
import { abastecer_screen } from './abastecimento.js';
import { verificar_login, pushvalidade } from './login.js';
import { validadesfunc } from './validade.js';
import { rodarEstoqueCompleto } from './estoque.js';
import { configs_screen } from './configs.js';
import { giro_vendas_screen } from './giro.js';

async function inicializarApp() {
    console.log("🚀 App Iniciando...");

    // 1. Configurações fundamentais
    await configs_screen();    
    header();                  
    verificar_login();         
    
    // 2. Carregamento de dados (Estoque respeita a ordem das Configs)
    rodarEstoqueCompleto();
    abastecer_screen();
    validadesfunc();
    giro_vendas_screen();
    
    // 3. Interface e Alertas
    layout();
    pushvalidade();

    const dadosLogin = localStorage.getItem('cadastros');
    const elNome = document.getElementById('nomelogado');
    if (elNome && dadosLogin) {
        elNome.innerText = `Logado como: ${JSON.parse(dadosLogin).nome}`;
    }
}

// Inicialização segura
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarApp);
} else {
    inicializarApp();
}