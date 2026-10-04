// Validación en el servidor (espejo de las reglas del formulario). Devuelve {ok, campos, datos}.
// `campos` = nombres de campos con problema (sin valores del cliente). `datos` = solo campos permitidos, ya normalizados.
import { EVENTOS, PERSONAS, SABORES, PRODUCTOS_MAYOR, ENTREGA_D, COMUNAS_M, GIRO, LOCALES, REBANADAS } from "./listas.mjs";
import { fechasDisponibles } from "./fechas.mjs";
import { NOMBRE, TEXTO, EMAIL, telefonoValido, rutValido, sinEnlaces } from "./reglas.mjs";

const str = (v) => (typeof v === "string" ? v.normalize("NFC").trim() : "");
const arr = (v) => (Array.isArray(v) ? v : []);

export function validar(b, hoy) {
  const campos = [];
  const mal = (c) => { if (!campos.includes(c)) campos.push(c); };
  const d = { tipo: b.tipo === "m" ? "m" : b.tipo === "d" ? "d" : "" };
  if (!d.tipo) { mal("tipo"); return { ok: false, campos, datos: null }; }

  const obligatorio = (campo, max) => {
    const v = str(b[campo]);
    if (!v || v.length > max || !NOMBRE.test(v)) mal(campo);
    d[campo] = v;
  };
  const lista = (campo, valores, permitidos) => {
    const x = arr(valores);
    const sal = [];
    for (const v of x) { if (typeof v !== "string" || !permitidos.includes(v)) { mal(campo); continue; } if (!sal.includes(v)) sal.push(v); }
    if (x.length > permitidos.length) mal(campo);
    d[campo] = sal;
  };

  if (d.tipo === "d") {
    d.evento = str(b.evento);
    if (!EVENTOS.includes(d.evento)) mal("evento");
    d.fecha = str(b.fecha);
    const validas = fechasDisponibles(hoy.y, hoy.m, hoy.d).map((x) => x.valor);
    if (d.fecha !== "Por confirmar" && d.fecha !== "Fecha no definida" && !validas.includes(d.fecha)) mal("fecha");
    if (/^\d{4}-\d{2}-\d{2}$/.test(d.fecha) && new Date(d.fecha + "T12:00:00Z").getUTCDay() === 0) mal("fecha"); // nunca domingo
    d.personas = str(b.personas);
    if (!PERSONAS.includes(d.personas)) mal("personas");
    if (d.personas === "Más") {
      const n = Number.parseInt(String(b.personas_mas), 10);
      if (!(n >= 36 && n <= 2000)) mal("personas"); else d.personas_mas = String(n);
    }
    lista("sabores", b.sabores, SABORES);
    obligatorio("nombre", 80);
    d.entrega = str(b.entrega);
    if (!ENTREGA_D.includes(d.entrega)) mal("entrega");
    d.quiere_guia = b.quiere_guia === true;
  } else {
    obligatorio("nombre", 80);
    obligatorio("negocio", 100);
    d.rut = str(b.rut);
    if (d.rut && (d.rut.length > 12 || !rutValido(d.rut))) mal("rut");
    obligatorio("direccion", 120);
    d.comuna = str(b.comuna);
    if (!COMUNAS_M.includes(d.comuna)) mal("comuna");
    d.locales = str(b.locales);
    if (d.locales && !LOCALES.includes(d.locales)) mal("locales");
    lista("giro", b.giro, GIRO);
    d.rebanadas = str(b.rebanadas) || "No vendo actualmente";
    if (!REBANADAS.includes(d.rebanadas)) mal("rebanadas");
    lista("productos", b.productos, PRODUCTOS_MAYOR);
    d.quiere_folletos = b.quiere_folletos === true;
  }

  d.telefono = str(b.telefono);
  if (d.telefono.length > 20 || !telefonoValido(d.telefono)) mal("telefono");
  d.email = str(b.email);
  if (d.email && (d.email.length > 100 || !EMAIL.test(d.email))) mal("email");
  if (!d.email && (d.quiere_guia || d.quiere_folletos)) mal("email");
  d.comentarios = str(b.comentarios);
  if (d.comentarios && (d.comentarios.length > 600 || !TEXTO.test(d.comentarios) || !sinEnlaces(d.comentarios))) mal("comentarios");
  if (b.acepto !== true) mal("acepto");
  d.acepto = true;
  return { ok: campos.length === 0, campos, datos: d };
}
