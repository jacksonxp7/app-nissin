import { el, toque } from './utils.js';
import { db } from './firebase.js';
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// --- RETORNA AS CONFIGURAÇÕES ATUAIS (OU PADRÃO) ---
export function getConfigs() {
    const salvo = JSON.parse(localStorage.getItem('app_configs'));
    if (salvo) return salvo;
    
    // Padrão do sistema caso o usuário nunca tenha configurado
    return {
        diasAviso: 7,
        horarios: ["07:00"]
    };
}

// --- RETORNA A ORDEM DAS MARCAS ---
export function getMarcasConfig() {
    return JSON.parse(localStorage.getItem('app_marcas_config')) || {};
}

// --- FUNÇÃO DE INICIALIZAÇÃO DA TELA (Exportada como configs_screen) ---
export function configs_screen() {
    const btnSalvar = el('salvar_configs');
    const inputDias = el('cfg_dias_aviso');
    const inputHoras = el('cfg_horarios');
    
    if (!btnSalvar) return;

    // Carrega os valores atuais nos campos da tela
    const atual = getConfigs();
    if(inputDias) inputDias.value = atual.diasAviso;
    if(inputHoras) inputHoras.value = atual.horarios.join(', ');

    btnSalvar.onclick = async () => {
        const userLogado = JSON.parse(localStorage.getItem('cadastros'));
        if(!userLogado) {
            alert("Você precisa estar logado para salvar configurações!");
            return;
        }

        const novasConfigs = {
            diasAviso: parseInt(inputDias.value) || 7,
            horarios: inputHoras.value.split(',').map(h => h.trim())
        };

        btnSalvar.innerText = "SINCRONIZANDO...";
        btnSalvar.disabled = true;

        try {
            // 1. Salva localmente no celular
            localStorage.setItem('app_configs', JSON.stringify(novasConfigs));

            // 2. Salva na nuvem na pasta do usuário
            await setDoc(doc(db, "usuarios", userLogado.nome, "configs", "geral"), novasConfigs);

            toque('mario_coin_s');
            alert("Configurações salvas e sincronizadas na nuvem!");
        } catch (e) {
            console.error(e);
            alert("Erro ao salvar na nuvem, mas os dados foram salvos no celular.");
        } finally {
            btnSalvar.innerText = "SALVAR TUDO";
            btnSalvar.disabled = false;
        }
    };
}