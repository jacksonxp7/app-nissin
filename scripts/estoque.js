export async function rodarEstoqueCompleto() {
  console.log('🔄 Iniciando estoque completo...');

  const container = document.getElementById('itens');
  if (!container) {
    console.error('❌ Container #itens não encontrado');
    return;
  }

  // garante que apareça
  // container.classList.remove('hide');
  // container.style.display = 'flex';
  // container.style.flexDirection = 'column';
  // container.innerHTML = '';

  try {
    const { collection, getDocs } =
      await import("https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js");

    const { db } = await import('./firebase.js');

    const categoriasSnap = await getDocs(collection(db, 'produtos'));

    if (categoriasSnap.empty) {
      console.warn('⚠️ Nenhuma categoria encontrada');
      container.innerHTML = '<p>Nenhum produto encontrado</p>';
      return;
    }

    for (const categoriaDoc of categoriasSnap.docs) {
      const nomeCategoria = categoriaDoc.id;

      const idCategoria = nomeCategoria
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      console.log(`📦 Categoria: ${nomeCategoria}`);

      // cria titulo
      const titulo = document.createElement('div');
      titulo.className = 'class_categoria';
      titulo.textContent = nomeCategoria;
      titulo.dataset.target = idCategoria;

      // cria lista
      const lista = document.createElement('div');
      lista.className = 'class_produto diminuir';
      lista.id = idCategoria;

      container.append(titulo, lista);

      // busca itens
      const itensSnap = await getDocs(
        collection(db, 'produtos', nomeCategoria, 'itens')
      );

      if (itensSnap.empty) {
        console.warn(`  ↳ Sem itens`);
        lista.innerHTML = '<p class="vazio">Sem itens</p>';
        continue;
      }

      itensSnap.forEach(itemDoc => {
        const item = itemDoc.data();

        console.log(`  🧾 Item (${itemDoc.id}):`, item);

        const div = document.createElement('div');
        div.className = 'produto';

        // 🔧 tratamento do preço (aceita 12.90, "12.90", "12,90")
        let preco = item.preco;

        if (typeof preco === 'string') {
          preco = preco.replace(',', '.');
        }

        preco = Number(preco);

        div.innerHTML = `
      <p class="texto_descritivo">${item.nome ?? 'Sem nome'}</p>
      <img src="${item.imagem ?? ''}" alt="${item.nome ?? ''}">
      <p>${!isNaN(preco)
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


    // toggle
    document.querySelectorAll('.class_categoria').forEach(botao => {
      botao.onclick = () => {
        const alvo = document.getElementById(botao.dataset.target);
        if (!alvo) return;

        const aberto = alvo.classList.contains('crescer');
        alvo.classList.toggle('crescer', !aberto);
        alvo.classList.toggle('diminuir', aberto);
      };
    });

    console.log('✅ Estoque completo finalizado');

  } catch (err) {
    console.error('❌ Erro no estoque completo:', err);
  }
}
