import { db } from './firebase.js';
import { getMarcasConfig } from './configs.js';

/**
 * Carrega o estoque respeitando a Ordem e Visibilidade das Configurações
 */
export async function rodarEstoqueCompleto() {
  console.log('🔄 Iniciando carregamento do estoque inteligente...');

  const container = document.getElementById('itens');
  if (!container) return;

  container.innerHTML = '<p style="padding:20px; color:#aaa; text-align:center;">Carregando estoque ordenado...</p>';

  try {
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

    // 1. IMPORTANTE: Usar AWAIT aqui para pegar os dados reais, não uma Promise
    const cfgMarcas = await getMarcasConfig(); 

    // 2. Busca as marcas/categorias no banco
    const categoriasSnap = await getDocs(collection(db, 'produtos'));

    if (categoriasSnap.empty) {
      container.innerHTML = '<p class="vazio">Nenhum produto encontrado.</p>';
      return;
    }

    // 3. Processa e Ordena a lista de categorias
    let listaCategorias = categoriasSnap.docs.map(doc => doc.id);

    listaCategorias = listaCategorias
      .filter(cat => {
        // Se não existir config, mostra por padrão (visivel: true)
        return cfgMarcas[cat] ? cfgMarcas[cat].visivel !== false : true;
      })
      .sort((a, b) => {
        // Ordena com base no número 'ordem' salvo no config
        const ordemA = cfgMarcas[a]?.ordem ?? 999;
        const ordemB = cfgMarcas[b]?.ordem ?? 999;
        return ordemA - ordemB;
      });

    container.innerHTML = '';

    // 4. Renderiza as marcas e seus itens
    for (const nomeCategoria of listaCategorias) {
      const idCategoria = nomeCategoria.toLowerCase().replace(/\s+/g, '_');

      const titulo = document.createElement('div');
      titulo.className = 'class_categoria';
      titulo.textContent = nomeCategoria.toUpperCase();
      titulo.dataset.target = idCategoria;

      const listaDiv = document.createElement('div');
      listaDiv.className = 'class_produto diminuir';
      listaDiv.id = idCategoria;

      container.append(titulo, listaDiv);

      // Busca itens da marca
      const itensSnap = await getDocs(collection(db, 'produtos', nomeCategoria, 'itens'));

      if (itensSnap.empty) {
        listaDiv.innerHTML = '<p style="padding:10px; color:#999;">Marca vazia.</p>';
        continue;
      }

      itensSnap.forEach(itemDoc => {
        const item = itemDoc.data();
        const divProd = document.createElement('div');
        divProd.className = 'produto';

        let preco = item.preco;
        if (typeof preco === 'string') preco = preco.replace(',', '.');
        preco = Number(preco);

        divProd.innerHTML = `
          <p class="texto_descritivo">${item.nome ?? 'Sem nome'}</p>
          <div class="container_img_estoque">
             <img src="${item.imagem ?? ''}" alt="${item.nome}" loading="lazy">
          </div>
          <p class="preco_estoque">${!isNaN(preco) 
            ? preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
            : '—' 
          }</p>
        `;
        listaDiv.appendChild(divProd);
      });
    }

    ativarEfeitoAccordion();
    console.log('✅ Estoque organizado e carregado!');

  } catch (err) {
    console.error('❌ Erro no estoque:', err);
    container.innerHTML = '<p class="erro">Erro ao carregar dados.</p>';
  }
}

function ativarEfeitoAccordion() {
  document.querySelectorAll('.class_categoria').forEach(botao => {
    botao.onclick = () => {
      const alvo = document.getElementById(botao.dataset.target);
      if (!alvo) return;
      const aberto = alvo.classList.contains('crescer');
      alvo.classList.toggle('crescer', !aberto);
      alvo.classList.toggle('diminuir', aberto);
      botao.classList.toggle('pulsar', !aberto);
    };
  });
}