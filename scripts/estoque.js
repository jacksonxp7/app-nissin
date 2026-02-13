import { db } from './firebase.js';
import { getMarcasConfig } from './configs.js';

/**
 * FUNÇÃO PRINCIPAL: Carrega o estoque respeitando a Ordem e Visibilidade
 * definidas na aba Configurações (Drag and Drop).
 */
export async function rodarEstoqueCompleto() {
  console.log('🔄 Iniciando carregamento do estoque inteligente...');

  const container = document.getElementById('itens');
  if (!container) {
    console.error('❌ Container #itens não encontrado no HTML');
    return;
  }

  // Feedback visual de carregamento
  container.innerHTML = '<p style="padding:20px; color:#aaa; text-align:center;">Carregando estoque ordenado...</p>';

  try {
    // Importação dinâmica do Firebase Firestore
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

    // 1. Pega as definições de ordem e visibilidade salvas no LocalStorage via configs.js
    const cfgMarcas = getMarcasConfig(); 

    // 2. Busca as categorias (marcas) no banco de dados Firebase
    const categoriasSnap = await getDocs(collection(db, 'produtos'));

    if (categoriasSnap.empty) {
      container.innerHTML = '<p class="vazio">Nenhum produto encontrado no banco de dados.</p>';
      return;
    }

    // 3. Transforma o snapshot em um array de IDs de marcas
    let listaCategorias = categoriasSnap.docs.map(doc => doc.id);

    // 4. FILTRAGEM E ORDENAÇÃO
    // Filtra as marcas: só mantém as que estão marcadas como "visivel" nas configs
    // Ordena as marcas: usa o número da posição (ordem) salvo no drag and drop
    listaCategorias = listaCategorias
      .filter(cat => {
        // Se a marca já existe nas configs, respeita a escolha do usuário. 
        // Se for uma marca nova no Firebase (ainda não configurada), mostra por padrão.
        const config = cfgMarcas[cat];
        return config ? config.visivel : true;
      })
      .sort((a, b) => {
        // Pega o número da ordem (ex: 1, 2, 3). Se não tiver ordem salva, joga pro fim (999).
        const ordemA = cfgMarcas[a]?.ordem || 999;
        const ordemB = cfgMarcas[b]?.ordem || 999;
        return ordemA - ordemB;
      });

    // Limpa o container para renderizar a lista final organizada
    container.innerHTML = '';

    // 5. LOOP PARA RENDERIZAR CADA MARCA NA SEQUÊNCIA CORRETA
    for (const nomeCategoria of listaCategorias) {
      
      // Gera um ID técnico para o container da categoria (slugify)
      const idCategoria = nomeCategoria
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      // Cria o elemento de Título (Botão para abrir/fechar os produtos)
      const titulo = document.createElement('div');
      titulo.className = 'class_categoria';
      titulo.textContent = nomeCategoria.toUpperCase();
      titulo.dataset.target = idCategoria;

      // Cria o container interno que guardará a lista de produtos
      const lista = document.createElement('div');
      lista.className = 'class_produto diminuir';
      lista.id = idCategoria;

      container.append(titulo, lista);

      // 6. BUSCA OS PRODUTOS DESTA MARCA ESPECÍFICA
      const itensSnap = await getDocs(
        collection(db, 'produtos', nomeCategoria, 'itens')
      );

      if (itensSnap.empty) {
        lista.innerHTML = '<p class="vazio" style="padding:10px; font-size:12px; color:#666;">Sem itens cadastrados.</p>';
        continue;
      }

      // 7. RENDERIZA OS PRODUTOS DENTRO DA LISTA
      itensSnap.forEach(itemDoc => {
        const item = itemDoc.data();
        const div = document.createElement('div');
        div.className = 'produto';

        // Garante que o preço seja tratado como número para formatação correta
        let preco = item.preco;
        if (typeof preco === 'string') {
          preco = preco.replace(',', '.');
        }
        preco = Number(preco);

        div.innerHTML = `
          <p class="texto_descritivo">${item.nome ?? 'Sem nome'}</p>
          <div class="container_img_estoque">
             <img src="${item.imagem ?? ''}" alt="${item.nome ?? 'foto'}" loading="lazy">
          </div>
          <p class="preco_estoque">${!isNaN(preco)
            ? preco.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            })
            : '—'
          }</p>
        `;

        lista.appendChild(div);
      });
    }

    // 8. ATIVA OS EVENTOS DE CLIQUE PARA O EFEITO ACORDEON (ABRIR/FECHAR)
    ativarEfeitoAccordion();

    console.log('✅ Estoque renderizado com sucesso seguindo a ordem das Configs!');

  } catch (err) {
    console.error('❌ Erro crítico ao carregar o estoque:', err);
    container.innerHTML = '<p class="erro">Erro ao carregar dados do Firebase. Verifique sua conexão.</p>';
  }
}

/**
 * Função auxiliar: Ativa o comportamento de expansão e recolhimento das categorias.
 */
function ativarEfeitoAccordion() {
  document.querySelectorAll('.class_categoria').forEach(botao => {
    botao.onclick = () => {
      const alvo = document.getElementById(botao.dataset.target);
      if (!alvo) return;

      const estaAberto = alvo.classList.contains('crescer');

      // Fecha se estiver aberto, abre se estiver fechado com animação
      if (estaAberto) {
        alvo.classList.remove('crescer');
        alvo.classList.add('diminuir');
        botao.classList.remove('pulsar');
      } else {
        alvo.classList.remove('diminuir');
        alvo.classList.add('crescer');
        botao.classList.add('pulsar');
      }
    };
  });
}