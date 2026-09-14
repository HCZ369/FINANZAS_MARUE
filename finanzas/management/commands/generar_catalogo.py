import os
import re
import json
import html
import zipfile
import io

import requests
from django.core.management.base import BaseCommand, CommandError

from core.db import fetch_all, fetch_one


NUMERO_WHATSAPP = "595992188322"

# Token de Netlify.
NETLIFY_TOKEN = "nfp_EygoDUYeR1XzJz21UfDuk2UZUoD662WU9bb1"

# Un site de Netlify por negocio. La primera vez que corras el comando,
# si el site id está vacío, se crea el site solo y te imprime el id para
# que lo guardes acá o en las variables de entorno.
NETLIFY_SITE_IDS = {
    1: os.environ.get("NETLIFY_SITE_ID_1", ""),
    2: os.environ.get("NETLIFY_SITE_ID_2", ""),
    3: os.environ.get("NETLIFY_SITE_ID_3", ""),
}


TEXTOS_NEGOCIO = {
    1: {"titulo": "Marué Dark", "subtitulo": "Joyería oscura y artículos de cuero hechos a mano"},
    2: {"titulo": "Marué", "subtitulo": "Catálogo de productos"},
    3: {"titulo": "Marué Lab", "subtitulo": "Cartucheras porta-cuchillos artesanales"},
}

class Command(BaseCommand):
    help = "Genera el catálogo HTML de un negocio y lo publica en Netlify."

    def add_arguments(self, parser):
        parser.add_argument("negocio_id", type=int, help="ID del negocio (1, 2 o 3)")
        parser.add_argument(
            "--solo-html",
            action="store_true",
            help="Genera el archivo HTML localmente y NO lo sube a Netlify.",
        )

    def handle(self, *args, **opciones):
        negocio_id = opciones["negocio_id"]
        solo_html = opciones["solo_html"]

        # 1) Traer datos del negocio
        negocio = fetch_one("SELECT id, nombre FROM negocio WHERE id = %s", [negocio_id])
        if negocio is None:
            raise CommandError(f"No existe el negocio {negocio_id}.")

        productos = self.obtener_productos_con_stock(negocio_id)

        self.stdout.write(
            f"Negocio {negocio_id} ({negocio['nombre']}): "
            f"{len(productos)} productos con stock disponible."
        )

        if len(productos) == 0:
            self.stdout.write(self.style.WARNING(
                "No hay productos con stock. El catálogo saldría vacío. Abortando."
            ))
            return

        # 2) Generar HTML
        html_catalogo = self.construir_html(negocio_id, negocio["nombre"], productos)

        # 3) Guardar copia local siempre (para respaldo / prueba)
        nombre_local = f"catalogo_negocio_{negocio_id}.html"
        with open(nombre_local, "w", encoding="utf-8") as f:
            f.write(html_catalogo)
        self.stdout.write(f"HTML generado: {nombre_local}")

        if solo_html:
            self.stdout.write(self.style.SUCCESS(
                "Modo --solo-html: no se subió a Netlify. Abrí el archivo en tu navegador para revisarlo."
            ))
            return

        # 4) Subir a Netlify
        self.publicar_en_netlify(negocio_id, html_catalogo)

    
    def obtener_productos_con_stock(self, negocio_id):
        query = """
            SELECT p.id, p.nombre, p.precio, p.imagen_url,
                   p.material, p.talla, p.descripcion,
                   COALESCE(compras.total, 0) - COALESCE(ventas_total.total, 0) AS stock
              FROM producto p
              LEFT JOIN (
                  SELECT producto_id, SUM(cantidad_comprada) AS total
                  FROM lote_producto
                  GROUP BY producto_id
              ) compras ON compras.producto_id = p.id
              LEFT JOIN (
                  SELECT producto_id, SUM(cantidad) AS total
                  FROM venta_detalle
                  GROUP BY producto_id
              ) ventas_total ON ventas_total.producto_id = p.id
             WHERE p.negocio_id = %s
               AND p.estado = 'activo'
               AND p.en_catalogo = 1
             ORDER BY p.nombre
        """
        registros = fetch_all(query, [negocio_id])

        # Filtrar en Python: stock > 0
        disponibles = []
        for r in registros:
            stock = r.get("stock") or 0
            if stock > 0:
                disponibles.append(r)
        return disponibles

    # HTML

    def construir_html(self, negocio_id, nombre_negocio, productos):
        textos = TEXTOS_NEGOCIO.get(
            negocio_id,
            {"titulo": nombre_negocio, "subtitulo": "Catálogo de productos"},
        )

        # Preparar los productos para el JS (solo campos públicos, precio formateado)
        productos_publicos = []
        for p in productos:
            precio = p.get("precio")
            precio_txt = self.formatear_guaranies(precio)

            productos_publicos.append({
                "nombre": p.get("nombre") or "",
                "precio": precio_txt,
                "material": p.get("material") or "",
                "talla": p.get("talla") or "",
                "descripcion": p.get("descripcion") or "",
                "foto": p.get("imagen_url") or "",
            })

        productos_json = json.dumps(productos_publicos, ensure_ascii=False)

        titulo = html.escape(textos["titulo"])
        subtitulo = html.escape(textos["subtitulo"])

        return PLANTILLA_HTML.format(
            titulo=titulo,
            subtitulo=subtitulo,
            productos_json=productos_json,
            numero_whatsapp=NUMERO_WHATSAPP,
        )

    def formatear_guaranies(self, valor):
        if valor is None:
            return ""
        try:
            n = int(round(float(valor)))
        except (ValueError, TypeError):
            return str(valor)
        # separador de miles con punto (formato Paraguay)
        return "₲ " + f"{n:,}".replace(",", ".")

    # NETLIFY
    
    def publicar_en_netlify(self, negocio_id, html_catalogo):
        if not NETLIFY_TOKEN:
            raise CommandError(
                "Falta NETLIFY_TOKEN"
            )

        site_id = NETLIFY_SITE_IDS.get(negocio_id, "")

        # Si no hay site todavía, crear uno
        if not site_id:
            site_id, url = self.crear_site_netlify(negocio_id)
            self.stdout.write(self.style.WARNING(
                f"Se creó un site nuevo en Netlify para el negocio {negocio_id}.\n"
                f"  SITE ID: {site_id}\n"
                f"  Guardalo en NETLIFY_SITE_ID_{negocio_id} para las próximas veces."
            ))

        # Desplegar: Netlify acepta un zip con los archivos del sitio
        buffer_zip = io.BytesIO()
        with zipfile.ZipFile(buffer_zip, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("index.html", html_catalogo)
        buffer_zip.seek(0)

        respuesta = requests.post(
            f"https://api.netlify.com/api/v1/sites/{site_id}/deploys",
            headers={
                "Authorization": f"Bearer {NETLIFY_TOKEN}",
                "Content-Type": "application/zip",
            },
            data=buffer_zip.read(),
            timeout=60,
        )

        if respuesta.status_code >= 300:
            raise CommandError(
                f"Netlify respondió {respuesta.status_code}: {respuesta.text[:300]}"
            )

        datos = respuesta.json()
        url_publica = datos.get("ssl_url") or datos.get("url") or ""

        self.stdout.write(self.style.SUCCESS(
            f"\n¡Catálogo publicado!\n"
            f"  URL: {url_publica}\n"
            f"  Pegá esta URL en la bio de Instagram del negocio {negocio_id}.\n"
        ))

    def crear_site_netlify(self, negocio_id):
        nombre_site = f"marue-negocio-{negocio_id}"
        respuesta = requests.post(
            "https://api.netlify.com/api/v1/sites",
            headers={"Authorization": f"Bearer {NETLIFY_TOKEN}"},
            json={"name": nombre_site},
            timeout=30,
        )
        if respuesta.status_code >= 300:
            raise CommandError(
                f"No se pudo crear el site en Netlify ({respuesta.status_code}): "
                f"{respuesta.text[:300]}\n"
                f"Puede que el nombre '{nombre_site}' ya esté tomado; cambialo en crear_site_netlify."
            )
        datos = respuesta.json()
        return datos["id"], datos.get("ssl_url") or datos.get("url", "")


# PLANTILLA HTML  (dark goth, responsive, sin emojis)


PLANTILLA_HTML = r"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{titulo}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {{ box-sizing: border-box; }}
    * {{ margin: 0; padding: 0; }}
 
    :root {{
      --negro: #060506;
      --negro-2: #0b090b;
      --panel: #100d10;
      --panel-2: #14101410;
      --borde: #241d24;
      --borde-luz: #3a2d38;
      --hueso: #e7e0e4;
      --hueso-tenue: #a99ea6;
      --ceniza: #6f6570;
      --vino: #7c3a4e;
      --vino-1: #8a3a50;
      --vino-2: #b06074;
      --oro-viejo: #b89b6a;
    }}
 
    html {{
      background: var(--negro);
      scrollbar-color: #2a2029 var(--negro);
    }}
 
    body {{
      font-family: "Jost", "Segoe UI", sans-serif;
      background:
        radial-gradient(ellipse at 50% -10%, #16101580 0%, transparent 60%),
        var(--negro);
      color: var(--hueso);
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
    }}
 
    ::-webkit-scrollbar {{ width: 9px; }}
    ::-webkit-scrollbar-track {{ background: var(--negro); }}
    ::-webkit-scrollbar-thumb {{ background: #2a2029; border: 2px solid var(--negro); }}
 
    .wrap {{ max-width: 1100px; margin: 0 auto; padding: 2.5rem 1.1rem 4.5rem; }}
 
    /* ---------- ENCABEZADO ---------- */
    .head {{ text-align: center; margin-bottom: 2.75rem; position: relative; }}
    .head::after {{
      content: "";
      display: block;
      width: 54px; height: 1px;
      margin: 1.15rem auto 0;
      background: linear-gradient(90deg, transparent, var(--vino-2), transparent);
    }}
    .head h1 {{
      font-family: "Cinzel", serif;
      font-weight: 600;
      font-size: clamp(1.7rem, 7vw, 2.9rem);
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--hueso);
      line-height: 1.1;
    }}
    .head .sub {{
      font-family: "Cormorant Garamond", serif;
      font-style: italic;
      font-size: clamp(0.95rem, 3.5vw, 1.15rem);
      color: var(--hueso-tenue);
      margin-top: 0.7rem;
      letter-spacing: 0.02em;
    }}
 
    /* ---------- BUSCADOR ---------- */
    .buscador {{ display: flex; justify-content: center; margin-bottom: 1.4rem; }}
    .buscador input {{
      width: 100%; max-width: 380px;
      padding: 0.7rem 1rem;
      background: var(--panel);
      border: 1px solid var(--borde);
      border-radius: 2px;
      color: var(--hueso);
      font-family: "Jost", sans-serif;
      font-size: 0.9rem;
      letter-spacing: 0.03em;
      outline: none;
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }}
    .buscador input::placeholder {{ color: var(--ceniza); letter-spacing: 0.06em; }}
    .buscador input:focus {{
      border-color: var(--vino-1);
      box-shadow: 0 0 0 1px var(--vino) inset;
    }}
 
    .contador {{
      text-align: center;
      color: var(--ceniza);
      font-size: 0.72rem;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      margin-bottom: 2.2rem;
    }}
 
    /* ---------- GRILLA ---------- */
    .grilla {{
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.85rem;
    }}
    @media (min-width: 620px) {{
      .grilla {{ grid-template-columns: repeat(3, 1fr); gap: 1.2rem; }}
    }}
    @media (min-width: 900px) {{
      .grilla {{ grid-template-columns: repeat(4, 1fr); }}
    }}
 
    /* ---------- TARJETA ---------- */
    .card {{
      position: relative;
      display: flex; flex-direction: column;
      background: linear-gradient(180deg, var(--panel) 0%, var(--negro-2) 100%);
      border: 1px solid var(--borde);
      border-radius: 2px;
      overflow: hidden;
      cursor: pointer;
      text-align: left;
      width: 100%;
      font: inherit; color: inherit;
      -webkit-tap-highlight-color: transparent;
      transition: border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
    }}
    .card::before {{
      content: "";
      position: absolute; inset: 0;
      border: 1px solid transparent;
      pointer-events: none;
      transition: border-color 200ms ease;
      z-index: 2;
    }}
    /* marco interior sutil al interactuar */
    .card:hover, .card:active, .card:focus-visible {{
      border-color: var(--borde-luz);
      transform: translateY(-3px);
      box-shadow: 0 10px 30px -12px #000, 0 0 22px -14px var(--vino-2);
      outline: none;
    }}
    .card:hover::before, .card:active::before, .card:focus-visible::before {{
      border-color: #5a3f4d55;
      inset: 5px;
    }}
 
    .foto {{
      position: relative;
      width: 100%;
      aspect-ratio: 1 / 1;
      background: var(--negro-2);
      overflow: hidden;
    }}
    .foto img {{
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
      filter: saturate(0.92) contrast(1.04);
      transition: transform 450ms ease, filter 300ms ease;
    }}
    .card:hover .foto img, .card:active .foto img {{
      transform: scale(1.05);
      filter: saturate(1) contrast(1.06);
    }}
    .foto::after {{
      content: "";
      position: absolute; inset: 0;
      background: linear-gradient(180deg, transparent 55%, #060506d9 100%);
      pointer-events: none;
    }}
    .foto-vacia {{
      width: 100%; aspect-ratio: 1 / 1;
      background:
        repeating-linear-gradient(45deg, #0d0a0d 0 10px, #0a080a 10px 20px);
      display: flex; align-items: center; justify-content: center;
      color: var(--ceniza);
      font-family: "Cinzel", serif;
      font-size: 1.6rem; letter-spacing: 0.1em;
    }}
 
    .cuerpo {{
      display: flex; flex-direction: column;
      gap: 0.4rem;
      padding: 0.75rem 0.8rem 0.85rem;
      flex-grow: 1;
    }}
    .nombre {{
      font-family: "Cormorant Garamond", serif;
      font-weight: 500;
      font-size: 1.02rem;
      line-height: 1.2;
      color: var(--hueso);
      letter-spacing: 0.01em;
    }}
    .meta {{
      font-size: 0.68rem;
      color: var(--hueso-tenue);
      letter-spacing: 0.05em;
      line-height: 1.5;
    }}
    .meta b {{ color: var(--ceniza); font-weight: 400; }}
    .desc {{
      font-size: 0.7rem;
      color: var(--ceniza);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }}
 
    .pie {{
      display: flex; align-items: center; justify-content: space-between;
      gap: 0.4rem;
      margin-top: auto;
      padding-top: 0.6rem;
      border-top: 1px solid var(--borde);
    }}
    .precio {{
      font-family: "Cinzel", serif;
      font-weight: 500;
      font-size: 0.92rem;
      color: var(--vino-2);
      letter-spacing: 0.03em;
      white-space: nowrap;
    }}
    .consultar {{
      font-size: 0.62rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--hueso-tenue);
      display: flex; align-items: center; gap: 0.3rem;
      transition: color 200ms ease;
    }}
    .card:hover .consultar, .card:active .consultar {{ color: var(--vino-2); }}
    .consultar svg {{ width: 12px; height: 12px; display: block; }}
 
    /* ---------- ESTADOS / PIE ---------- */
    .vacio {{
      text-align: center;
      color: var(--ceniza);
      font-family: "Cormorant Garamond", serif;
      font-style: italic;
      font-size: 1.1rem;
      padding: 3.5rem 1rem;
    }}
    .footer {{
      text-align: center;
      color: #4d454d;
      font-size: 0.64rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin-top: 3.5rem;
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <header class="head">
      <h1>{titulo}</h1>
      <p class="sub">{subtitulo}</p>
    </header>
 
    <div class="buscador">
      <input type="text" id="buscar" placeholder="Buscar pieza o material" autocomplete="off">
    </div>
 
    <div class="contador" id="contador"></div>
    <div class="grilla" id="grilla"></div>
    <div class="vacio" id="vacio" style="display:none;">No se encontraron piezas.</div>
 
    <footer class="footer">Precios en guaraníes &middot; Consultas por WhatsApp</footer>
  </div>
 
  <script>
    var PRODUCTOS = {productos_json};
    var WHATSAPP = "{numero_whatsapp}";
 
    var grilla = document.getElementById("grilla");
    var vacio = document.getElementById("vacio");
    var contador = document.getElementById("contador");
    var inputBuscar = document.getElementById("buscar");
 
    function escapar(t) {{
      var d = document.createElement("div");
      d.textContent = t == null ? "" : String(t);
      return d.innerHTML;
    }}
 
    function consultar(p) {{
      var texto = "Hola! Me interesa esta pieza: " + p.nombre + " (" + p.precio + ")";
      var url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto);
      window.open(url, "_blank");
    }}
 
    var ICONO_WA =
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7.9-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.2 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3A2.9 2.9 0 0 0 6.4 10a5 5 0 0 0 1.1 2.7 11.5 11.5 0 0 0 4.4 3.9c2 .8 2 .6 2.4.5a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c-.1-.1-.2-.2-.4-.3z"/>' +
      '</svg>';
 
    function tarjeta(p) {{
      var card = document.createElement("button");
      card.className = "card";
      card.type = "button";
 
      var foto = p.foto
        ? '<div class="foto"><img src="' + escapar(p.foto) + '" alt="' + escapar(p.nombre) + '" loading="lazy" onerror="this.parentNode.outerHTML=\'<div class=foto-vacia>M</div>\'"></div>'
        : '<div class="foto-vacia">M</div>';
 
      var meta = "";
      if (p.material) meta += '<b>Material</b> ' + escapar(p.material);
      if (p.material && p.talla) meta += ' &nbsp;·&nbsp; ';
      if (p.talla) meta += '<b>Talla</b> ' + escapar(p.talla);
 
      card.innerHTML =
        foto +
        '<div class="cuerpo">' +
          '<div class="nombre">' + escapar(p.nombre) + '</div>' +
          (meta ? '<div class="meta">' + meta + '</div>' : '') +
          (p.descripcion ? '<div class="desc">' + escapar(p.descripcion) + '</div>' : '') +
          '<div class="pie">' +
            '<span class="precio">' + escapar(p.precio) + '</span>' +
            '<span class="consultar">' + ICONO_WA + 'Consultar</span>' +
          '</div>' +
        '</div>';
 
      card.addEventListener("click", function () {{ consultar(p); }});
      return card;
    }}
 
    function normalizar(t) {{
      return (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }}
 
    function render(lista) {{
      grilla.innerHTML = "";
      if (lista.length === 0) {{
        vacio.style.display = "block";
        contador.textContent = "";
        return;
      }}
      vacio.style.display = "none";
      contador.textContent = lista.length + (lista.length === 1 ? " pieza" : " piezas");
      var frag = document.createDocumentFragment();
      lista.forEach(function (p) {{ frag.appendChild(tarjeta(p)); }});
      grilla.appendChild(frag);
    }}
 
    inputBuscar.addEventListener("input", function (e) {{
      var q = normalizar(e.target.value);
      if (!q) {{ render(PRODUCTOS); return; }}
      var filtrados = PRODUCTOS.filter(function (p) {{
        return normalizar(p.nombre).indexOf(q) !== -1 ||
               normalizar(p.material).indexOf(q) !== -1;
      }});
      render(filtrados);
    }});
 
    render(PRODUCTOS);
  </script>
</body>
</html>
"""