// POST /api/contacto — valida, verifica Turnstile, guarda en D1 y avisa por Telegram.
import { validar } from "./validar.mjs";
import { hoySantiago } from "./fechas.mjs";
import { formatear } from "./formato-telegram.mjs";
import { contar, limpiarContadores } from "./limite.mjs";

const J = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const log = (o) => console.log(JSON.stringify(o));
const HOSTS = ["antojitos.cl", "www.antojitos.cl", "antojos.cl", "www.antojos.cl"];

function igual(a, b) { // comparación en tiempo casi constante
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length || !a) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function verificarTurnstile(token, env, ip, modo) {
  if (typeof token !== "string" || token.length < 10 || token.length > 2048) return false;
  const secreto = modo === "turnstile-falla" ? "2x0000000000000000000000000000000AA" : env.TURNSTILE_SECRET;
  if (!secreto) return false;
  const fd = new FormData();
  fd.append("secret", secreto); fd.append("response", token); if (ip) fd.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: fd, signal: AbortSignal.timeout(8000) });
    const j = await r.json();
    if (!j.success) { log({ evento: "turnstile_rechazado", codigos: (j["error-codes"] || []).slice(0, 4) }); return false; }
    if (env.ENTORNO === "produccion" && !HOSTS.includes(j.hostname)) { log({ evento: "turnstile_host_raro" }); return false; }
    return true;
  } catch (e) { log({ evento: "turnstile_error", msg: String(e && e.message || e).slice(0, 100) }); return false; }
}

async function telegram(env, token, chat, texto) {
  const api = env.TELEGRAM_API || "https://api.telegram.org";
  const r = await fetch(`${api}/bot${token}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: texto, parse_mode: "HTML", disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) { let c = ""; try { c = (await r.json()).error_code || ""; } catch {} throw new Error("telegram_http_" + r.status + (c ? "_" + c : "")); }
}

async function notificar({ env, id, texto, modo, chat, token }) {
  const tope = Number(env.TOPE_TELEGRAM_HORA) || 30;
  let envia = true;
  try {
    const hora = Math.floor(Date.now() / 3600000);
    const g = await contar(env.DB, `g:tg:${hora}`, 3600);
    if (g.cuenta > tope) {
      envia = false;
      log({ evento: "tope_telegram_hora", cuenta: g.cuenta });
      if (g.cuenta === tope + 1) await telegram(env, token, chat, "⚠️ Se alcanzó el tope de avisos por hora del formulario. Las nuevas solicitudes se guardan en la base de datos pero no se avisan aquí hasta la próxima hora.").catch(() => {});
    }
  } catch (e) { log({ evento: "tope_error" }); }
  if (!envia) return;
  try {
    await telegram(env, token, chat, texto);
    if (id) await env.DB.prepare("UPDATE solicitudes SET telegram_ok = 1, procesada = 1 WHERE id = ?1").bind(id).run();
    log({ evento: "telegram_ok", id });
  } catch (e) {
    log({ evento: "telegram_fallo", id, msg: String(e && e.message || e).slice(0, 80) }); // sin datos personales
  }
}

export async function onRequestPost(ctx) {
  const { request, env } = ctx;
  const waitUntil = (p) => ctx.waitUntil(p);
  const h = request.headers;
  if (!/application\/json/i.test(h.get("content-type") || "")) return J({ ok: false, error: "Solicitud no válida." }, 400);
  let cuerpo;
  try {
    const texto = await request.text();
    if (texto.length > 12000) return J({ ok: false, error: "Solicitud no válida." }, 413);
    cuerpo = JSON.parse(texto);
  } catch { return J({ ok: false, error: "Solicitud no válida." }, 400); }
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) return J({ ok: false, error: "Solicitud no válida." }, 400);

  // Campo trampa: los robots lo llenan. Se responde "ok" y se descarta sin guardar nada.
  if (typeof cuerpo.sitio_web === "string" && cuerpo.sitio_web.trim() !== "") { log({ evento: "honeypot" }); return J({ ok: true }); }

  // Encabezados de prueba (solo con la clave secreta TEST_KEY): mensaje a Stephen en privado, nunca al grupo.
  const prueba = igual(h.get("x-prueba") || "", env.TEST_KEY || "");
  const modo = prueba && env.ENTORNO === "preview" ? (h.get("x-prueba-modo") || "") : "";

  const v = validar(cuerpo, hoySantiago());
  if (!v.ok) { log({ evento: "rechazo_validacion", campos: v.campos }); return J({ ok: false, error: "Revisa los datos marcados e inténtalo de nuevo.", campos: v.campos }, 400); }

  const ip = h.get("cf-connecting-ip") || "";
  if (!(await verificarTurnstile(cuerpo["cf-turnstile-response"], env, ip, modo))) {
    return J({ ok: false, error: "No pudimos verificar que eres una persona. Recarga la página e inténtalo de nuevo.", codigo: "turnstile" }, 403);
  }

  const ahora = new Date();
  const borrar = new Date(ahora); borrar.setUTCMonth(borrar.getUTCMonth() + 12);
  const sitio = env.SITIO || "antojitos.cl";
  const datos = v.datos;
  let id = null;
  try {
    const r = await env.DB.prepare("INSERT INTO solicitudes (recibido, sitio, tipo, datos, procesada, telegram_ok, borrar_despues) VALUES (?1, ?2, ?3, ?4, 0, 0, ?5)")
      .bind(ahora.toISOString(), sitio, datos.tipo, JSON.stringify(datos), borrar.toISOString()).run();
    id = r.meta.last_row_id;
    log({ evento: "guardada", id, tipo: datos.tipo, sitio });
  } catch (e) {
    log({ evento: "d1_fallo", msg: String(e && e.message || e).slice(0, 100) });
  }

  let texto = formatear({ ...datos, id: id ?? "s/n", sitio, recibido: ahora.getTime() });
  if (id === null) texto = texto.replace(/<i>Guardada en la base de datos\.[^<]*<\/i>/, "<i>⚠️ NO se pudo guardar en la base de datos: anótala a mano. Responden Alex o Stephen.</i>");
  if (prueba) texto = "🧪 <b>PRUEBA</b> — no es una solicitud real\n\n" + texto;
  const chat = prueba ? env.TELEGRAM_CHAT_ID_PRUEBA : env.TELEGRAM_CHAT_ID;
  const token = modo === "telegram-caido" ? "000000:token-invalido-de-prueba" : env.TELEGRAM_BOT_TOKEN;

  // Trabajo no crítico fuera de la respuesta: aviso por Telegram y limpieza de datos vencidos.
  waitUntil(notificar({ env, id, texto, modo, chat, token }));
  waitUntil((async () => {
    try {
      await env.DB.prepare("DELETE FROM solicitudes WHERE borrar_despues < ?1").bind(new Date().toISOString()).run();
      await limpiarContadores(env.DB);
    } catch (e) { log({ evento: "limpieza_fallo" }); }
  })());

  if (id === null && !env.TELEGRAM_BOT_TOKEN) return J({ ok: false, error: "No pudimos enviar tu solicitud. Inténtalo más tarde o escríbenos por WhatsApp." }, 500);
  return J({ ok: true });
}

export const onRequest = () => new Response("Método no permitido", { status: 405, headers: { allow: "POST" } });
