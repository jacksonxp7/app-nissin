import { historico } from "./firebase.js";
import { valordashboard } from './dashboard.js';
import { toque } from './login.js';

export function abastecer_screen() {
  /* --------------------------------------------------------
   * Elementos da interface
   * ------------------------------------------------------*/
  const el = {
    buttonAdd:    document.getElementById('buttonadd'),
    listaItens:   document.getElementById('lista-itens'),
    quantidade:   document.getElementById('quantidade_abastecer'),
    unidade:      document.getElementById('unabastecer'),
    itemInput:    document.getElementById('abastecer_item'),
    tbody:        document.getElementById('tbody'),
    datalist:     document.getElementById('lista-itens')
  };

  const sanitize = (v)=> v.replace(/\//g,'_');
  const hoje = new Date().toISOString().split('T')[0];

  /* --------------------------------------------------------
   * Auxiliar: regra de multiplicador ↔ unidades por caixa
   * ------------------------------------------------------*/
  function getMultiplicador(nome){
    const n = nome.toLowerCase();
    if(n.includes('cup'))                                    return 30;
    if(n.includes('nissin'))                                 return 50;
    if(n.includes('ufo'))                                    return 50;
    if(n.includes('snickers'))                               return 50;
    if(n.includes('espaguete 5'))                            return 50;
    if(n.includes('500g'))                                   return 50;
    if(n.includes('galinha caipira'))                        return 50;
    if(n.includes('bifum'))                                  return 50;
    if(n.includes('raffaello 3 unidades'))                   return 50;
    if(n.includes('raffaello 15 unidades'))                  return 50;
    if(n.includes('raffaello t9'))                           return 50;
    if(n.includes('chocolate ferrero'))                      return 50;
    if(n.includes('bombom ferrero collection'))              return 50;
    if(n.includes('bombom ferrero rocher 24'))               return 50;
    if(n.includes('bombom ferrero rocher 3'))                return 50;
    if(n.includes('bombom ferrero rocher 4'))                return 50;
    if(n.includes('bombom ferrero rocher 8'))                return 50;
    if(n.includes('nutella pote 140g'))                      return 50;
    if(n.includes('nutella pote 650g'))                      return 50;
    if(n.includes('creme de avelã nutella'))                 return 50;
    if(n.includes('wafer nutella b-ready'))                  return 50;
    if(n.includes('hanuta'))                                 return 50;
    if(n.includes('chocolate kinder bueno'))                 return 50;
    if(n.includes('chocolate kinder ovo'))                   return 50;
    if(n.includes('chocolate kinder joy'))                   return 50;
    if(n.includes('tronky'))                                 return 50;
    if(n.includes('snickers variedades'))                    return 50;
    if(n.includes('bala fini 80g'))                          return 50;
    if(n.includes('bala fini tubes 27g'))                    return 50;
    if(n.includes('bala fini tubes 15g'))                    return 50;
    if(n.includes('bala fini tubes 80g'))                    return 50;
    return 1; // padrão
  }

  /* --------------------------------------------------------
   * Pré‑carrega produtos no <datalist>
   * ------------------------------------------------------*/
  fetch('teste.json')
    .then(r=>r.json())
    .then(produtos=>{
      Object.values(produtos).flat().forEach(({nome})=>{
        const option = document.createElement('option');
        option.value = nome.replace('Macarrão Instantâneo','').trim();
        el.datalist.appendChild(option);
      });
    })
    .catch(console.error);

  /* --------------------------------------------------------
   * Adiciona linha na tabela
   * ------------------------------------------------------*/
  async function adicionarLinha(){
    const nomeDigitado = el.itemInput.value.trim();
    if(!nomeDigitado){
      console.warn('⚠️ Escreva um item');
      return;
    }

    /* Busca preço no JSON usando contains */
    const produtos  = await (await fetch('teste.json')).json();
    const lista     = Object.values(produtos).flat();
    const encontrado= lista.find(p=>p.nome.toLowerCase().includes(nomeDigitado.toLowerCase()));
    const preco     = encontrado?.preco ?? '—';

    /* Unidade digitada (cx ou un) */
    const unidadeVal = el.unidade.value.toLowerCase();

    /* Categoria (mesma lógica anterior) */
    const chaves=['nissin','ferrero','kinder','m&m','snickers','fini','santa helena','ajinomoto','ingleza','rafaello','bala','uau','crokíssimo','grelhaditos','mendorato','cup','turma','talharim'];
    const categoria= chaves.find(c=>nomeDigitado.toLowerCase().includes(c)) || 'outros';

    /* Quantidades ------------------------------------------------*/
    const qtdInput      = parseFloat(el.quantidade.value) || 1;
    let qtdCaixas, unidades, multiplicador;

    if(unidadeVal === 'un'){
      multiplicador = 1;
      qtdCaixas     = '-';
      unidades      = qtdInput;
    }else{ // assume 'cx'
      multiplicador = getMultiplicador(nomeDigitado);
      qtdCaixas     = qtdInput;
      unidades      = qtdInput * multiplicador;
    }

    /* Cria linha de categoria, se ainda não existir */
    let catRow = [...el.tbody.querySelectorAll('tr')].find(r=>r.dataset.categoria===categoria);
    if(!catRow){
      catRow = document.createElement('tr');
      catRow.dataset.categoria = categoria;
      catRow.classList.add('categoria-row');
      catRow.innerHTML = `<td colSpan="5" class="${categoria}_rowz">${categoria.charAt(0).toUpperCase()+categoria.slice(1)}</td>`;
      el.tbody.appendChild(catRow);
    }

    /* ID único para remoção */
    const id = Date.now().toString(36)+Math.random().toString(36).slice(2,8);

    /* Linha do item */
    const linha = document.createElement('tr');
    linha.dataset.id = id;
    linha.innerHTML = `
      <td class="pedido">${nomeDigitado}</td>
      <td class="pedido">${qtdCaixas}</td>
      <td class="pedido">${unidadeVal}</td>
      <td class="resultado">${unidades}</td>
      <td class="resultado">${preco}</td>`;
    linha.ondblclick = removerLinha;
    el.tbody.insertBefore(linha, catRow.nextSibling);

    /* Salva localmente e no Firestore */
    const cadastro = JSON.parse(localStorage.getItem('cadastros')) || {};
    const item = {
      id,
      nome: nomeDigitado,
      quantidade: qtdInput,
      unidade: unidadeVal,
      categoria,
      preco,
      multiplicador,
      unidades
    };

    await historico(cadastro.nome, item.nome, item.quantidade, item.unidade, categoria, 'abastecimento', 'não determinado', preco);

    const salvos = JSON.parse(localStorage.getItem('abastecimento')) || [];
    salvos.push(item);
    localStorage.setItem('abastecimento', JSON.stringify(salvos));

    /* Limpa inputs & som */
    el.itemInput.value='';
    el.quantidade.value='';
    toque('mario_coin_s');
  }

  /* --------------------------------------------------------
   * Remove linha (usa id único)
   * ------------------------------------------------------*/
  function removerLinha(e){
    const linha = e.target.closest('tr');
    if(!linha || linha.classList.contains('categoria-row')) return;

    const id = linha.dataset.id;
    let salvos = JSON.parse(localStorage.getItem('abastecimento')) || [];
    salvos = salvos.filter(i=>i.id !== id);
    localStorage.setItem('abastecimento', JSON.stringify(salvos));

    const catRow = linha.previousElementSibling?.classList.contains('categoria-row')
      ? linha.previousElementSibling
      : [...el.tbody.querySelectorAll('.categoria-row')].find(r=>r.nextElementSibling===linha);

    linha.remove();
    if(catRow && (!catRow.nextElementSibling || catRow.nextElementSibling.classList.contains('categoria-row'))){
      catRow.remove();
    }

    toque('z_s');
  }

  /* --------------------------------------------------------
   * Carrega itens salvos
   * ------------------------------------------------------*/
  function carregarLinhasSalvas(){
    el.tbody.innerHTML='';
    const salvos = JSON.parse(localStorage.getItem('abastecimento')) || [];
    const categoriasAdicionadas = new Set();

    salvos.forEach(item=>{
      /* complementa dados para itens antigos */
      if(!item.unidades){
        if(item.unidade==='un') item.unidades = item.quantidade;
        else{
          item.multiplicador = getMultiplicador(item.nome);
          item.unidades = item.quantidade * item.multiplicador;
        }
      }

      let catRow = [...el.tbody.querySelectorAll('.categoria-row')].find(r=>r.dataset.categoria===item.categoria);
      if(!categoriasAdicionadas.has(item.categoria)){
        if(!catRow){
          catRow = document.createElement('tr');
          catRow.dataset.categoria = item.categoria;
          catRow.classList.add('categoria-row');
          catRow.innerHTML = `<td colSpan="5" class="${item.categoria}_rowz">${item.categoria.charAt(0).toUpperCase()+item.categoria.slice(1)}</td>`;
          el.tbody.appendChild(catRow);
        }
        categoriasAdicionadas.add(item.categoria);
      }

      const linha = document.createElement('tr');
      linha.dataset.id = item.id || '';
      const caixasDisplay = item.unidade==='un' ? '-' : item.quantidade;
      linha.innerHTML=`
        <td class="pedido">${item.nome}</td>
        <td class="pedido">${caixasDisplay}</td>
        <td class="pedido">${item.unidade}</td>
        <td class="resultado">${item.unidades}</td>
        <td class="resultado">${item.preco ?? '—'}</td>`;
      linha.ondblclick = removerLinha;

      catRow = [...el.tbody.querySelectorAll('.categoria-row')].find(r=>r.dataset.categoria===item.categoria);
      el.tbody.insertBefore(linha, catRow.nextSibling);
    });
  }

  /* --------------------------------------------------------
   * Inicialização
   * ------------------------------------------------------*/
  valordashboard(JSON.parse(localStorage.getItem('cadastros'))?.nome, 'abastecimento', sanitize(hoje));
  window.onload = carregarLinhasSalvas;
  el.buttonAdd.addEventListener('click', adicionarLinha);
  el.tbody.addEventListener('dblclick', removerLinha);
}
