import { el } from './utils.js';

/* ==========================
   LOGIN
========================== */
export function verificar_login() {
  const cadastro = JSON.parse(localStorage.getItem('cadastros'));

  if (cadastro?.nome) return;

  const tela = document.createElement('div');
  tela.id = 'tela-login';

  const titulo = document.createElement('div');
  titulo.textContent = 'Seja bem-vindo';

  const input = document.createElement('input');
  input.placeholder = 'Digite seu nome';

  const btn = document.createElement('button');
  btn.textContent = 'Entrar';

  btn.onclick = () => {
    const nome = input.value.trim();
    if (!nome) return alert('Digite um nome');
    localStorage.setItem('cadastros', JSON.stringify({ nome }));
    location.reload();
  };

  tela.append(titulo, input, btn);
  document.body.appendChild(tela);
}

/* ==========================
   ALERTA DE VALIDADE (PUSH)
========================== */
export function pushvalidade() {
  const container = el('alertas-validade');
  if (!container) return;

  container.innerHTML = '';

  const validades = JSON.parse(localStorage.getItem('validades')) || [];
  const hoje = new Date();

  let existeAlerta = false;

  validades.forEach(item => {
    const [d, m, a] = item.validade.split('/');
    const data = new Date(`${a}-${m}-${d}`);
    const dias = Math.ceil((data - hoje) / 86400000);

    if (dias <= 10) {
      const div = document.createElement('div');
      div.className = dias <= 0 ? 'alerta-validade-venceu' : 'alerta-validade';
      div.textContent =
        dias <= 0
          ? `❌ ${item.nome} vencido`
          : `⚠️ ${item.nome} vence em ${dias} dia(s)`;
      container.appendChild(div);
      existeAlerta = true;
    }
  });

  if (!existeAlerta) {
    container.textContent = '✅ Nenhum item próximo do vencimento';
  }
}

/* ==========================
   SOM
========================== */
export function toque(id) {
  const som = el(id);
  if (!som) return;
  som.currentTime = 0;
  som.play();
}
