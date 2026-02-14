import { el, toque, hojeISO } from './utils.js';
import { db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let fotoBase64 = ""; 

export async function giro_vendas_screen() {
    const btnAddGiro = el('btn_add_giro');
    const inputFoto = el('giro_foto');
    const inputData = el('giro_data');

    if (inputData) inputData.value = hojeISO();

    await carregarCategoriasGiro();

    if (inputFoto) {
        inputFoto.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                fotoBase64 = reader.result;
                el('giro_foto_preview').src = fotoBase64;
                el('preview_container').style.display = 'block';
            };
            if (file) reader.readAsDataURL(file);
        };
    }

    if (btnAddGiro) {
        btnAddGiro.onclick = null; 
        btnAddGiro.onclick = adicionarGiro;
    }

    renderizarGirosAccordion();
}

async function carregarCategoriasGiro() {
    const select = el('giro_local');
    if (!select) return;
    select.innerHTML = '<option value="PONTO EXTRA">⭐ PONTO EXTRA</option>';
    try {
        const snap = await getDocs(collection(db, 'produtos'));
        snap.forEach(doc => {
            const opt = document.createElement('option');
            opt.value = doc.id.toUpperCase();
            opt.textContent = doc.id.toUpperCase();
            select.appendChild(opt);
        });
    } catch (e) { console.error(e); }
}

function adicionarAbastecimentoLocal(novoGiro) {
    const giros = JSON.parse(localStorage.getItem('giros_vendas')) || [];
    giros.push(novoGiro);
    localStorage.setItem('giros_vendas', JSON.stringify(giros));
}

function adicionarGiro() {
    const local = el('giro_local').value;
    const data = el('giro_data').value;
    if (!local || !data || !fotoBase64) {
        alert("Preencha Marca, Data e tire uma Foto!");
        return;
    }
    const novoGiro = {
        id: Date.now(),
        local,
        data: data.split('-').reverse().join('/'),
        foto: fotoBase64
    };
    
    adicionarAbastecimentoLocal(novoGiro);

    fotoBase64 = "";
    el('preview_container').style.display = 'none';
    toque('mario_coin_s');
    renderizarGirosAccordion();
}

function renderizarGirosAccordion() {
    const container = el('lista_giros');
    if (!container) return;

    const giros = JSON.parse(localStorage.getItem('giros_vendas')) || [];
    container.innerHTML = '';

    if (giros.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:gray; padding:20px;">Nenhum giro registrado.</p>';
        return;
    }

    const agrupados = giros.reduce((acc, giro) => {
        if (!acc[giro.local]) acc[giro.local] = [];
        acc[giro.local].push(giro);
        return acc;
    }, {});

    Object.keys(agrupados).forEach(marca => {
        // --- BOTÃO DO CABEÇALHO (EXCLUSIVO) ---
        const btnHeader = document.createElement('div');
        btnHeader.className = 'giro_aba_header'; 
        btnHeader.innerHTML = `<span>${marca}</span> <small>(${agrupados[marca].length})</small>`;

        // --- CORPO DA LISTA (EXCLUSIVO) ---
        const corpoLista = document.createElement('div');
        corpoLista.className = 'giro_aba_corpo fechar_giro'; 

        agrupados[marca].reverse().forEach(g => {
            const item = document.createElement('div');
            item.className = 'giro_item_foto';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 5px;">
                    <span style="font-size:12px; font-weight:bold;">📅 ${g.data}</span>
                    <button class="giro_btn_excluir">EXCLUIR</button>
                </div>
                <img src="${g.foto}" style="width:100%; border-radius:8px; display:block;">
            `;

            // Botão de excluir específico
            item.querySelector('.giro_btn_excluir').onclick = () => {
                if (confirm("Excluir esta foto permanentemente?")) {
                    const filtrados = giros.filter(f => f.id !== g.id);
                    localStorage.setItem('giros_vendas', JSON.stringify(filtrados));
                    renderizarGirosAccordion();
                }
            };

            corpoLista.appendChild(item);
        });

        // --- LÓGICA DE ABRIR/FECHAR SEM CONFLITO ---
        btnHeader.onclick = () => {
            const estaFechado = corpoLista.classList.contains('fechar_giro');
            
            if (estaFechado) {
                corpoLista.classList.remove('fechar_giro');
                corpoLista.classList.add('abrir_giro');
                btnHeader.classList.add('ativo');
                toque('cursor_s');
            } else {
                corpoLista.classList.remove('abrir_giro');
                corpoLista.classList.add('fechar_giro');
                btnHeader.classList.remove('ativo');
                toque('decide_s');
            }
        };

        container.append(btnHeader, corpoLista);
    });
}