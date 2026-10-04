// FECHAS-INICIO (fuente única; probada con node ../test/fechas.test.mjs)
var MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
var DIAS = ["dom","lun","mar","mié","jue","vie","sáb"];
// Dado el día de hoy (año, mes 1-12, día) en hora de Santiago, devuelve las fechas disponibles:
// la primera es el día siguiente a que hayan pasado 2 días hábiles completos (lun-vie, sin feriados);
// luego las 30 fechas siguientes sin contar domingos (los sábados sí se incluyen).
export function fechasDisponibles(y, m, d) {
  var DIA = 86400000;
  var cur = Date.UTC(y, m - 1, d), hab = 0;
  while (hab < 2) { cur += DIA; var w = new Date(cur).getUTCDay(); if (w >= 1 && w <= 5) hab++; }
  var lista = [];
  cur += DIA;
  while (lista.length < 30) {
    var t = new Date(cur); cur += DIA;
    if (t.getUTCDay() === 0) continue; // sin domingos
    var iso = t.getUTCFullYear() + "-" + String(t.getUTCMonth() + 1).padStart(2, "0") + "-" + String(t.getUTCDate()).padStart(2, "0");
    lista.push({ valor: iso, etiqueta: DIAS[t.getUTCDay()] + " " + t.getUTCDate() + " " + MESES[t.getUTCMonth()] });
  }
  return lista;
}
// Hoy en America/Santiago -> {y, m, d}
export function hoySantiago(ahora) {
  var p = {};
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(ahora || new Date()).forEach(function (x) { p[x.type] = x.value; });
  return { y: +p.year, m: +p.month, d: +p.day };
}
// FECHAS-FIN
