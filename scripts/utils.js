/**
 * Atalho para Document.getElementById
 */
export function el(id) {
    return document.getElementById(id);
}

/**
 * Toca um som pelo ID do elemento <audio>
 */
export function toque(id) {
    const som = el(id);
    if (som) {
        som.currentTime = 0;
        som.play().catch(e => console.warn("Interação necessária para tocar som."));
    }
}

/**
 * Retorna a data atual no formato YYYY-MM-DD (ISO)
 */
export function hojeISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Converte data BR (DD/MM/YYYY) para objeto Date
 */
export function parseDataBR(data) {
    if (!data) return new Date();
    const [d, m, y] = data.split('/');
    return new Date(y, m - 1, d);
}

/**
 * Limpa strings para serem usadas como IDs ou Keys no Firebase
 */
export function sanitize(value = "") {
    return value.toString().replace(/[\/.#$\[\]]/g, "_");
}