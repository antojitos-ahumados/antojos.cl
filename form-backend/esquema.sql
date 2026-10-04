CREATE TABLE IF NOT EXISTS solicitudes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recibido TEXT NOT NULL,
  sitio TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('d','m')),
  datos TEXT NOT NULL,
  procesada INTEGER NOT NULL DEFAULT 0,
  telegram_ok INTEGER NOT NULL DEFAULT 0,
  borrar_despues TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pendientes ON solicitudes (procesada, recibido);

-- Contador de visitas compartido por TODAS las herramientas /api/ (formulario, redirector /u/, etc.)
-- clave = SHA-256 (hex) de IP + user-agent + accept-language + sal secreta  (nunca la IP en claro)
--       o 'g:<tipo>:<hora>' para los topes globales por hora.
-- ventana = segundos epoch en que empezó la ventana; se borran filas de más de ~1 hora.
CREATE TABLE IF NOT EXISTS limite_visitas (
  clave TEXT PRIMARY KEY,
  ventana INTEGER NOT NULL,
  cuenta INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_limite_ventana ON limite_visitas (ventana);
CREATE INDEX IF NOT EXISTS idx_borrar ON solicitudes (borrar_despues);
