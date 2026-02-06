import { header } from './header.js';
import { layout } from './layout.js';
import { abastecer_screen } from './abastecimento.js';
import { verificar_login, pushvalidade } from './login.js';
import { validadesfunc } from './validade.js';
// import { listarTodosItens } from './estoque.js';
import { rodarEstoqueCompleto } from './estoque.js';


rodarEstoqueCompleto();
header();
layout();
verificar_login();

abastecer_screen();   // ✅ abastecimento funciona
validadesfunc();
pushvalidade();

const nome = localStorage.getItem('cadastros');
document.getElementById('nomelogado').innerText =
  nome ? `login: ${JSON.parse(nome).nome}` : 'Faça login';
