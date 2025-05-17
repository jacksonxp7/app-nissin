import { toque } from "./login.js";
export function layout() {
    const layout = document.getElementById("layout");
    if (!layout) return;

    layout.querySelectorAll(".marca_layout").forEach((sec) => {
        const titulo = sec.querySelector("p");
        const imagens = sec.querySelectorAll("img");
        if (!titulo || imagens.length === 0) return;

        // inicia com imagens ocultas
        imagens.forEach(img => img.classList.add("diminuir"));

        titulo.addEventListener("click", () => {
            const estaFechado = imagens[0].classList.contains("diminuir");

            imagens.forEach(img => {
                img.classList.toggle("diminuir", !estaFechado);
                img.classList.toggle("crescer", estaFechado);
            });

            if (estaFechado) {
                titulo.classList.add("pulsar");
                toque("decide_s");
            } else {
                titulo.classList.remove("pulsar");
                toque("cursor_s");
            }
        });
    });
}



