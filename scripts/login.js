
export function pushvalidade() {
  const container = document.getElementById("alertas-validade");

  // Limpa classes e conteúdo anteriores
  container.classList.remove('hide', 'closepush');
  void container.offsetWidth; // força reflow
  container.classList.add('show');


  container.innerHTML = "";

  const validadesSalvas = JSON.parse(localStorage.getItem('validades')) || [];
  const hoje = new Date();
  let alertaMostrado = false;

  validadesSalvas.forEach(item => {
    const [dia, mes, ano] = item.validade.split('/');
    const dataValidade = new Date(`${ano}-${mes}-${dia}`);
    const diffMs = dataValidade - hoje;
    const diasTotais = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const alerta = document.createElement("div");

    if (diasTotais <= 0) {
      alerta.className = "alerta-validade-venceu";
      alerta.textContent = `❌ Atenção! O produto "${item.nome}" está vencido há ${Math.abs(diasTotais)} dia(s) (Validade: ${item.validade}).`;
      container.appendChild(alerta);
      alertaMostrado = true;
    } else if (diasTotais <= 10) {
      alerta.className = "alerta-validade";
      alerta.textContent = `⚠️ Atenção! Faltam ${diasTotais} dia(s) para o item "${item.nome}" vencer (Validade: ${item.validade}).`;
      container.appendChild(alerta);
      alertaMostrado = true;
    }
  });

  if (!alertaMostrado) {
    const semAlerta = document.createElement("div");
    semAlerta.textContent = "✅ Nenhum item com 10 dias para vencer.";
    semAlerta.style.cssText = "color: green; margin: 10px 0;";
    container.appendChild(semAlerta);
  }
  setTimeout(() => {

    container.classList.add('push');
  }, 2000)

  setTimeout(() => {

    container.classList.remove('push');
    container.classList.add('closepush');
  }, 10000)



  const fechar = document.createElement("div");
  fechar.textContent = "dispensar";
  fechar.className = "dispensar";
  container.appendChild(fechar);

  // Evento de fechamento com animação
  fechar.addEventListener('click', () => {
    container.classList.remove('push');
    void container.offsetWidth; // força reflow
    container.classList.add('closepush');

    container.addEventListener('animationend', function handleEnd() {
      container.classList.add('hide');
      container.classList.remove('show', 'closepush');
      container.removeEventListener('animationend', handleEnd);

    });
    toque('z_s')
  });
}
export function toque(qual) {
  const som = document.getElementById(qual);
  som.currentTime = 0;
  som.play();
}

export function verificar_login() {
  const cadastroStored = JSON.parse(localStorage.getItem('cadastros')) || {};

  if (typeof cadastroStored['nome'] === 'undefined' || !cadastroStored['nome']) {
    console.log('⚠️ Faça login');

    // Cria a div de login
    const telaCadastro = document.createElement('div');
    telaCadastro.id = 'tela-login';

    const textoboas = document.createElement('div');
    textoboas.classList.add('textoboas');
    textoboas.innerHTML = `Seja bem-vindo!`;


    const inputNome = document.createElement('input');
    inputNome.type = 'text';
    inputNome.placeholder = 'Digite seu nome';
    inputNome.classList.add('inputnome')


    const botaoLogin = document.createElement('button');
    botaoLogin.classList.add('butonlogin')
    botaoLogin.textContent = 'Entrar';



    // Ao clicar no botão
    botaoLogin.onclick = () => {
      const nomeDigitado = inputNome.value.trim();
      if (nomeDigitado !== '') {
        const novoCadastro = { nome: nomeDigitado };
        localStorage.setItem('cadastros', JSON.stringify(novoCadastro));
        document.body.removeChild(telaCadastro);
        console.log(`✅ Usuário ${nomeDigitado} logado.`);
        window.location.reload();
      } else {
        alert('Digite um nome para continuar.');
      }
    };

    // Adiciona input e botão na tela de login
    telaCadastro.appendChild(textoboas);
    telaCadastro.appendChild(inputNome);
    telaCadastro.appendChild(botaoLogin);

    // Adiciona a tela de login ao body
    document.body.appendChild(telaCadastro);
  } else {
    console.log(`✅ Usuário já logado: ${cadastroStored['nome']}`);

    const telaCadastro = document.createElement('div');
    
    telaCadastro.id = 'tela-login';
    const textoboas = document.createElement('div');
    textoboas.classList.add('textoboas');
    textoboas.innerHTML = `olá ${cadastroStored['nome']}!`;


    telaCadastro.appendChild(textoboas);
    document.body.appendChild(telaCadastro);

    setTimeout(() => {
      telaCadastro.remove();
    }, 2000);


  }
}


