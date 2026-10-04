// Pruebas de extremo a extremo de /api/contacto.  Uso: BASE=http://localhost:8801 node e2e.mjs [local|remoto]
// Remoto: TEST_KEY se lee de form-shared/.test-key. Mensajes remotos van SOLO al chat privado de Stephen (cabecera x-prueba).
import { readFileSync } from "node:fs";
import { fechasDisponibles, hoySantiago } from "../src/fechas.mjs";
const BASE = process.env.BASE || "http://localhost:8801";
const MODO = process.argv[2] || "local";
const KEY = MODO === "local" ? "localtestkey" : readFileSync(new URL("../.test-key", import.meta.url), "utf8").trim();
const SOLO = (process.env.SOLO || "").split(",").filter(Boolean);
const h = hoySantiago(), fechas = fechasDisponibles(h.y, h.m, h.d);
const fechaOk = fechas[3].valor;
const domingo = (() => { let t = new Date(Date.UTC(h.y, h.m - 1, h.d + 20)); while (t.getUTCDay() !== 0) t = new Date(t.getTime() + 86400000); return t.toISOString().slice(0, 10); })();
const tok = "XXXX.DUMMY.TOKEN.XXXX";
const resultados = [];
const ua = (nombre) => `PruebaGrok/${nombre}/${Date.now()}-${Math.random()}`;
export async function post(body, { headers = {}, prueba = true, modo, nombre = "t", raw, tipoCt = "application/json" } = {}) {
  const hd = { "content-type": tipoCt, "user-agent": ua(nombre), ...headers };
  if (prueba) hd["x-prueba"] = KEY;
  if (modo) hd["x-prueba-modo"] = modo;
  const r = await fetch(BASE + "/api/contacto", { method: "POST", headers: hd, body: raw ?? JSON.stringify(body) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { s: r.status, j, t, ct: r.headers.get("content-type"), xl: r.headers.get("x-limite") };
}
export function ok(nombre, cond, extra = "") { resultados.push({ nombre, ok: !!cond }); console.log((cond ? "PASA  " : "FALLA ") + nombre + (extra ? "  [" + extra + "]" : "")); }
export const D = (o = {}) => ({ tipo: "d", sitio_web: "", nombre: "PRUEBA Grok", telefono: "+56 9 1234 5678", email: "prueba@ejemplo.cl", comentarios: "Prueba automática, sin nueces por favor (no es real)", acepto: true, evento: "Cumpleaños", fecha: fechaOk, personas: "20 a 25", sabores: ["Tres Leches", "Torta Rubia"], entrega: "Ñuñoa", quiere_guia: true, "cf-turnstile-response": tok, ...o });
export const M = (o = {}) => ({ tipo: "m", sitio_web: "", nombre: "PRUEBA Grok", negocio: "PRUEBA Café & Cía", telefono: "+56 2 2345 6789", email: "", rut: "11.111.111-1", direccion: "Calle Inventada 123", comuna: "Providencia", locales: "Menos de 5", giro: ["Café"], rebanadas: "5 o más", productos: ["Queques"], comentarios: "", acepto: true, quiere_folletos: false, "cf-turnstile-response": tok, ...o });
export { ua, resultados, fechaOk, domingo, fechas, KEY, BASE };

