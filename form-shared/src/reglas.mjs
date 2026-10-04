// Reglas de validación (fuente única: las usan el formulario y el servidor).
export var NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .,'&\-]+$/;
export var TEXTO = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .,;:'&\-#\/°()!?¡¿@+_\n\r"%$]*$/;
export var EMAIL = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
export function telefonoValido(v) {
  var s = v.replace(/[\s\-().]/g, "");
  if (!/^\+?[0-9]+$/.test(s)) return false;
  s = s.replace(/^\+?56/, "");
  if (/^9[0-9]{8}$/.test(s)) return true;          // celular
  if (/^2[0-9]{8}$/.test(s)) return true;          // fijo Santiago
  if (/^[3-7][0-9]{8}$/.test(s)) return true;      // fijo regiones
  return false;
}
export function rutValido(v) {
  var s = v.replace(/[.\s]/g, "").toUpperCase();
  var m = /^([0-9]{7,8})-([0-9K])$/.exec(s);
  if (!m) return false;
  var suma = 0, mul = 2;
  for (var i = m[1].length - 1; i >= 0; i--) { suma += parseInt(m[1][i], 10) * mul; mul = mul === 7 ? 2 : mul + 1; }
  var r = 11 - (suma % 11), dv = r === 11 ? "0" : r === 10 ? "K" : String(r);
  return dv === m[2];
}
export function sinEnlaces(v) {
  return !/(https?:|www\.|\.com|\.cl\b|\.net|\.org|\.io\b|\.me\b|\.ly\b|\.ru\b|\.xyz|\.info|t\.me|<|>|\{|\}|\[|\]|\\|`|\|)/i.test(v);
}
