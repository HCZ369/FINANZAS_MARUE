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
  <style>
    *, *::before, *::after {{ box-sizing: border-box; }}
    * {{ margin: 0; padding: 0; }}

    :root {{
      --fondo: #090909;
      --fondo-profundo: #050505;
      --superficie: #111011;
      --superficie-alta: #171516;
      --borde: #292427;
      --texto: #ded9db;
      --texto-fuerte: #f2eef0;
      --texto-tenue: #999194;
      --texto-debil: #686164;
      --acento: #74394b;
      --acento-hover: #8d465c;
      --acento-claro: #c18496;
      --radio: 3px;
    }}

    html {{ background: var(--fondo); scrollbar-color: #3a3236 var(--fondo-profundo); }}

    body {{
      font-family: "Geist", "Segoe UI", Arial, sans-serif;
      font-size: 14px; letter-spacing: -0.015em;
      background: var(--fondo); color: var(--texto);
      -webkit-font-smoothing: antialiased;
    }}

    ::-webkit-scrollbar {{ width: 10px; }}
    ::-webkit-scrollbar-track {{ background: var(--fondo-profundo); }}
    ::-webkit-scrollbar-thumb {{ background: #332d30; border: 2px solid var(--fondo-profundo); }}

    .contenedor {{ max-width: 1200px; margin: 0 auto; padding: 2.5rem 1rem 4rem; }}

    .encabezado {{ text-align: center; margin-bottom: 2.5rem; }}
    .encabezado h1 {{
      color: var(--texto-fuerte); font-weight: 400;
      font-size: clamp(1.6rem, 5vw, 2.4rem); letter-spacing: 0.06em;
      text-transform: uppercase;
    }}
    .encabezado p {{ color: var(--texto-tenue); margin-top: 0.6rem; font-size: 0.95rem; }}

    .barra {{
      display: flex; justify-content: center; margin-bottom: 2rem;
    }}
    .barra input {{
      width: 100%; max-width: 420px; padding: 0.65rem 0.9rem;
      background: var(--superficie); border: 1px solid var(--borde);
      border-radius: var(--radio); color: var(--texto); font-size: 0.9rem;
      outline: none; transition: border-color 130ms ease;
    }}
    .barra input:focus {{ border-color: var(--acento-hover); box-shadow: inset 2px 0 0 var(--acento-hover); }}
    .barra input::placeholder {{ color: var(--texto-debil); }}

    .contador {{ text-align: center; color: var(--texto-debil); font-size: 0.8rem; margin-bottom: 2rem; }}

    .grilla {{
      display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.4rem;
    }}
    @media (max-width: 640px) {{
      .grilla {{ grid-template-columns: repeat(2, 1fr); gap: 0.9rem; }}
      .contenedor {{ padding: 1.5rem 0.8rem 3rem; }}
    }}
    @media (max-width: 380px) {{
      .grilla {{ grid-template-columns: 1fr; }}
    }}

    .card {{
      background: var(--superficie); border: 1px solid var(--borde);
      border-radius: var(--radio); overflow: hidden; display: flex; flex-direction: column;
      transition: border-color 130ms ease, transform 130ms ease;
    }}
    .card:hover {{ border-color: var(--acento-hover); transform: translateY(-2px); }}

    .card-img {{
      width: 100%; aspect-ratio: 1 / 1; object-fit: cover;
      background: var(--superficie-alta); display: block;
    }}
    .card-img-vacia {{
      width: 100%; aspect-ratio: 1 / 1; background: var(--superficie-alta);
      display: flex; align-items: center; justify-content: center;
      color: var(--texto-debil); font-size: 0.75rem; text-align: center; padding: 1rem;
    }}

    .card-cuerpo {{ padding: 0.9rem; display: flex; flex-direction: column; gap: 0.55rem; flex-grow: 1; }}
    .card-nombre {{ color: var(--texto-fuerte); font-weight: 500; line-height: 1.3; font-size: 0.95rem; }}
    .card-meta {{ font-size: 0.75rem; color: var(--texto-tenue); line-height: 1.4; }}
    .card-meta span {{ color: var(--texto-debil); }}
    .card-desc {{ font-size: 0.78rem; color: var(--texto-tenue); line-height: 1.45; flex-grow: 1; }}

    .card-pie {{
      display: flex; align-items: center; justify-content: space-between;
      gap: 0.5rem; padding-top: 0.6rem; border-top: 1px solid var(--borde); margin-top: auto;
    }}
    .card-precio {{ color: var(--acento-claro); font-weight: 600; font-size: 1rem; white-space: nowrap; }}

    .btn-wa {{
      border: 1px solid var(--acento); background: var(--acento); color: #f6eef1;
      border-radius: var(--radio); padding: 0.45rem 0.7rem; font-size: 0.78rem;
      font-weight: 600; cursor: pointer; transition: background 130ms ease; white-space: nowrap;
      font-family: inherit;
    }}
    .btn-wa:hover {{ background: var(--acento-hover); }}

    .vacio {{ text-align: center; color: var(--texto-tenue); padding: 3rem 1rem; }}

    .pie {{ text-align: center; color: var(--texto-debil); font-size: 0.72rem; margin-top: 3rem; }}
  </style>
</head>
<body>
  <div class="contenedor">
    <div class="encabezado">
      <h1>{titulo}</h1>
      <p>{subtitulo}</p>
    </div>

    <div class="barra">
      <input type="text" id="buscar" placeholder="Buscar producto o material..." autocomplete="off">
    </div>

    <div class="contador" id="contador"></div>
    <div class="grilla" id="grilla"></div>
    <div class="vacio" id="vacio" style="display:none;">No se encontraron productos.</div>

    <div class="pie">Actualizado recientemente · Precios en guaraníes</div>
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

    function abrirWhatsApp(nombre, precio) {{
      var texto = "Hola! Me interesa este producto: " + nombre + " (" + precio + ")";
      var url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto);
      window.open(url, "_blank");
    }}

    function tarjeta(p) {{
      var card = document.createElement("div");
      card.className = "card";

      var img = p.foto
        ? '<img class="card-img" src="' + escapar(p.foto) + '" alt="' + escapar(p.nombre) + '" loading="lazy" onerror="this.outerHTML=\'<div class=card-img-vacia>Sin imagen</div>\'">'
        : '<div class="card-img-vacia">Sin imagen</div>';

      var meta = "";
      if (p.material) meta += '<span>Material:</span> ' + escapar(p.material);
      if (p.material && p.talla) meta += " &middot; ";
      if (p.talla) meta += '<span>Talla:</span> ' + escapar(p.talla);

      card.innerHTML =
        img +
        '<div class="card-cuerpo">' +
          '<div class="card-nombre">' + escapar(p.nombre) + '</div>' +
          (meta ? '<div class="card-meta">' + meta + '</div>' : '') +
          (p.descripcion ? '<div class="card-desc">' + escapar(p.descripcion) + '</div>' : '') +
          '<div class="card-pie">' +
            '<span class="card-precio">' + escapar(p.precio) + '</span>' +
            '<button class="btn-wa">Consultar</button>' +
          '</div>' +
        '</div>';

      card.querySelector(".btn-wa").addEventListener("click", function () {{
        abrirWhatsApp(p.nombre, p.precio);
      }});

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
      contador.textContent = lista.length + (lista.length === 1 ? " producto" : " productos");
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