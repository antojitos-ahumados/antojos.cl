// Formato de mensajes de Telegram para el formulario doble. Usa parse_mode HTML.
// Todo texto del cliente se escapa: nunca se confía en él.
// Valores que envía el formulario (ver form-demo/form.html):
//   fecha:   "Por confirmar" | "Fecha no definida" | "AAAA-MM-DD" (también se acepta una etiqueta ya formada, ej. "mié 14 oct")
//   personas:"Por confirmar" | "5 a 8" | "10 a 15" | "20 a 25" | "30 a 35" | "Más" (+ personas_mas, número)
//   entrega: "Retiro en local" | "Santiago Centro" | <comuna> | "Fuera de Santiago" (se acepta también el texto completo con paréntesis)
//   sabores / productos: arreglo (vacío = "ninguno seleccionado")
//   rut: opcional (vacío = no se muestra la línea)
//   locales: "Menos de 5" | "5 o más" | vacío (nada elegido → se muestra "Sin respuesta" en el mensaje);  giro: arreglo opcional;  rebanadas: porciones de torta diarias
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const vacio = (v) => v == null || String(v).trim() === "";
const NINGUNO = "ninguno seleccionado";
const lista = (a, vacioTxt = NINGUNO) => {
  const x = (Array.isArray(a) ? a : vacio(a) ? [] : [a]).filter((v) => !vacio(v));
  return x.length ? x.map(esc).join(", ") : vacioTxt;
};
const tel = (t) => { const d = String(t).replace(/\D/g, "").replace(/^56/, ""); return d.length === 9 ? `+56 ${d[0]} ${d.slice(1,5)} ${d.slice(5)}` : esc(t); };
const wa = (t) => { const d = String(t).replace(/\D/g, "").replace(/^56/, ""); return `https://wa.me/56${d}`; };
const hora = (ts) => new Date(ts).toLocaleString("es-CL", { timeZone: "America/Santiago", day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
const sinParentesis = (v) => String(v ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim();

// Misma regla de reparto que el formulario
const CON_REPARTO = ["Estación Central","Independencia","Ñuñoa","Providencia","Quinta Normal","Recoleta","San Joaquín","San Miguel"];

// Fecha como la etiqueta del desplegable ("mié 14 oct") + año; textos especiales tal cual
const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DIAS = ["dom","lun","mar","mié","jue","vie","sáb"];
export function etiquetaFecha(v) {
  if (vacio(v)) return "Por confirmar";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v).trim());
  if (!m) return esc(String(v).trim());                       // "Por confirmar", "Fecha no definida" o etiqueta ya formada
  const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (t.getUTCMonth() !== +m[2] - 1) return esc(v);           // fecha imposible: mostrar tal cual
  return `${DIAS[t.getUTCDay()]} ${t.getUTCDate()} ${MESES[t.getUTCMonth()]} ${m[1]}`;
}

function personas(s) {
  const p = vacio(s.personas) ? "Por confirmar" : String(s.personas).trim();
  if (p === "Más") return vacio(s.personas_mas) ? "Más de 35" : `Más de 35 (aprox. ${esc(String(s.personas_mas).replace(/\D/g, "").slice(0, 5) || "?")})`;
  return esc(p);
}

// Delivery (por detalle): incluye comuna y estado/tarifa
function delivery(v) {
  const base = sinParentesis(v);
  if (!base) return "—";
  if (base === "Retiro en local") return `<b>Retiro en local</b> (sin costo adicional)`;
  if (base === "Santiago Centro") return `<b>Santiago Centro</b> (gratis en compras sobre $30.000)`;
  if (base === "Fuera de Santiago") return `<b>Fuera de Santiago</b> (a coordinar)`;
  if (CON_REPARTO.includes(base)) return `<b>${esc(base)}</b> (Delivery con tarifa)`;
  return `<b>${esc(base)}</b> ⚠️ Despacho no disponible; contactar para ver alternativas`;
}

// Comuna del negocio (por mayor)
function comunaMayor(v) {
  const base = sinParentesis(v);
  if (!base) return "—";
  if (base === "Santiago Centro") return `${esc(base)} (Despacho disponible)`;
  if (CON_REPARTO.includes(base)) return `${esc(base)} (Despacho limitado)`;
  return `${esc(base)} (Retiro en la fábrica)`;
}

const comentarios = (c) => String(c).slice(0, 600);

export function formatear(s) {
  const L = [];
  if (s.tipo === "d") {
    L.push(`🎂 <b>Nueva solicitud — POR DETALLE</b> · #${esc(s.id)}`);
    L.push(`🕒 ${hora(s.recibido)} · desde ${esc(s.sitio)}`, "");
    L.push(`👤 <b>${esc(s.nombre)}</b>`);
    L.push(`📱 ${tel(s.telefono)} · <a href="${wa(s.telefono)}">WhatsApp</a>`);
    L.push(`✉️ ${vacio(s.email) ? "sin correo" : esc(s.email)}`, "");
    L.push(`🎉 Evento: <b>${esc(vacio(s.evento) ? "Otro" : s.evento)}</b>`);
    L.push(`📅 Fecha: <b>${etiquetaFecha(s.fecha)}</b>`);
    L.push(`👥 Personas: ${personas(s)}`);
    L.push(`🍰 Sabores: ${lista(s.sabores)}`);
    L.push(`🚚 Delivery: ${delivery(s.entrega)}`);
    if (!vacio(s.comentarios)) L.push("", `💬 <i>${esc(comentarios(s.comentarios))}</i>`);
    L.push("", s.quiere_guia
      ? (vacio(s.email) ? "📎 Marcó que quiere la guía de ideas y consejos, pero NO dejó correo." : "📎 Quiere recibir la guía de ideas y consejos para su evento (enviar al correo).")
      : "📎 Guía: no solicitada.");
  } else {
    L.push(`🏪 <b>Nueva solicitud — POR MAYOR</b> · #${esc(s.id)}`);
    L.push(`🕒 ${hora(s.recibido)} · desde ${esc(s.sitio)}`, "");
    L.push(`🏷️ <b>${esc(s.negocio)}</b>`);
    L.push(`🏢 Tipo de negocio: ${lista(s.giro, "Sin respuesta")}`);
    L.push(`👤 ${esc(s.nombre)}`);
    if (!vacio(s.rut)) L.push(`🧾 RUT: ${esc(s.rut)}`);
    L.push(`📱 ${tel(s.telefono)} · <a href="${wa(s.telefono)}">WhatsApp</a>`);
    L.push(`✉️ ${vacio(s.email) ? "sin correo" : esc(s.email)}`);
    L.push(`📍 ${esc(s.direccion)}, ${comunaMayor(s.comuna)}`, "");
    L.push(`🏬 Locales: ${vacio(s.locales) ? "Sin respuesta" : esc(s.locales)}`);
    L.push(`🍰 Porciones de torta al día: ${vacio(s.rebanadas) ? "No vendo actualmente" : esc(s.rebanadas)}`);
    L.push(`⭐ Le interesa: ${lista(s.productos)}`);
    if (!vacio(s.comentarios)) L.push("", `💬 <i>${esc(comentarios(s.comentarios))}</i>`);
    L.push("", s.quiere_folletos
      ? (vacio(s.email) ? "📎 Marcó que quiere folletos y consejos de venta, pero NO dejó correo." : "📎 Quiere recibir folletos y consejos de venta (enviar al correo).")
      : "📎 Folletos: no solicitados.");
  }
  L.push(`\n<i>Guardada en la base de datos. Responden Alex o Stephen.</i>`);
  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
