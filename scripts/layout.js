import { el, toque } from './utils.js';

/**
 * Função que controla a exibição das fotos de layout na aba Layout.
 * Adiciona o efeito de "Sanfona" (Accordion) nas imagens das marcas.
 */
export function layout() {
    const container = el('layout');
    if (!container) return;

    // Seleciona todas as marcas dentro da aba layout
    const blocosMarcas = container.querySelectorAll('.marca_layout');

    blocosMarcas.forEach(bloco => {
        const titulo = bloco.querySelector('p');
        const imagem = bloco.querySelector('img');

        if (titulo && imagem) {
            // Estado inicial: imagem pequena/escondida
            imagem.classList.add('diminuir');

            // Clique no nome da marca (NISSIN, FINI, etc)
            titulo.onclick = () => {
                const estaAberto = imagem.classList.contains('crescer');

                // Tira a classe de todos os outros para fechar (Opcional: efeito sanfona única)
                // container.querySelectorAll('img').forEach(i => {
                //    i.classList.remove('crescer');
                //    i.classList.add('diminuir');
                // });

                if (estaAberto) {
                    imagem.classList.remove('crescer');
                    imagem.classList.add('diminuir');
                } else {
                    imagem.classList.remove('diminuir');
                    imagem.classList.add('crescer');
                }

                // Toca o som de decisão
                toque('decide_s');
            };
        }
    });
}