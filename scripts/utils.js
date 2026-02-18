export function el(id) { return document.getElementById(id); }

export function toque(id) {
    const som = el(id);
    if (som) { som.currentTime = 0; som.play().catch(() => {}); }
}

export function hojeISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}