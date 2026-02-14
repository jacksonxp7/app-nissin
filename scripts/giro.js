import { el, toque, hojeISO } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let fotoBase64 = ""; 

/**
 * INICIALIZAÇÃO DA ABA GIRO
 */
export async function giro_vendas_screen() {
    const btnAddGiro = el('btn_add_giro');
    const inputFoto = el('giro_foto');
    const inputData = el('giro_data');
    const previewContainer = el('preview_container');
    const imgPreview = el('giro_foto_preview');

    // 1. Define a data de hoje como padrão no input
    if (inputData) {
        inputData.value = hojeISO();
    }

    // 2. Carrega as marcas do Firebase no Select
    await carregarCategoriasGiro();

    // 3. Gerencia a escolha da foto (Câmera ou Galeria)
    if (inputFoto) {
        // Removendo 'capture' para permitir escolha da Galeria no celular
        inputFoto.removeAttribute('capture'); 
        
        inputFoto.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onloadend = () => {
                fotoBase64 = reader.result;
                if (imgPreview) imgPreview.src = fotoBase64;
                if (previewContainer) previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        };
    }

    // 4. Configura o botão de adicionar
    if (btnAddGiro) {
        btnAddGiro.onclick = null; // Evita duplicação de eventos
        btnAddGiro.onclick = adicionarGiro;
    }

    // 5. Renderiza a lista de giros salvos
    renderizarGirosAccordion();
}

/**
 * BUSCA MARCAS DO FIREBASE
 */
async function carregarCategoriasGiro() {
    const select = el('giro_local');
    if (!select) return;

    // Reinicia o select com a opção padrão fixa
    select.innerHTML = '<option value="PONTO EXTRA">⭐ PONTO EXTRA</option>';

    try {
        const snap = await getDocs(collection(db, 'produtos'));
        snap.forEach(doc => {
            const opt = document.createElement('option');
            const nomeMarca = doc.id.toUpperCase();
            opt.value = nomeMarca;
            opt.textContent = nomeMarca;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Erro ao carregar categorias para o giro:", e);
    }
}

/**
 * SALVA O REGISTRO NO LOCALSTORAGE
 */
function adicionarGiro() {
    const local = el('giro_local').value;
    const data = el('giro_data').value;

    if (!local || !data || !fotoBase64) {
        alert("Preencha a Marca, Data e selecione uma Foto!");
        return;
    }

    const novoGiro = {
        id: Date.now(),
        local: local,
        data: data.split('-').reverse().join('/'),
        foto: fotoBase64
    };

    // Salva no LocalStorage
    const giros = JSON.parse(localStorage.getItem('giros_vendas')) || [];
    giros.push(novoGiro);
    localStorage.setItem('giros_vendas', JSON.stringify(giros));

    // Reseta a interface para o próximo registro
    fotoBase64 = "";
    const preview = el('preview_container');
    if (preview) preview.style.display = 'none';
    
    // Feedback
    toque('mario_coin_s');
    alert("Giro registrado com sucesso!");
    
    renderizarGirosAccordion();
}

/**
 * RENDERIZA A LISTA EM ESTILO ACORDEON
 */
function renderizarGirosAccordion() {
    const container = el('lista_giros');
    if (!container) return;

    const giros = JSON.parse(localStorage.getItem('giros_vendas')) || [];
    container.innerHTML = '';

    if (giros.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:gray; padding:20px;">Nenhum giro registrado.</p>';
        return;
    }

    // Agrupa os dados por marca/local
    const agrupados = giros.reduce((acc, giro) => {
        if (!acc[giro.local]) acc[giro.local] = [];
        acc[giro.local].push(giro);
        return acc;
    }, {});

    // Cria a interface para cada grupo
    Object.keys(agrupados).forEach(marca => {
        // --- CABEÇALHO DO ACORDEON ---
        const btnHeader = document.createElement('div');
        btnHeader.className = 'giro_aba_header'; 
        btnHeader.innerHTML = `<span>${marca}</span> <small>(${agrupados[marca].length})</small>`;

        // --- CORPO DO ACORDEON ---
        const corpoLista = document.createElement('div');
        corpoLista.className = 'giro_aba_corpo fechar_giro'; 

        agrupados[marca].reverse().forEach(g => {
            const item = document.createElement('div');
            item.className = 'giro_item_foto';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px; border-bottom: 1px solid #eee;">
                    <span style="font-size:13px; font-weight:bold; color: #2c3e50;">📅 ${g.data}</span>
                    <button class="giro_btn_excluir" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:5px; font-size:11px; cursor:pointer;">EXCLUIR</button>
                </div>
                <img src="${g.foto}" style="width:100%; border-radius:0 0 8px 8px; display:block;">
            `;

            // Ação de excluir item específico
            item.querySelector('.giro_btn_excluir').onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Excluir foto de ${marca} do dia ${g.data}?`)) {
                    const filtrados = giros.filter(f => f.id !== g.id);
                    localStorage.setItem('giros_vendas', JSON.stringify(filtrados));
                    toque('decide_s');
                    renderizarGirosAccordion();
                }
            };

            corpoLista.appendChild(item);
        });

        // --- LÓGICA DE ABRIR/FECHAR ---
        btnHeader.onclick = () => {
            const estaFechado = corpoLista.classList.contains('fechar_giro');
            
            // Fecha todos antes de abrir o atual (Efeito sanfona)
            document.querySelectorAll('.giro_aba_corpo').forEach(c => {
                c.classList.add('fechar_giro');
                c.classList.remove('abrir_giro');
            });
            document.querySelectorAll('.giro_aba_header').forEach(h => h.classList.remove('ativo'));

            if (estaFechado) {
                corpoLista.classList.remove('fechar_giro');
                corpoLista.classList.add('abrir_giro');
                btnHeader.classList.add('ativo');
                toque('cursor_s');
            } else {
                toque('decide_s');
            }
        };

        container.append(btnHeader, corpoLista);
    });
}