import { header } from './header.js';
import { verificar_login, pushvalidade } from './login.js';
import { abastecer_screen } from './abastecimento.js';
import { rodarEstoqueCompleto } from './estoque.js';
import { validadesfunc } from './validade.js';
import { rodarDashboard } from './dashboard.js';
import { giro_vendas_screen } from './giro.js';
import { configs_screen } from './configs.js';
import { layout } from './layout.js';

document.addEventListener('DOMContentLoaded', async () => {
    await verificar_login();
    const logado = localStorage.getItem('sessao_ikeda');
    header();
    abastecer_screen();
    rodarEstoqueCompleto();
    rodarDashboard();
    if (logado) {
        await validadesfunc();
        await giro_vendas_screen();
        await configs_screen();
        await layout();
        await pushvalidade();
    }
});