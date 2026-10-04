// Genera, desde una sola fuente (form-shared/src), los archivos del formulario en cada sitio.
// Uso: node build.mjs [--produccion]     (con --produccion se niega a copiar si Selva Negra sigue siendo la foto de Wikimedia)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as L from "./src/listas.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const WEB = join(AQUI, "..");
const SRC = join(AQUI, "src");
const DEMO = join(WEB, "form-demo");
const produccion = process.argv.includes("--produccion");
const SITEKEY = readFileSync(join(AQUI, "TURNSTILE_SITEKEY.txt"), "utf8").trim();
const SITIOS = [
  { dir: "antojitos.cl", host: "antojitos.cl", ga: "G-917JYYTG98", defecto: "d", ogTitulo: "Cotiza tu torta | Antojitos Ahumados", ogDesc: "Cuéntanos de tu evento y te enviamos una cotización de tortas." },
  { dir: "antojos.cl",   host: "antojos.cl",   ga: "G-MPC6LPT8QR", defecto: "m", ogTitulo: "Pastelería por mayor | Antojitos Ahumados", ogDesc: "Tortas y queques por mayor para cafeterías, restaurantes y almacenes. Pide tu cotización." },
];

// Control de fotos: Selva Negra no puede ser la de Wikimedia en producción
const creditos = readFileSync(join(DEMO, "img/CREDITOS-Y-PENDIENTES.md"), "utf8");
const selvaWiki = creditos.split("\n").some((l) => /selva-negra\.jpg/.test(l) && /wikimedia/i.test(l));
if (selvaWiki) {
  const msg = "Selva Negra sigue siendo la foto de Wikimedia (img/CREDITOS-Y-PENDIENTES.md).";
  if (produccion) { console.error("ABORTA: " + msg); process.exit(2); }
  console.warn("AVISO (solo vista previa): " + msg);
}

const sinExport = (t) => t.replace(/^export\s+/gm, "");
const leer = (p) => readFileSync(p, "utf8");
const escribir = (p, t) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, t); };

const compartidoCliente = [
  "var LISTAS = " + JSON.stringify(Object.fromEntries(Object.entries(L))) + ";",
  sinExport(leer(join(SRC, "fechas.mjs"))),
  sinExport(leer(join(SRC, "reglas.mjs"))),
].join("\n");

const MARCA = "# --- FORMULARIO (generado por form-shared/build.mjs; no editar a mano) ---";
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com https://static.cloudflareinsights.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://cloudflareinsights.com https://challenges.cloudflare.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

for (const s of SITIOS) {
  const raiz = join(WEB, s.dir);
  const F = join(raiz, "functions");
  rmSync(join(F, "_lib"), { recursive: true, force: true });

  // --- Servidor (Pages Functions) ---
  for (const f of ["listas", "fechas", "reglas", "validar", "limite", "contacto"]) escribir(join(F, "_lib", f + ".mjs"), leer(join(SRC, f + ".mjs")));
  escribir(join(F, "_lib", "formato-telegram.mjs"), leer(join(WEB, "form-backend/formato-telegram.mjs")));
  // Página de rechazo (9ª solicitud): mismo aspecto que 404.html del sitio
  let den = leer(join(raiz, "404.html"));
  den = den.replace(/<title>[^<]*<\/title>/, "<title>Demasiados intentos | Antojitos Ahumados</title>")
           .replace("<p>Esta página se la comieron. Error 404.</p><p>Pero en el inicio todavía hay antojos.</p>", "<p>Hiciste demasiados intentos seguidos.</p><p>Espera unos minutos y vuelve a intentarlo. Mientras, en el inicio hay antojos.</p>");
  if (!den.includes("Demasiados intentos") || !den.includes("vuelve a intentarlo")) throw new Error("404.html cambió: ajustar la plantilla de la página de rechazo");
  escribir(join(F, "_lib", "denegado.mjs"), "// Generado por build.mjs desde 404.html\nexport const DENEGADO_HTML = " + JSON.stringify(den) + ";\n");
  escribir(join(F, "api", "_middleware.js"), 'import { onRequest as limite } from "../_lib/limite.mjs";\nexport const onRequest = (ctx) => limite(ctx);\n');
  escribir(join(F, "api", "contacto.js"), 'export { onRequestPost, onRequest } from "../_lib/contacto.mjs";\n');

  // --- Páginas ---
  const form = leer(join(SRC, "form.template.html"))
    .replace(/@@GA@@/g, s.ga).replace(/@@HOST@@/g, s.host).replace(/@@OG_TITLE@@/g, s.ogTitulo).replace(/@@OG_DESC@@/g, s.ogDesc).replace("@@DEFECTO@@", s.defecto).replace("@@SITEKEY@@", SITEKEY)
    .replace("/*@@SHARED@@*/", () => compartidoCliente)
    .replace("/*@@ENVIO@@*/", () => leer(join(SRC, "envio.js")));
  if (/@@/.test(form)) throw new Error("quedaron marcadores @@ sin reemplazar");
  escribir(join(raiz, "form.html"), form);
  escribir(join(raiz, "privacidad.html"), leer(join(SRC, "privacidad.template.html")).replace(/@@GA@@/g, s.ga).replace(/@@HOST@@/g, s.host));
  escribir(join(raiz, "_redirects"), "/c /form 200\n/c/d /form 200\n/c/m /form 200\n/d /form 200\n/m /form 200\n");

  // --- Cabeceras ---
  let h = leer(join(raiz, "_headers"));
  if (h.includes(MARCA)) h = h.slice(0, h.indexOf(MARCA));
  h = h.trimEnd() + `\n\n${MARCA}\n` +
    ["/c", "/c/*", "/d", "/m", "/form", "/form.html"].map((p) => `${p}\n  X-Robots-Tag: noindex, nofollow\n  Content-Security-Policy: ${CSP}\n  Cache-Control: no-cache\n`).join("\n") +
    `\n/llms.txt\n  Content-Type: text/plain; charset=utf-8\n  Cache-Control: public, max-age=3600\n\n/privacidad\n  Content-Security-Policy: ${CSP}\n\n/img/*\n  Cache-Control: public, max-age=86400\n\n/api/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n`;
  escribir(join(raiz, "_headers"), h);

  // --- sitemap (sin el formulario) y robots ---
  const sm = leer(join(raiz, "sitemap.xml"));
  if (!sm.includes("/privacidad")) escribir(join(raiz, "sitemap.xml"), sm.replace("</urlset>", `  <url><loc>https://${s.host}/privacidad</loc></url>\n</urlset>`));
  const rb = leer(join(raiz, "robots.txt"));
  if (!rb.includes("Disallow: /api/")) escribir(join(raiz, "robots.txt"), rb.replace("Allow: /\n", "Allow: /\nDisallow: /api/\n"));
  if (!/^Sitemap:/mi.test(leer(join(raiz, "robots.txt")))) escribir(join(raiz, "robots.txt"), leer(join(raiz, "robots.txt")).trimEnd() + `\n\nSitemap: https://${s.host}/sitemap.xml\n`);


  // --- Portada: botón "Contáctanos" -> /c (idempotente) ---
  let idx = leer(join(raiz, "index.html"));
  if (!idx.includes("contactanos")) {
    const css = "  .boton.contactanos { background:var(--acento); color:var(--cafe); }\n  .boton.contactanos:hover { background:#f0b57a; }\n  .contacto li .boton { margin:0; }\n";
    const li = '      <li><a class="boton contactanos" href="/c">Contáctanos</a></li>\n';
    if (!idx.includes("</style>") || !idx.includes('<ul class="contacto">\n')) throw new Error("index.html cambió: ajustar el parche del botón Contáctanos");
    idx = idx.replace("</style>", css + "</style>").replace('<ul class="contacto">\n', '<ul class="contacto">\n' + li);
    escribir(join(raiz, "index.html"), idx);
  }

  // Imagen de vista previa (v2 = textos pizarra en español). Se borra la v1 (inglés) para no dejarla publicada.
  rmSync(join(raiz, "og-contacto.jpg"), { force: true });
  copyFileSync(join(AQUI, "assets/og-contacto-2.jpg"), join(raiz, "og-contacto-2.jpg"));
  // --- llms.txt (texto en assets/llms-<sitio>.txt; solo información pública) ---
  copyFileSync(join(AQUI, "assets/llms-" + s.host + ".txt"), join(raiz, "llms.txt"));
  // --- Imágenes (sin las notas internas de créditos) ---
  mkdirSync(join(raiz, "img"), { recursive: true });
  for (const f of readdirSync(join(DEMO, "img"))) if (!f.endsWith(".md")) copyFileSync(join(DEMO, "img", f), join(raiz, "img", f));
  console.log("OK " + s.dir);
}
