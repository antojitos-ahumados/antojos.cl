// Prueba de la lógica de fechas compartida: node fechas.test.mjs
import { fechasDisponibles } from "../src/fechas.mjs";
const casos = [
  ["Domingo 2026-10-04", [2026,10,4], "mié 7 oct"],
  ["Lunes 2026-10-05", [2026,10,5], "jue 8 oct"],
  ["Martes 2026-10-06", [2026,10,6], "vie 9 oct"],
  ["Jueves 2026-10-08", [2026,10,8], "mar 13 oct"],
  ["Viernes 2026-10-09", [2026,10,9], "mié 14 oct"],
  ["Sábado 2026-10-10", [2026,10,10], "mié 14 oct"],
  ["Cambio de año: Mié 2026-12-30 (1 ene es feriado, se ignora)", [2026,12,30], "sáb 2 ene"],
];
let ok = true;
for (const [n, a, esp] of casos) {
  const l = fechasDisponibles(...a);
  // sin domingos, 30 fechas, y sin saltarse ningún día que no sea domingo
  const dow = (iso) => new Date(iso + "T12:00:00Z").getUTCDay();
  let sinDomingos = l.every((x) => dow(x.valor) !== 0), seguidas = true;
  for (let i = 1; i < l.length; i++) {
    const ant = new Date(l[i-1].valor + "T12:00:00Z").getTime(), act = new Date(l[i].valor + "T12:00:00Z").getTime();
    const dias = Math.round((act - ant) / 86400000);
    const esperado = dow(l[i-1].valor) === 6 ? 2 : 1;       // tras un sábado se salta el domingo
    if (dias !== esperado) seguidas = false;
  }
  const hayDom = l.some((x) => /^dom /.test(x.etiqueta));
  const pass = l[0].etiqueta === esp && l.length === 30 && sinDomingos && seguidas && !hayDom;
  ok = ok && pass;
  console.log((pass ? "OK  " : "FALLA ") + n + " -> primera: " + l[0].etiqueta + " (" + l[0].valor + "), última: " + l[29].etiqueta + " (" + l[29].valor + "), total " + l.length);
}
process.exit(ok ? 0 : 1);
