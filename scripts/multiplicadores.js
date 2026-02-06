const regras = [
  { match: /cup/i, value: 30 },
  { match: /nissin|ufo|snickers|bifum|raffaello|ferrero|nutella|hanuta|kinder|tronky|bala fini|500g/i, value: 50 }
];

export function getMultiplicador(nome = "") {
  for (const r of regras) {
    if (r.match.test(nome)) return r.value;
  }
  return 1;
}
