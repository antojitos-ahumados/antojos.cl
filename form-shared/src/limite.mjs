// Límite de visitas compartido por TODAS las herramientas /api/ (una sola cuenta por visitante).
// Escalera: solicitudes 1..PASA pasan; la siguiente (PASA+1) = página de rechazo; después = 429 simple.
// Clave = SHA-256(sal + IP + user-agent + accept-language). La IP nunca se guarda en claro.
import { DENEGADO_HTML } from "./denegado.mjs";

export async function sha256hex(texto) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const UPSERT = `INSERT INTO limite_visitas (clave, ventana, cuenta) VALUES (?1, ?2, 1)
ON CONFLICT(clave) DO UPDATE SET
  cuenta = CASE WHEN ventana <= ?3 THEN 1 ELSE cuenta + 1 END,
  ventana = CASE WHEN ventana <= ?3 THEN ?2 ELSE ventana END
RETURNING cuenta, ventana`;

// Suma 1 a un contador (ventana de `seg` segundos desde la primera visita) y devuelve {cuenta, ventana}.
export async function contar(db, clave, seg) {
  const ahora = Math.floor(Date.now() / 1000);
  const r = await db.prepare(UPSERT).bind(clave, ahora, ahora - seg).first();
  return { cuenta: r.cuenta, ventana: r.ventana, ahora };
}

export async function limpiarContadores(db) {
  const limite = Math.floor(Date.now() / 1000) - 3600;
  await db.prepare("DELETE FROM limite_visitas WHERE ventana < ?1").bind(limite).run();
}

export async function onRequest(ctx) {
  const { request, env, next } = ctx;
  const seg = Number(env.LIMITE_VENTANA_SEG) || 600;
  const pasa = Number(env.LIMITE_PASA) || 8;
  let cuenta = 0, retry = seg;
  try {
    const h = request.headers;
    const clave = await sha256hex([env.RATE_SALT || "", h.get("cf-connecting-ip") || "sin-ip", h.get("user-agent") || "", h.get("accept-language") || ""].join("|"));
    const r = await contar(env.DB, clave, seg);
    cuenta = r.cuenta; retry = Math.max(1, r.ventana + seg - r.ahora);
    if (Math.random() < 0.1) ctx.waitUntil(limpiarContadores(env.DB).catch(() => {}));
  } catch (e) {
    console.error(JSON.stringify({ evento: "limite_error", msg: String(e && e.message || e).slice(0, 120) })); // falla abierta: el sitio sigue funcionando
  }
  if (cuenta === pasa + 1) {
    return new Response(DENEGADO_HTML, { status: 429, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "retry-after": String(retry), "x-limite": "pagina", "x-robots-tag": "noindex" } });
  }
  if (cuenta > pasa + 1) {
    return new Response("Demasiadas solicitudes. Intenta más tarde.", { status: 429, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "retry-after": String(retry), "x-limite": "bloqueo" } });
  }
  return next();
}
