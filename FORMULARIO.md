# Formulario de contacto (Cloudflare Pages Functions)

Sitio estático + Pages Functions. Rutas: `/c`, `/c/d`, `/c/m`, `/d`, `/m` (formulario), `/privacidad`, `POST /api/contacto`.

- `functions/` y `form.html`, `privacidad.html`, `_redirects`, `_headers` (bloque "FORMULARIO"), `img/`: **archivos generados** por `form-shared/build.mjs` desde `form-shared/src/` (no editar a mano).
- `form-backend/`: formateador del mensaje de Telegram y esquema de la base D1 (`esquema.sql`).
- `form-shared/test/`: pruebas (`node fechas.test.mjs`, `node validar.test.mjs`; `e2e.mjs` necesita una URL desplegada y una clave de prueba local no versionada).
- El generador espera la disposición del proyecto privado (`website/antojitos.cl`, `website/antojos.cl`, `website/form-shared`, `website/form-backend`), por eso aquí se publica como referencia.

**Secretos: NO están en este repositorio.** Se configuran en Cloudflare Pages (Settings → Variables): `TELEGRAM_BOT_TOKEN`, `TURNSTILE_SECRET`, `RATE_SALT`, `TEST_KEY`; variables: `SITIO`, `ENTORNO`, `TELEGRAM_CHAT_ID`, `TELEGRAM_CHAT_ID_PRUEBA`; binding D1 `DB`. La sitekey de Turnstile es pública.
