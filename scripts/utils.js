export function el(id) { 
    return document.getElementById(id); 
}

export function toque(id) {
    const som = el(id);
    if (som) {
        som.currentTime = 0;
        som.play().catch(e => console.warn("Erro ao tocar som:", e));
    }
}

export function hojeISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function sanitize(value = "") {
    return value.toString().replace(/[\/.#$\[\]]/g, "_");
}

export function parseDataBR(data) {
    if (!data) return new Date();
    const [d, m, y] = data.split('/');
    return new Date(y, m - 1, d);
}