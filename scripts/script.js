import { header } from './header.js';
import { verificar_login, pushvalidade } from './login.js';
import { abastecer_screen } from './abastecimento.js';
import { rodarEstoqueCompleto } from './estoque.js';
import { validadesfunc } from './validade.js';
import { rodarDashboard } from './dashboard.js';
import { giro_vendas_screen } from './giro.js';
import { configs_screen } from './configs.js';

document.addEventListener('DOMContentLoaded', async () => {
    verificar_login();
    header();
    abastecer_screen();
    rodarEstoqueCompleto();
    validadesfunc();
    giro_vendas_screen();
    configs_screen();
    pushvalidade();
    rodarDashboard();
});