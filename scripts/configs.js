import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// --- RETORNA CONFIGS (OU PADRÕES) ---
export function getConfigs() {
    const salvo = JSON.parse(localStorage.getItem('app_configs'));
    if (salvo) return salvo;
    
    // Padrão caso não exista nada
    return {
        diasAviso: 7,
        horarios: ["07:00"]
    };
}

// --- RETORNA ORDEM DAS MARCAS ---
export function getMarcasConfig() {
    return JSON.parse(localStorage.getItem('app_marcas_config')) || {};
}

export function initConfigs() {
    const btnSalvar = el('salvar_configs');
    const inputDias = el('cfg_dias_aviso');
    const inputHoras = el('cfg_horarios');
    
    // Carrega valores atuais nos inputs
    const atual = getConfigs();
    if(inputDias) inputDias.value = atual.diasAviso;
    if(inputHoras) inputHoras.value = atual.horarios.join(', ');

    if (btnSalvar) {
        btnSalvar.onclick = async () => {
            const userLogado = JSON.parse(localStorage.getItem('cadastros'));
            if(!userLogado) return alert("Logue para salvar configurações!");

            const novasConfigs = {
                diasAviso: parseInt(inputDias.value) || 7,
                horarios: inputHoras.value.split(',').map(h => h.trim())
            };

            // 1. Salva Local
            localStorage.setItem('app_configs', JSON.stringify(novasConfigs));

            // 2. Sincroniza Firebase
            try {
                btnSalvar.innerText = "SALVANDO...";
                await setDoc(doc(db, "usuarios", userLogado.nome, "configs", "geral"), novasConfigs);
                toque('mario_coin_s');
                alert("Configurações salvas e sincronizadas!");
            } catch (e) {
                alert("Erro ao sincronizar nuvem.");
            } finally {
                btnSalvar.innerText = "SALVAR TUDO";
            }
        };
    }
}