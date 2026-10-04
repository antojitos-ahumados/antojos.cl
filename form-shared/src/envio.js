  // ---- Envío al servidor ----
  function mensaje(txt, enlaceWa) {
    var r = $("#resultado");
    r.classList.remove("oculto");
    r.textContent = txt;
    if (enlaceWa) {
      var a = document.createElement("a"); a.href = "https://wa.me/56956143043"; a.target = "_blank"; a.rel = "noopener"; a.textContent = "WhatsApp";
      r.appendChild(document.createTextNode(" ")); r.appendChild(a); r.appendChild(document.createTextNode("."));
    }
  }

  // Turnstile (verificación anti-spam de Cloudflare; invisible salvo que haga falta interacción)
  var tsToken = "", tsId = null, tsEspera = null;
  var TS_KEY = /(\.pages\.dev|^localhost|^127\.0\.0\.1)$/.test(location.hostname) ? "1x00000000000000000000AA" : TS_SITEKEY; // llave de prueba solo en vistas previas
  function tsRender() {
    try {
      tsId = window.turnstile.render("#turnstile", {
        sitekey: TS_KEY, appearance: "interaction-only", language: "es",
        callback: function (t) { tsToken = t; if (tsEspera) { tsEspera(t); tsEspera = null; } },
        "expired-callback": function () { tsToken = ""; },
        "error-callback": function () { tsToken = ""; }
      });
    } catch (e) { setTimeout(tsIniciar, 500); }
  }
  function tsIniciar() {
    if (tsId !== null) return;
    if (window.turnstile && typeof window.turnstile.render === "function") return tsRender();
    if (window.turnstile && typeof window.turnstile.ready === "function") { try { return window.turnstile.ready(tsRender); } catch (e) {} }
    setTimeout(tsIniciar, 400);
  }
  setTimeout(tsIniciar, 0);
  function tsObtener() {
    return new Promise(function (res) {
      if (tsToken) return res(tsToken);
      tsEspera = res;
      setTimeout(function () { if (tsEspera === res) { tsEspera = null; res(""); } }, 20000);
    });
  }
  function tsReiniciar() { tsToken = ""; if (window.turnstile && tsId !== null) { try { window.turnstile.reset(tsId); } catch (e) {} } }

  function radio(name) { var e = $$('[name="' + name + '"]:not(:disabled)').filter(function (x) { return x.checked; })[0]; return e ? e.value : ""; }
  function multiples(name) { return $$('[name="' + name + '"]:not(:disabled)').filter(function (x) { return x.checked; }).map(function (x) { return x.value; }); }
  function recolectar() {
    var o = {
      tipo: tipo, sitio_web: ($('[name="sitio_web"]').value || ""),
      nombre: val("nombre"), telefono: val("telefono"), email: val("email"), comentarios: val("comentarios"),
      acepto: $("#acepto").checked
    };
    if (tipo === "d") {
      o.evento = radio("evento"); o.fecha = val("fecha"); o.personas = radio("personas");
      if (o.personas === "Más") o.personas_mas = val("personas_mas");
      o.sabores = multiples("sabores"); o.entrega = val("entrega"); o.quiere_guia = $("#quiere_guia").checked;
    } else {
      o.negocio = val("negocio"); o.rut = val("rut"); o.direccion = val("direccion"); o.comuna = val("comuna");
      o.locales = radio("locales"); o.giro = multiples("giro"); o.rebanadas = val("rebanadas");
      o.productos = multiples("productos"); o.quiere_folletos = $("#quiere_folletos").checked;
    }
    return o;
  }

  function marcarServidor(campos) {
    var textos = { fecha: "Esa fecha ya no está disponible. Elige otra de la lista.", telefono: "Revisa el teléfono.", email: "Revisa el correo.", comentarios: "Usa solo texto simple, sin enlaces ni símbolos especiales." };
    (campos || []).forEach(function (c) {
      var f = $('[data-campo="' + c + "_" + tipo + '"]') || $('[data-campo="' + c + '"]');
      if (f) { f.classList.add("campo-malo"); var e = $(".error", f); if (e) e.textContent = textos[c] || "Revisa este dato."; }
    });
    var primero = $(".campo-malo"); if (primero) primero.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function exito() {
    var f = $("#f");
    if (window.turnstile && tsId !== null) { try { window.turnstile.remove(tsId); } catch (e) {} }
    f.innerHTML = '<div class="exito" role="status"><h2>¡Gracias!</h2><p>Recibimos tu solicitud.</p><p>Te responderemos lo antes posible.</p><a class="volver" href="/">Volver al inicio</a></div>';
    f.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof gtag === "function") { try { gtag("event", "generate_lead", { form_type: tipo }); } catch (e) {} }
  }

  var enviando = false;
  function enviar() {
    if (enviando) return;
    enviando = true;
    var btn = $("#btn"), textoBtn = btn.textContent;
    btn.disabled = true; btn.textContent = "Enviando…";
    mensaje("Enviando tu solicitud…");
    function listo() { enviando = false; btn.disabled = false; btn.textContent = textoBtn; tsReiniciar(); }
    tsObtener().then(function (token) {
      var datos = recolectar(); datos["cf-turnstile-response"] = token;
      return fetch("/api/contacto", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(datos), credentials: "same-origin" });
    }).then(function (resp) {
      var tipoResp = resp.headers.get("content-type") || "";
      if (resp.status === 429) {
        if (/text\/html/.test(tipoResp)) { return resp.text().then(function (html) { document.open(); document.write(html); document.close(); }); }
        listo(); return mensaje("Hiciste demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.");
      }
      return resp.json().then(function (j) {
        if (resp.ok && j && j.ok) { return exito(); }
        listo();
        if (resp.status === 400 && j && j.campos) { mensaje("Revisa los campos marcados en rojo."); return marcarServidor(j.campos); }
        if (resp.status === 403) { return mensaje("No pudimos verificar que eres una persona. Recarga la página e inténtalo de nuevo."); }
        mensaje("No pudimos enviar tu solicitud. Inténtalo de nuevo en unos minutos o escríbenos por", true);
      });
    }).catch(function () {
      listo();
      mensaje("No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo, o escríbenos por", true);
    });
  }
