import { toque } from "./login.js";

export function layout() {
  document.querySelectorAll(".marca_layout").forEach(sec => {
    const titulo = sec.querySelector("p");
    const imagens = sec.querySelectorAll("img");

    imagens.forEach(img => img.classList.add("diminuir"));

    titulo.onclick = () => {
      imagens.forEach(img => img.classList.toggle("crescer"));
      toque("decide_s");
    };
  });
}
