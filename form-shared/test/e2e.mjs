import { post, ok, D, M, ua, resultados, domingo, KEY, BASE } from "./lib.mjs";
const SOLO = (process.env.SOLO || "").split(",").filter(Boolean);
const quiero = (k) => !SOLO.length || SOLO.includes(k);
if (quiero("validos")) {
  let r = await post(D(), { nombre: "valido-d" }); ok("detalle válido -> 200 {ok:true}", r.s === 200 && r.j?.ok === true, r.s);
  r = await post(M(), { nombre: "valido-m" }); ok("mayor válido -> 200 {ok:true}", r.s === 200 && r.j?.ok === true, r.s);
  await new Promise((res) => setTimeout(res, 4000));
}
if (quiero("invalidos")) {
  const casos = [
    ["sin nombre", D({ nombre: "" })], ["nombre con símbolos", D({ nombre: "Ana <script>" })], ["teléfono malo", D({ telefono: "12345" })],
    ["correo malo", D({ email: "no-es-correo" })], ["guía sin correo", D({ email: "", quiere_guia: true })],
    ["comentario con enlace http", D({ comentarios: "mira http://malo.cl" })], ["comentario con dominio .com", D({ comentarios: "visita malo.com" })], ["comentario con www", D({ comentarios: "www.algo" })],
    ["comentario 601 car.", D({ comentarios: "a".repeat(601) })], ["fecha domingo", D({ fecha: domingo })], ["fecha pasada", D({ fecha: "2020-01-01" })],
    ["fecha fuera de lista", D({ fecha: "2031-12-31" })],
    ["entrega inventada", D({ entrega: "Narnia" })], ["sabor inventado", D({ sabores: ["Veneno"] })], ["evento inventado", D({ evento: "Robo" })],
    ["personas Más sin número", D({ personas: "Más" })], ["sin acepto", D({ acepto: false })], ["acepto como texto", D({ acepto: "true" })],
    ["mayor: RUT con dígito malo", M({ rut: "11.111.111-2" })], ["mayor: comuna inventada", M({ comuna: "Narnia" })], ["mayor: sin negocio", M({ negocio: "" })], ["mayor: dirección larga", M({ direccion: "x".repeat(121) })],
    ["tipo inválido", D({ tipo: "z" })],
  ];
  for (const [nom, cuerpo] of casos) {
    const r = await post(cuerpo, { nombre: "inv" });
    ok("rechaza: " + nom, r.s === 400 && r.j?.ok === false, r.s + " " + (r.j?.campos || []).join(","));
  }
  let r = await post(null, { raw: "{no es json", nombre: "inv" }); ok("rechaza JSON roto -> 400", r.s === 400, r.s);
  r = await post(D(), { tipoCt: "text/plain", nombre: "inv" }); ok("rechaza content-type no JSON -> 400", r.s === 400, r.s);
  r = await post(null, { raw: JSON.stringify({ x: "y".repeat(13000) }), nombre: "inv" }); ok("rechaza cuerpo enorme -> 413", r.s === 413, r.s);
  r = await post(["a"], { nombre: "inv" }); ok("rechaza arreglo -> 400", r.s === 400, r.s);
}
if (quiero("honeypot")) {
  const r = await post(D({ sitio_web: "http://spam.example" }), { nombre: "hp" }); ok("honeypot -> 200 {ok:true} (descartado)", r.s === 200 && r.j?.ok === true, r.s);
}
if (quiero("turnstile")) {
  let r = await post(D({ "cf-turnstile-response": "" }), { nombre: "ts" }); ok("Turnstile ausente -> 403", r.s === 403 && r.j?.codigo === "turnstile", r.s);
  r = await post(D(), { nombre: "ts", modo: "turnstile-falla" }); ok("Turnstile falla (secreto de rechazo) -> 403", r.s === 403, r.s);
  r = await post(D({ "cf-turnstile-response": "corto" }), { nombre: "ts" }); ok("Turnstile token corto -> 403", r.s === 403, r.s);
}
if (quiero("tgcaido")) {
  const r = await post(D({ nombre: "PRUEBA Grok TGCAIDO" }), { nombre: "tg", modo: "telegram-caido" }); ok("Telegram caído -> igual 200 {ok:true}", r.s === 200 && r.j?.ok === true, r.s);
  await new Promise((res) => setTimeout(res, 4000));
}
if (quiero("limite")) {
  const miUa = ua("escalera"); const res = [];
  for (let i = 1; i <= 11; i++) {
    const r = await fetch(BASE + "/api/contacto", { method: "POST", headers: { "content-type": "application/json", "user-agent": miUa, "x-prueba": KEY }, body: "{}" });
    const t = await r.text(); res.push({ i, s: r.status, html: /Aquí ya no queda nada/.test(t), xl: r.headers.get("x-limite"), ra: r.headers.get("retry-after") });
  }
  console.log(JSON.stringify(res.map((x) => [x.i, x.s, x.xl || "-", x.html ? "html" : "-"])));
  ok("escalera: 1–8 pasan (400 por cuerpo vacío)", res.slice(0, 8).every((x) => x.s === 400));
  ok("escalera: 9ª = página de rechazo 429 (HTML 'Aquí ya no queda nada')", res[8].s === 429 && res[8].html && res[8].xl === "pagina" && !!res[8].ra);
  ok("escalera: 10ª y 11ª = 429 simple", res[9].s === 429 && !res[9].html && res[9].xl === "bloqueo" && res[10].s === 429 && !res[10].html);
  const g = await fetch(BASE + "/api/contacto", { headers: { "user-agent": ua("get") } }); ok("GET /api/contacto -> 405", g.status === 405, g.status);
}
const mal = resultados.filter((x) => !x.ok).length;
console.log(`\n${resultados.length - mal}/${resultados.length} pruebas pasan`);
process.exit(mal ? 1 : 0);
