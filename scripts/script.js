import { header } from './header.js';
import { verificar_login, pushvalidade } from './login.js'; // Verifique se o nome é login.js ou perfil.js
import { abastecer_screen } from './abastecimento.js';
import { rodarEstoqueCompleto } from './estoque.js';
import { validadesfunc } from './validade.js';
import { rodarDashboard } from './dashboard.js';
import { giro_vendas_screen } from './giro.js';
import { configs_screen } from './configs.js';
import { layout } from './layout.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Primeiro verifica o login (Crucial para as outras funções terem o nome do usuário)
    await verificar_login();
    
    // 2. Inicializa os componentes da interface
    header();
    abastecer_screen();
    rodarEstoqueCompleto();
    validadesfunc();
    giro_vendas_screen();
    configs_screen(); // Agora o nome coincide com o export do configs.js
    pushvalidade();
    rodarDashboard();
    layout();
});