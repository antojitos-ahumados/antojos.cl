import { normalizarRut, rutValido } from "../src/reglas.mjs";
import { validar } from "../src/validar.mjs";
let f = 0; const t = (n, c) => { if (!c) f++; console.log((c ? "PASA  " : "FALLA ") + n); };
// Válidos: cualquier forma de escribirlos -> 12.345.678-5
for (const [e, s] of [
  ["764698649", "76.469.864-9"], ["76469864-9", "76.469.864-9"], ["76.469.864-9", "76.469.864-9"], [" 76 469 864 - 9 ", "76.469.864-9"], ["76.469.864 9", "76.469.864-9"],
  ["123456785", "12.345.678-5"], ["12.345.678-5", "12.345.678-5"], ["12345678-5", "12.345.678-5"],
  ["11.111.111-1", "11.111.111-1"], ["111111111", "11.111.111-1"],
  ["7.000.000-8", "7.000.000-8"], ["70000008", "7.000.000-8"],            // 7 dígitos + verificador
  ["6.999.007-K", "6.999.007-K"], ["6999007k", "6.999.007-K"], ["6999007-k", "6.999.007-K"],  // verificador K (minúscula -> K)
  ["10.000.013-K", "10.000.013-K"], ["10000013k", "10.000.013-K"],          // 8 dígitos con K
]) t(`válido: "${e}" -> ${s}`, normalizarRut(e) === s && rutValido(e));
// Inválidos
for (const e of ["764698648", "76469864-0", "12.345.678-9", "6.999.999-5", "6.999.007-9", "123456", "1234567890", "abc", "76.469.864-X", "7646986", ""]) t(`inválido: "${e}"`, normalizarRut(e) === null && !rutValido(e));
// Servidor: formatea lo que guarda; vacío válido (opcional); inválido rechazado
const hoy = { y: 2026, m: 10, d: 4 };
const m = { tipo: "m", nombre: "Ana", negocio: "Café Sur", direccion: "Calle 1", comuna: "Santiago Centro", telefono: "912345678", acepto: true };
let r = validar({ ...m, rut: "764698649" }, hoy); t("servidor: 764698649 válido y se guarda como 76.469.864-9", r.ok && r.datos.rut === "76.469.864-9");
r = validar({ ...m, rut: "6999007k" }, hoy); t("servidor: K minúscula -> 6.999.007-K", r.ok && r.datos.rut === "6.999.007-K");
r = validar({ ...m, rut: "76 469 864 - 9" }, hoy); t("servidor: con espacios aceptado", r.ok && r.datos.rut === "76.469.864-9");
r = validar({ ...m, rut: "" }, hoy); t("servidor: RUT vacío válido (opcional)", r.ok && !r.datos.rut);
r = validar({ ...m }, hoy); t("servidor: sin campo rut válido", r.ok);
r = validar({ ...m, rut: "764698648" }, hoy); t("servidor: dígito verificador malo rechazado", !r.ok);
r = validar({ ...m, rut: "1".repeat(40) }, hoy); t("servidor: RUT larguísimo rechazado", !r.ok);
process.exit(f ? 1 : 0);
