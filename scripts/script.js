import { header } from './header.js';
import { verificar_login, pushvalidade } from './login.js';
import { abastecer_screen } from './abastecimento.js';
import { rodarEstoqueCompleto } from './estoque.js';
import { validadesfunc } from './validade.js';
import { rodarDashboard } from './dashboard.js';
import { giro_vendas_screen } from './giro.js';
import { configs_screen } from './configs.js';
import { layout } from './layout.js';
import { chat_screen } from './chat.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verifica o login e aguarda a resposta do Firebase
    await verificar_login();

    // Pegamos a sessão para saber se devemos carregar o restante
    const logado = localStorage.getItem('sessao_ikeda');

    // 2. Inicializa os componentes da interface
    header();
    abastecer_screen();
    rodarEstoqueCompleto();
    rodarDashboard();

    // Se estiver logado, carregamos as telas que buscam dados no Firebase
    if (logado) {
        await validadesfunc();
        await giro_vendas_screen();
        await configs_screen();
        await layout();
        await pushvalidade(); // Agora busca os alertas na nuvem
        chat_screen();
    }
});