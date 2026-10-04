// Listas permitidas (fuente única: las usan el formulario y el servidor).
export const EVENTOS = ["Cumpleaños","Bautizo o comunión","Baby shower","Aniversario","Evento de empresa","Otro"];
export const PERSONAS = ["Por confirmar","5 a 8","10 a 15","20 a 25","30 a 35","Más"];
export const SABORES = ["Tres Leches","Torta Chocolate","Torta Zanahoria","Red Velvet","Capricho de Almendras","Torta de Oreo","Tiramisu","Cheesecake Maracuyá","Selva Negra","Torta Rubia"];
export const PRODUCTOS_MAYOR = SABORES.concat(["Queques"]);
export const CON_REPARTO = ["Estación Central","Independencia","Ñuñoa","Providencia","Quinta Normal","Recoleta","San Joaquín","San Miguel"];
export const OTRAS = ["Alhué","Buin","Calera de Tango","Cerrillos","Cerro Navia","Colina","Conchalí","Curacaví","El Bosque","El Monte","Huechuraba","Isla de Maipo","La Cisterna","La Florida","La Granja","La Pintana","La Reina","Lampa","Las Condes","Lo Barnechea","Lo Espejo","Lo Prado","Macul","Maipú","María Pinto","Melipilla","Padre Hurtado","Paine","Pedro Aguirre Cerda","Peñaflor","Peñalolén","Pirque","Pudahuel","Puente Alto","Quilicura","Renca","San Bernardo","San José de Maipo","San Pedro","San Ramón","Talagante","Tiltil","Vitacura"];
export const ENTREGA_D = ["Retiro en local","Santiago Centro"].concat(CON_REPARTO, OTRAS, ["Fuera de Santiago"]);
export const COMUNAS_M = ["Santiago Centro"].concat(CON_REPARTO, OTRAS, ["Fuera de la Región Metropolitana"]);
export const GIRO = ["Café","Almacén","Pastelería","Restaurante","Otro"];
export const LOCALES = ["Menos de 5","5 o más"];
export const REBANADAS = ["No vendo actualmente","Menos de 5","5 o más"];
