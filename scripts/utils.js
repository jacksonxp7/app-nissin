export function sanitize(value = "") {
  return value.toString().replace(/[\/.#$\[\]]/g, "_");
}

export function parseDataBR(data) {
  const [d, m, y] = data.split('/');
  return new Date(y, m - 1, d);
}

export function hojeISO() {
  return new Date().toISOString().split('T')[0];
}

export function horaSP() {
  return new Date().toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour12: false
  });
}

export function el(id) {
  return document.getElementById(id);
}
