import os
import io
import json
import html as html_lib
from rest_framework.response import Response
from rest_framework.views import APIView
from core.db import fetch_all, execute_command, fetch_one, execute_insert
from django.db import transaction
from django.http import HttpResponse

class ClientesView(APIView):
    def get(self, request, negocio_id):
        query = "SELECT * FROM cliente ORDER BY nombre"
        registros = fetch_all(query)
        return Response(registros)

    def post(self, request, negocio_id):
        nombre = request.data.get("nombre")
        celular = request.data.get("celular")
        contacto = request.data.get("contacto")
        fecha_nacimiento = request.data.get("fecha_nacimiento")
        correo = request.data.get("correo")
        ruc = request.data.get("ruc")

        query = "INSERT INTO cliente (negocio_id, nombre, celular, contacto, fecha_nacimiento, correo, ruc) VALUES (%s, %s, %s, %s, %s, %s, %s)"
        parametros = [negocio_id, nombre, celular, contacto, fecha_nacimiento, correo, ruc]

        registros_afectados = execute_command(query, parametros)

        if registros_afectados == 0:
            return Response({"error": "No se registro al cliente"}, status=400)

        return Response({"mensaje": "Cliente registrado"})

class ClienteDetalleView(APIView):
    def get(self, request, negocio_id, cliente_id):
        query = "SELECT * FROM cliente WHERE id = %s AND negocio_id = %s"
        cliente = fetch_one(query, [cliente_id, negocio_id])
        if cliente is None:
            return Response({"error": "Cliente no encontrado"}, status=404)
        return Response(cliente)

    def put(self, request, negocio_id, cliente_id):
        nombre = request.data.get("nombre")
        celular = request.data.get("celular")
        contacto = request.data.get("contacto")
        fecha_nacimiento = request.data.get("fecha_nacimiento")
        correo = request.data.get("correo")
        ruc = request.data.get("ruc")

        query = "UPDATE cliente SET nombre = %s, celular = %s, contacto = %s, fecha_nacimiento = %s, correo = %s, ruc = %s WHERE id = %s AND negocio_id = %s"
        parametros = [nombre, celular, contacto, fecha_nacimiento, correo, ruc, cliente_id, negocio_id]

        registros = execute_command(query, parametros)

        if registros == 0:
            return Response({"error": "Cliente no actualizado"}, status=404)

        return Response({"mensaje": "Cliente actualizado"})

    def delete(self, request, negocio_id, cliente_id):
        query = "DELETE FROM cliente WHERE id = %s AND negocio_id = %s"
        registros = execute_command(query, [cliente_id, negocio_id])

        if registros == 0:
            return Response({"error": "Cliente no eliminado"}, status=404)

        return Response({"mensaje": "Cliente eliminado"})

class ProductosView(APIView):
    def get(self, request, negocio_id):
        query = """
            SELECT p.id, p.negocio_id, p.nombre, p.precio, p.imagen_url, o.imagen_url_2, p.estado,
                   COALESCE(compras.total, 0) AS cantidad_comprada,
                   COALESCE(ventas_total.total, 0) AS cantidad_vendida,
                   COALESCE(compras.total, 0) - COALESCE(ventas_total.total, 0) AS stock,
                   p.en_catalogo
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
             ORDER BY p.nombre
        """
        registros = fetch_all(query, [negocio_id])
        return Response(registros)

    def post(self, request, negocio_id):
        nombre = request.data.get("nombre")
        precio = request.data.get("precio")
        imagen_url = request.data.get("imagen_url")
        imagen_url_2 = request.data.get("imagen_url_2")
        categoria_id = request.data.get("categoria_id")
        descripcion = request.data.get("descripcion")
        en_catalogo = request.data.get("en_catalogo", True)

        query = """
            INSERT INTO producto (negocio_id, nombre, precio, imagen_url, imagen_url_2, categoria_id, descripcion, en_catalogo)
            OUTPUT INSERTED.id
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        parametros = [negocio_id, nombre, precio, imagen_url, categoria_id, descripcion, en_catalogo]
        producto_id = execute_insert(query, parametros)

        lote_id = request.data.get("lote_id")
        costo_usd = request.data.get("costo_usd")
        cantidad_comprada = request.data.get("cantidad_comprada")

        if lote_id and cantidad_comprada:
            lote = fetch_one("SELECT tasa_cambio FROM lote WHERE id = %s AND negocio_id = %s", [lote_id, negocio_id])
            costo = None
            precio_sugerido = None
            if lote and costo_usd:
                costo = float(costo_usd) * float(lote["tasa_cambio"])

            query_lp = """
                INSERT INTO lote_producto (lote_id, producto_id, costo_usd, costo, cantidad_comprada, precio_sugerido)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            execute_command(query_lp, [lote_id, producto_id, costo_usd, costo, cantidad_comprada, precio_sugerido])

        return Response({"mensaje": "Producto creado", "producto_id": producto_id})

class ProductoDetalleView(APIView):
    def get(self, request, negocio_id, producto_id):
        query = "SELECT * FROM producto WHERE id = %s AND negocio_id = %s"
        producto = fetch_one(query, [producto_id, negocio_id])

        if producto is None:
            return Response({"error": "Producto no encontrado"}, status=404)

        query_lotes = """
            SELECT lp.id AS lote_producto_id, lp.lote_id, lp.costo_usd, lp.costo,
                   lp.cantidad_comprada, lp.precio_sugerido,
                   l.fecha AS lote_fecha, l.tasa_cambio, l.descripcion AS lote_descripcion
              FROM lote_producto lp
              JOIN lote l ON lp.lote_id = l.id
             WHERE lp.producto_id = %s
             ORDER BY l.fecha DESC
        """
        lotes = fetch_all(query_lotes, [producto_id])
        producto["lotes"] = lotes

        return Response(producto)

    def put(self, request, negocio_id, producto_id):
        nombre = request.data.get("nombre")
        precio = request.data.get("precio")
        imagen_url = request.data.get("imagen_url")
        imagen_url_2 = request.data.get("imagen_url_2")
        categoria_id = request.data.get("categoria_id")
        descripcion = request.data.get("descripcion")
        material = request.data.get("material")
        talla = request.data.get("talla")
        en_catalogo_raw = request.data.get("en_catalogo", True)
        en_catalogo = 1 if en_catalogo_raw in (True, 1, "1", "true", "True") else 0

        query = """
            UPDATE producto
               SET nombre = %s, precio = %s, imagen_url = %s, imagen_url_2 = %s, categoria_id = %s,
                   descripcion = %s, material = %s, talla = %s, en_catalogo = %s
             WHERE id = %s AND negocio_id = %s
        """
        parametros = [nombre, precio, imagen_url, imagen_url_2, categoria_id, descripcion, material, talla, en_catalogo, producto_id, negocio_id]

        filas_afectadas = execute_command(query, parametros)

        if filas_afectadas == 0:
            return Response({"error": "Producto no actualizado"}, status=404)

        return Response({"mensaje": "Producto actualizado"})

    def delete(self, request, negocio_id, producto_id):
        query = "DELETE FROM producto WHERE id = %s AND negocio_id = %s"
        filas_afectadas = execute_command(query, [producto_id, negocio_id])

        if filas_afectadas == 0:
            return Response({"error": "Producto no eliminado"}, status=404)

        return Response({"mensaje": "Producto eliminado"})

class VentasView(APIView):
    def get(self, request, negocio_id):
        query = "SELECT * FROM venta WHERE negocio_id = %s"
        registros = fetch_all(query, [negocio_id])
        return Response(registros)

    def post(self, request, negocio_id):
        cliente_id = request.data.get("cliente_id")
        fecha = request.data.get("fecha")
        metodo_pago = request.data.get("metodo_pago", "efectivo")
        notas = request.data.get("notas")
        productos = request.data.get("productos")

        try:
            with transaction.atomic():
                venta_id = self.crear_venta(negocio_id, cliente_id, fecha, metodo_pago, notas, productos)
        except Exception as error:
            return Response({"error": "No se pudo completar la venta"}, status=400)

        monto_total = self.calcular_monto(venta_id)
        avisos = self.revisar_stock(productos)

        return Response({
            "mensaje": "Venta creada",
            "venta_id": venta_id,
            "monto_total": monto_total,
            "avisos": avisos,
        })

    def crear_venta(self, negocio_id, cliente_id, fecha, metodo_pago, notas, productos):
        query = """
            INSERT INTO venta (negocio_id, cliente_id, fecha, monto_total, metodo_pago, notas)
            OUTPUT INSERTED.id
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        venta_id = execute_insert(query, [negocio_id, cliente_id, fecha, 0, metodo_pago, notas])

        monto_acumulado = 0
        for producto_item in productos:
            producto_id = producto_item.get("producto_id")
            cantidad = producto_item.get("cantidad")
            precio_vendido = producto_item.get("precio_vendido")
            lote_producto_id = producto_item.get("lote_producto_id")

            if precio_vendido is not None:
                precio = float(precio_vendido)
            else:
                query_precio = "SELECT precio FROM producto WHERE id = %s"
                precio_producto = fetch_one(query_precio, [producto_id])
                precio = precio_producto["precio"]

            subtotal = precio * cantidad

            query_detalle = "INSERT INTO venta_detalle (venta_id, producto_id, lote_producto_id, cantidad, precio_unitario, subtotal) VALUES (%s, %s, %s, %s, %s, %s)"
            execute_command(query_detalle, [venta_id, producto_id, lote_producto_id, cantidad, precio, subtotal])

            monto_acumulado = monto_acumulado + subtotal

        query_update = "UPDATE venta SET monto_total = %s WHERE id = %s"
        execute_command(query_update, [monto_acumulado, venta_id])

        return venta_id

    def calcular_monto(self, venta_id):
        query = "SELECT monto_total FROM venta WHERE id = %s"
        venta = fetch_one(query, [venta_id])
        return venta["monto_total"]

    def revisar_stock(self, productos):
        avisos = []
        for producto_item in productos:
            producto_id = producto_item.get("producto_id")

            query_stock = """
                SELECT p.nombre,
                       COALESCE(compras.total, 0) - COALESCE(ventas_total.total, 0) AS stock
                  FROM producto p
                  LEFT JOIN (
                      SELECT producto_id, SUM(cantidad_comprada) AS total
                      FROM lote_producto
                      WHERE producto_id = %s
                      GROUP BY producto_id
                  ) compras ON compras.producto_id = p.id
                  LEFT JOIN (
                      SELECT producto_id, SUM(cantidad) AS total
                      FROM venta_detalle
                      WHERE producto_id = %s
                      GROUP BY producto_id
                  ) ventas_total ON ventas_total.producto_id = p.id
                 WHERE p.id = %s
            """
            resultado = fetch_one(query_stock, [producto_id, producto_id, producto_id])
            if resultado is not None and resultado["stock"] < 0:
                aviso = {"producto": resultado["nombre"], "stock": resultado["stock"]}
                avisos.append(aviso)
        return avisos

class VentaDetalleView(APIView):
    def get(self, request, negocio_id, venta_id):
        query = "SELECT * FROM venta WHERE id = %s AND negocio_id = %s"
        venta = fetch_one(query, [venta_id, negocio_id])

        if venta is None:
            return Response({"error": "Venta no encontrada"}, status=404)

        query_detalle = "SELECT * FROM venta_detalle WHERE venta_id = %s"
        detalles = fetch_all(query_detalle, [venta_id])

        venta["productos"] = detalles

        return Response(venta)

    def put(self, request, negocio_id, venta_id):
        cliente_id = request.data.get("cliente_id")
        fecha = request.data.get("fecha")
        metodo_pago = request.data.get("metodo_pago", "efectivo")
        notas = request.data.get("notas")
        productos = request.data.get("productos")

        try:
            with transaction.atomic():
                self.actualizar_venta(negocio_id, venta_id, cliente_id, fecha, metodo_pago, notas, productos)
        except Exception as error:
            return Response({"error": "No se pudo actualizar la venta"}, status=400)

        monto_total = self.calcular_monto(venta_id)
        avisos = self.revisar_stock(productos)

        return Response({
            "mensaje": "Venta actualizada",
            "monto_total": monto_total,
            "avisos": avisos,
        })

    def actualizar_venta(self, negocio_id, venta_id, cliente_id, fecha, metodo_pago, notas, productos):
        query_venta = "UPDATE venta SET cliente_id = %s, fecha = %s, metodo_pago = %s, notas = %s WHERE id = %s AND negocio_id = %s"
        execute_command(query_venta, [cliente_id, fecha, metodo_pago, notas, venta_id, negocio_id])

        query_borrar = "DELETE FROM venta_detalle WHERE venta_id = %s"
        execute_command(query_borrar, [venta_id])

        monto_acumulado = 0
        for producto_item in productos:
            producto_id = producto_item.get("producto_id")
            cantidad = producto_item.get("cantidad")
            precio_vendido = producto_item.get("precio_vendido")
            lote_producto_id = producto_item.get("lote_producto_id")

            if precio_vendido is not None:
                precio = float(precio_vendido)
            else:
                query_precio = "SELECT precio FROM producto WHERE id = %s"
                precio_producto = fetch_one(query_precio, [producto_id])
                precio = precio_producto["precio"]

            subtotal = precio * cantidad

            query_detalle = "INSERT INTO venta_detalle (venta_id, producto_id, lote_producto_id, cantidad, precio_unitario, subtotal) VALUES (%s, %s, %s, %s, %s, %s)"
            execute_command(query_detalle, [venta_id, producto_id, lote_producto_id, cantidad, precio, subtotal])

            monto_acumulado = monto_acumulado + subtotal

        query_total = "UPDATE venta SET monto_total = %s WHERE id = %s"
        execute_command(query_total, [monto_acumulado, venta_id])

    def calcular_monto(self, venta_id):
        query = "SELECT monto_total FROM venta WHERE id = %s"
        venta = fetch_one(query, [venta_id])
        return venta["monto_total"]

    def revisar_stock(self, productos):
        avisos = []
        for producto_item in productos:
            producto_id = producto_item.get("producto_id")

            query_stock = """
                SELECT p.nombre,
                       COALESCE(compras.total, 0) - COALESCE(ventas_total.total, 0) AS stock
                  FROM producto p
                  LEFT JOIN (
                      SELECT producto_id, SUM(cantidad_comprada) AS total
                      FROM lote_producto
                      WHERE producto_id = %s
                      GROUP BY producto_id
                  ) compras ON compras.producto_id = p.id
                  LEFT JOIN (
                      SELECT producto_id, SUM(cantidad) AS total
                      FROM venta_detalle
                      WHERE producto_id = %s
                      GROUP BY producto_id
                  ) ventas_total ON ventas_total.producto_id = p.id
                 WHERE p.id = %s
            """
            resultado = fetch_one(query_stock, [producto_id, producto_id, producto_id])
            if resultado is not None and resultado["stock"] < 0:
                aviso = {"producto": resultado["nombre"], "stock": resultado["stock"]}
                avisos.append(aviso)
        return avisos

    def delete(self, request, negocio_id, venta_id):
        query_borrar_detalle = "DELETE FROM venta_detalle WHERE venta_id = %s"
        execute_command(query_borrar_detalle, [venta_id])

        query_borrar_venta = "DELETE FROM venta WHERE id = %s AND negocio_id = %s"
        filas_afectadas = execute_command(query_borrar_venta, [venta_id, negocio_id])

        if filas_afectadas == 0:
            return Response({"error": "Venta no encontrada"}, status=404)

        return Response({"mensaje": "Venta eliminada"})

class VentasPorClienteView(APIView):
    def get(self, request, negocio_id, cliente_id):
        query = "SELECT id, fecha, monto_total FROM venta WHERE negocio_id = %s AND cliente_id = %s ORDER BY fecha DESC"
        registros = fetch_all(query, [negocio_id, cliente_id])
        return Response(registros)

class LotesView(APIView):
    def get(self, request, negocio_id):
        query = "SELECT id, negocio_id, fecha, tasa_cambio, descripcion, plataforma, estado FROM lote WHERE negocio_id = %s ORDER BY fecha DESC"
        resultados = fetch_all(query, [negocio_id])
        return Response(resultados)

    def post(self, request, negocio_id):
        fecha = request.data.get("fecha")
        tasa_cambio = request.data.get("tasa_cambio")
        descripcion = request.data.get("descripcion")
        plataforma = request.data.get("plataforma")
        costo_retiro = request.data.get("costo_retiro", 0)

        query = """
            INSERT INTO lote (negocio_id, fecha, tasa_cambio, descripcion, plataforma, costo_retiro)
            OUTPUT INSERTED.id
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        parametros = [negocio_id, fecha, tasa_cambio, descripcion, plataforma, costo_retiro]
        lote_id = execute_insert(query, parametros)

        return Response({"mensaje": "Lote creado", "lote_id": lote_id})

class LoteDetalleView(APIView):
    def get(self, request, negocio_id, lote_id):
        query = "SELECT * FROM lote WHERE id = %s AND negocio_id = %s"
        lote = fetch_one(query, [lote_id, negocio_id])

        if lote is None:
            return Response({"error": "Lote no encontrado"}, status=404)

        query_productos = """
            SELECT lp.id AS lote_producto_id, lp.producto_id, lp.costo_usd, lp.costo,
                   lp.cantidad_comprada, lp.precio_sugerido,
                   p.nombre AS producto_nombre
              FROM lote_producto lp
              JOIN producto p ON lp.producto_id = p.id
             WHERE lp.lote_id = %s
             ORDER BY p.nombre
        """
        productos = fetch_all(query_productos, [lote_id])
        lote["productos"] = productos

        return Response(lote)

    def put(self, request, negocio_id, lote_id):
        fecha = request.data.get("fecha")
        tasa_cambio = request.data.get("tasa_cambio")
        descripcion = request.data.get("descripcion")
        plataforma = request.data.get("plataforma")
        costo_retiro = request.data.get("costo_retiro", 0)

        query = """UPDATE lote SET fecha = %s, tasa_cambio = %s, descripcion = %s, plataforma = %s, costo_retiro = %s
                   WHERE id = %s AND negocio_id = %s"""
        parametros = [fecha, tasa_cambio, descripcion, plataforma, costo_retiro, lote_id, negocio_id]

        filas_afectadas = execute_command(query, parametros)

        if filas_afectadas == 0:
            return Response({"error": "Lote no actualizado"}, status=404)

        return Response({"mensaje": "Lote actualizado"})

    def delete(self, request, negocio_id, lote_id):
        query = "DELETE FROM lote WHERE id = %s AND negocio_id = %s"
        filas_afectadas = execute_command(query, [lote_id, negocio_id])

        if filas_afectadas == 0:
            return Response({"error": "Lote no encontrado"}, status=404)

        return Response({"mensaje": "Lote eliminado"})

class LoteProductoView(APIView):
    def post(self, request, negocio_id, lote_id):
        producto_id = request.data.get("producto_id")
        costo_usd = request.data.get("costo_usd")
        cantidad_comprada = request.data.get("cantidad_comprada")
        precio_sugerido = request.data.get("precio_sugerido")

        lote = fetch_one("SELECT tasa_cambio FROM lote WHERE id = %s AND negocio_id = %s", [lote_id, negocio_id])
        if lote is None:
            return Response({"error": "Lote no encontrado"}, status=404)

        costo = None
        if costo_usd is not None:
            costo = float(costo_usd) * float(lote["tasa_cambio"])

        query = """
            INSERT INTO lote_producto (lote_id, producto_id, costo_usd, costo, cantidad_comprada, precio_sugerido)
            OUTPUT INSERTED.id
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        parametros = [lote_id, producto_id, costo_usd, costo, cantidad_comprada, precio_sugerido]
        lote_producto_id = execute_insert(query, parametros)

        return Response({"mensaje": "Producto agregado al lote", "lote_producto_id": lote_producto_id})

class LoteProductoDetalleView(APIView):
    def put(self, request, negocio_id, lote_id, lote_producto_id):
        costo_usd = request.data.get("costo_usd")
        cantidad_comprada = request.data.get("cantidad_comprada")
        precio_sugerido = request.data.get("precio_sugerido")

        lote = fetch_one("SELECT tasa_cambio FROM lote WHERE id = %s AND negocio_id = %s", [lote_id, negocio_id])
        if lote is None:
            return Response({"error": "Lote no encontrado"}, status=404)

        costo = None
        if costo_usd is not None:
            costo = float(costo_usd) * float(lote["tasa_cambio"])

        query = "UPDATE lote_producto SET costo_usd = %s, costo = %s, cantidad_comprada = %s, precio_sugerido = %s WHERE id = %s AND lote_id = %s"
        parametros = [costo_usd, costo, cantidad_comprada, precio_sugerido, lote_producto_id, lote_id]

        filas_afectadas = execute_command(query, parametros)

        if filas_afectadas == 0:
            return Response({"error": "Producto del lote no actualizado"}, status=404)

        return Response({"mensaje": "Producto del lote actualizado"})

    def delete(self, request, negocio_id, lote_id, lote_producto_id):
        query = "DELETE FROM lote_producto WHERE id = %s AND lote_id = %s"
        filas_afectadas = execute_command(query, [lote_producto_id, lote_id])

        if filas_afectadas == 0:
            return Response({"error": "Producto del lote no encontrado"}, status=404)

        return Response({"mensaje": "Producto del lote eliminado"})

class SugerenciaPrecioView(APIView):
    def post(self, request, negocio_id):
        costo_usd = request.data.get("costo_usd")
        lote_id = request.data.get("lote_id")

        if costo_usd is None or lote_id is None:
            return Response({"error": "Faltan datos"}, status=400)

        costo_usd = float(costo_usd)

        query = "SELECT tasa_cambio FROM lote WHERE id = %s AND negocio_id = %s"
        lote = fetch_one(query, [lote_id, negocio_id])

        if lote is None:
            return Response({"error": "Lote no encontrado"}, status=404)

        tasa_cambio = float(lote["tasa_cambio"])

        costo_unitario = costo_usd * tasa_cambio

        if costo_usd <= 1.50:
            multiplicador = 2.3
        elif costo_usd <= 2.50:
            multiplicador = 2.25
        elif costo_usd <= 4.00:
            multiplicador = 2.1
        else:
            multiplicador = 2.2

        packaging = 5000
        precio_sugerido = (round(costo_unitario) * multiplicador) + packaging

        respuesta = {
            "costo_unitario": costo_unitario,
            "multiplicador": multiplicador,
            "precio_sugerido": precio_sugerido,
        }
        return Response(respuesta)

class StockView(APIView):
    def get(self, request, negocio_id):
        query = """
            SELECT p.id AS producto_id,
                   p.nombre AS producto_nombre,
                   COALESCE(compras.total, 0) AS comprado,
                   COALESCE(ventas_total.total, 0) AS vendido,
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
             ORDER BY p.nombre
        """
        resultados = fetch_all(query, [negocio_id])
        return Response(resultados)

class InversionPorLoteView(APIView):
    def get(self, request, negocio_id):
        query_resumen = """
            SELECT l.id AS lote_id,
                   l.fecha,
                   l.descripcion,
                   l.tasa_cambio,
                   COALESCE(l.costo_retiro, 0) AS costo_retiro,
                   COUNT(lp.id) AS productos_distintos,
                   COALESCE(SUM(lp.cantidad_comprada), 0) AS unidades,
                   COALESCE(SUM(lp.costo * lp.cantidad_comprada), 0) AS inversion_productos_gs,
                   COALESCE(SUM(lp.costo_usd * lp.cantidad_comprada), 0) AS inversion_usd,
                   COALESCE(SUM(lp.costo * lp.cantidad_comprada), 0) + COALESCE(l.costo_retiro, 0) AS inversion_total_gs
              FROM lote l
              LEFT JOIN lote_producto lp ON lp.lote_id = l.id
             WHERE l.negocio_id = %s
             GROUP BY l.id, l.fecha, l.descripcion, l.tasa_cambio, l.costo_retiro
             ORDER BY l.fecha DESC
        """
        lotes = fetch_all(query_resumen, [negocio_id])

        for lote in lotes:
            unidades = lote["unidades"] or 0
            costo_retiro = float(lote["costo_retiro"] or 0)
            retiro_por_unidad = (costo_retiro / unidades) if unidades > 0 else 0

            query_detalle = """
                SELECT p.nombre AS producto,
                       lp.cantidad_comprada AS cantidad,
                       lp.costo_usd,
                       lp.costo AS costo_gs,
                       (lp.costo * lp.cantidad_comprada) AS subtotal_gs
                  FROM lote_producto lp
                  JOIN producto p ON p.id = lp.producto_id
                 WHERE lp.lote_id = %s
                 ORDER BY p.nombre
            """
            productos = fetch_all(query_detalle, [lote["lote_id"]])

            # Agregar costo real por producto (costo + prorrateo del retiro)
            for p in productos:
                costo_gs = float(p["costo_gs"] or 0)
                p["costo_real_unitario"] = costo_gs + retiro_por_unidad
                p["subtotal_real_gs"] = p["costo_real_unitario"] * (p["cantidad"] or 0)

            lote["productos"] = productos
            lote["retiro_por_unidad"] = retiro_por_unidad

        return Response(lotes)
    
NUMERO_WHATSAPP = "595992188322"

TEXTOS_NEGOCIO = {
    1: {"titulo": "Marué Dark", "subtitulo": "Joyería oscura y artículos de cuero hechos a mano"},
    2: {"titulo": "Marué", "subtitulo": "Catálogo de productos"},
    3: {"titulo": "Marué Lab", "subtitulo": "Cartucheras porta-cuchillos artesanales"},
}

class GenerarCatalogoView(APIView):
    def post(self, request, negocio_id):
        return self._generar(negocio_id)

    def get(self, request, negocio_id):
        return self._generar(negocio_id)

    def _generar(self, negocio_id):
        negocio = fetch_one("SELECT id, nombre FROM negocio WHERE id = %s", [negocio_id])
        if negocio is None:
            return Response({"error": "Negocio no encontrado"}, status=404)

        productos = self.obtener_productos_con_stock(negocio_id)
        if len(productos) == 0:
            return Response({"error": "No hay productos con stock disponible."}, status=400)

        html_catalogo = self.construir_html(negocio_id, negocio["nombre"], productos)
        respuesta = HttpResponse(html_catalogo, content_type="text/html; charset=utf-8")
        respuesta["Content-Disposition"] = 'attachment; filename="index.html"'
        return respuesta

    def obtener_productos_con_stock(self, negocio_id):
        query = """
            SELECT p.id, p.nombre, p.precio, p.imagen_url,
                   p.material, p.talla, p.descripcion,
                   c.nombre AS categoria_nombre,
                   COALESCE(compras.total, 0) - COALESCE(ventas_total.total, 0) AS stock
              FROM producto p
              LEFT JOIN categoria c ON c.id = p.categoria_id
              LEFT JOIN (SELECT producto_id, SUM(cantidad_comprada) AS total FROM lote_producto GROUP BY producto_id) compras ON compras.producto_id = p.id
              LEFT JOIN (SELECT producto_id, SUM(cantidad) AS total FROM venta_detalle GROUP BY producto_id) ventas_total ON ventas_total.producto_id = p.id
             WHERE p.negocio_id = %s
               AND p.estado = 'activo'
               AND p.en_catalogo = 1
             ORDER BY p.nombre
        """
        registros = fetch_all(query, [negocio_id])
        return [r for r in registros if (r.get("stock") or 0) > 0]

    def construir_html(self, negocio_id, nombre_negocio, productos):
        textos = TEXTOS_NEGOCIO.get(negocio_id, {"titulo": nombre_negocio, "subtitulo": "Catálogo de productos"})

        productos_publicos = []
        for p in productos:
            productos_publicos.append({
                "nombre": p.get("nombre") or "",
                "precio": self.formatear_guaranies(p.get("precio")),
                "material": p.get("material") or "",
                "talla": p.get("talla") or "",
                "descripcion": p.get("descripcion") or "",
                "foto": self.optimizar_cloudinary(p.get("imagen_url") or ""),
                "foto2": self.optimizar_cloudinary(p.get("imagen_url_2") or ""),
                "categoria": p.get("categoria_nombre") or "Otros",
            })

        productos_json = json.dumps(productos_publicos, ensure_ascii=False)

        return PLANTILLA_HTML.format(
            titulo=html_lib.escape(textos["titulo"]),
            subtitulo=html_lib.escape(textos["subtitulo"]),
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
        return "₲ " + f"{n:,}".replace(",", ".")

    def optimizar_cloudinary(self, url):
        if not url or "res.cloudinary.com" not in url or "/upload/" not in url:
            return url
        if "f_auto" in url:
            return url
        return url.replace("/upload/", "/upload/f_auto,q_auto,w_800,h_800,c_pad,b_auto/")

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
      --negro: #060506; --negro-2: #0b090b; --panel: #100d10;
      --borde: #241d24; --borde-luz: #3a2d38;
      --hueso: #e7e0e4; --hueso-tenue: #a99ea6; --ceniza: #6f6570;
      --vino: #7c3a4e; --vino-1: #8a3a50; --vino-2: #b06074;
      --wa-verde: #25d366;
    }}
    html {{ background: var(--negro); scrollbar-color: #2a2029 var(--negro); }}
    body {{
      font-family: "Jost", "Segoe UI", sans-serif;
      background: radial-gradient(ellipse at 50% -10%, #16101580 0%, transparent 60%), var(--negro);
      color: var(--hueso); -webkit-font-smoothing: antialiased; min-height: 100vh;
    }}
    body.modal-abierto {{ overflow: hidden; }}
    ::-webkit-scrollbar {{ width: 9px; }}
    ::-webkit-scrollbar-track {{ background: var(--negro); }}
    ::-webkit-scrollbar-thumb {{ background: #2a2029; border: 2px solid var(--negro); }}
    .wrap {{ max-width: 1100px; margin: 0 auto; padding: 2.5rem 1.1rem 4.5rem; }}
    .head {{ text-align: center; margin-bottom: 2.75rem; }}
    .head::after {{
      content: ""; display: block; width: 54px; height: 1px; margin: 1.15rem auto 0;
      background: linear-gradient(90deg, transparent, var(--vino-2), transparent);
    }}
    .head h1 {{
      font-family: "Cinzel", serif; font-weight: 600;
      font-size: clamp(1.7rem, 7vw, 2.9rem);
      letter-spacing: 0.16em; text-transform: uppercase; color: var(--hueso); line-height: 1.1;
    }}
    .head .sub {{
      font-family: "Cormorant Garamond", serif; font-style: italic;
      font-size: clamp(0.95rem, 3.5vw, 1.15rem); color: var(--hueso-tenue);
      margin-top: 0.7rem; letter-spacing: 0.02em;
    }}
    .buscador {{ display: flex; justify-content: center; margin-bottom: 1.4rem; }}
    .buscador input {{
      width: 100%; max-width: 380px; padding: 0.7rem 1rem;
      background: var(--panel); border: 1px solid var(--borde); border-radius: 2px;
      color: var(--hueso); font-family: "Jost", sans-serif; font-size: 0.9rem;
      letter-spacing: 0.03em; outline: none;
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }}
    .buscador input::placeholder {{ color: var(--ceniza); letter-spacing: 0.06em; }}
    .buscador input:focus {{ border-color: var(--vino-1); box-shadow: 0 0 0 1px var(--vino) inset; }}
    .filtros {{
      display: flex; flex-wrap: wrap; justify-content: center;
      gap: 0.4rem; margin-bottom: 1.6rem; padding: 0 0.5rem;
    }}
    .filtro-btn {{
      background: transparent; border: 1px solid var(--borde);
      color: var(--hueso-tenue); padding: 0.42rem 0.85rem;
      font-family: "Jost", sans-serif; font-size: 0.72rem;
      letter-spacing: 0.14em; text-transform: uppercase;
      cursor: pointer; border-radius: 2px;
      transition: all 160ms ease;
      -webkit-tap-highlight-color: transparent;
    }}
    .filtro-btn:hover {{ border-color: var(--vino-1); color: var(--hueso); }}
    .filtro-btn.activo {{ background: var(--vino); border-color: var(--vino); color: var(--hueso); }}
    .contador {{
      text-align: center; color: var(--ceniza); font-size: 0.72rem;
      letter-spacing: 0.22em; text-transform: uppercase; margin-bottom: 2.2rem;
    }}
    .grilla {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.85rem; }}
    @media (min-width: 620px) {{ .grilla {{ grid-template-columns: repeat(3, 1fr); gap: 1.2rem; }} }}
    @media (min-width: 900px) {{ .grilla {{ grid-template-columns: repeat(4, 1fr); }} }}
    .card {{
      position: relative; display: flex; flex-direction: column;
      background: linear-gradient(180deg, var(--panel) 0%, var(--negro-2) 100%);
      border: 1px solid var(--borde); border-radius: 2px; overflow: hidden;
      cursor: pointer; text-align: left; width: 100%; font: inherit; color: inherit;
      -webkit-tap-highlight-color: transparent;
      transition: border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
    }}
    .card::before {{
      content: ""; position: absolute; inset: 0; border: 1px solid transparent;
      pointer-events: none; transition: border-color 200ms ease; z-index: 2;
    }}
    .card:hover, .card:active, .card:focus-visible {{
      border-color: var(--borde-luz); transform: translateY(-3px);
      box-shadow: 0 10px 30px -12px #000, 0 0 22px -14px var(--vino-2); outline: none;
    }}
    .card:hover::before, .card:active::before, .card:focus-visible::before {{
      border-color: #5a3f4d55; inset: 5px;
    }}
    .foto {{ position: relative; width: 100%; aspect-ratio: 1 / 1; background: var(--negro-2); overflow: hidden; }}
    .foto img {{
      width: 100%; height: 100%; object-fit: cover; display: block;
      filter: saturate(0.92) contrast(1.04);
      transition: transform 450ms ease, filter 300ms ease;
    }}
    .card:hover .foto img, .card:active .foto img {{ transform: scale(1.05); filter: saturate(1) contrast(1.06); }}
    .foto::after {{
      content: ""; position: absolute; inset: 0;
      background: linear-gradient(180deg, transparent 55%, #060506d9 100%); pointer-events: none;
    }}
    .foto-vacia {{
      width: 100%; aspect-ratio: 1 / 1;
      background: repeating-linear-gradient(45deg, #0d0a0d 0 10px, #0a080a 10px 20px);
      display: flex; align-items: center; justify-content: center; color: var(--ceniza);
      font-family: "Cinzel", serif; font-size: 1.6rem; letter-spacing: 0.1em;
    }}
    .cuerpo {{ display: flex; flex-direction: column; gap: 0.4rem; padding: 0.75rem 0.8rem 0.85rem; flex-grow: 1; }}
    .nombre {{
      font-family: "Cormorant Garamond", serif; font-weight: 500; font-size: 1.02rem;
      line-height: 1.2; color: var(--hueso); letter-spacing: 0.01em;
    }}
    .meta {{ font-size: 0.68rem; color: var(--hueso-tenue); letter-spacing: 0.05em; line-height: 1.5; }}
    .meta b {{ color: var(--ceniza); font-weight: 400; }}
    .desc {{
      font-size: 0.7rem; color: var(--ceniza); line-height: 1.5;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }}
    .pie {{
      display: flex; align-items: center; justify-content: space-between; gap: 0.4rem;
      margin-top: auto; padding-top: 0.6rem; border-top: 1px solid var(--borde);
    }}
    .precio {{
      font-family: "Cinzel", serif; font-weight: 500; font-size: 0.92rem;
      color: var(--vino-2); letter-spacing: 0.03em; white-space: nowrap;
    }}
    .toque-detalle {{
      font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase;
      color: var(--hueso-tenue);
    }}
    .card:hover .toque-detalle, .card:active .toque-detalle {{ color: var(--vino-2); }}
    .vacio {{
      text-align: center; color: var(--ceniza); font-family: "Cormorant Garamond", serif;
      font-style: italic; font-size: 1.1rem; padding: 3.5rem 1rem;
    }}
    .footer {{
      text-align: center; color: #4d454d; font-size: 0.64rem;
      letter-spacing: 0.2em; text-transform: uppercase; margin-top: 3.5rem;
    }}

    /* MODAL DETALLE */
    .modal-fondo {{
      position: fixed; inset: 0; background: rgba(6, 5, 6, 0.92);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      z-index: 100; padding: 1rem;
      opacity: 0; visibility: hidden;
      transition: opacity 220ms ease, visibility 220ms ease;
    }}
    .modal-fondo.abierto {{ opacity: 1; visibility: visible; }}
    .modal-caja {{
      position: relative; max-width: 480px; width: 100%;
      max-height: 92vh; overflow-y: auto;
      background: linear-gradient(180deg, var(--panel) 0%, var(--negro-2) 100%);
      border: 1px solid var(--borde-luz); border-radius: 3px;
      transform: scale(0.96);
      transition: transform 220ms ease;
    }}
    .modal-fondo.abierto .modal-caja {{ transform: scale(1); }}
    .modal-cerrar {{
      position: absolute; top: 0.8rem; right: 0.8rem;
      width: 36px; height: 36px;
      background: rgba(6, 5, 6, 0.6);
      border: 1px solid var(--borde);
      color: var(--hueso); font-size: 1.4rem; line-height: 1;
      cursor: pointer; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      z-index: 2;
      -webkit-tap-highlight-color: transparent;
      transition: all 180ms ease;
    }}
    .modal-cerrar:hover {{ background: var(--vino); border-color: var(--vino); }}
    .modal-foto {{
      width: 100%; aspect-ratio: 1 / 1;
      background: var(--negro-2); overflow: hidden;
    }}
    .modal-foto img {{
      width: 100%; height: 100%; object-fit: cover; display: block;
    }}
    .modal-foto-vacia {{
      width: 100%; aspect-ratio: 1 / 1;
      background: repeating-linear-gradient(45deg, #0d0a0d 0 10px, #0a080a 10px 20px);
      display: flex; align-items: center; justify-content: center; color: var(--ceniza);
      font-family: "Cinzel", serif; font-size: 3rem; letter-spacing: 0.1em;
    }}
    .modal-miniaturas {{
      display: flex; gap: 0.5rem; padding: 0.7rem 1.3rem 0;
    }}
    .miniatura {{
      width: 60px; height: 60px; object-fit: cover;
      border: 1px solid var(--borde); border-radius: 2px;
      cursor: pointer; opacity: 0.5;
      transition: opacity 160ms ease, border-color 160ms ease;
      -webkit-tap-highlight-color: transparent;
    }}
    .miniatura:hover {{ opacity: 0.8; }}
    .miniatura.activa {{ opacity: 1; border-color: var(--vino-2); }}
    .modal-info {{ padding: 1.4rem 1.3rem 1.6rem; }}
    .modal-nombre {{
      font-family: "Cormorant Garamond", serif; font-weight: 500;
      font-size: 1.55rem; line-height: 1.15; color: var(--hueso);
      margin-bottom: 0.4rem;
    }}
    .modal-precio {{
      font-family: "Cinzel", serif; font-weight: 500;
      font-size: 1.35rem; color: var(--vino-2);
      letter-spacing: 0.03em; margin-bottom: 1rem;
    }}
    .modal-detalles {{
      display: flex; flex-direction: column; gap: 0.55rem;
      margin-bottom: 1.2rem;
      padding-top: 1rem; border-top: 1px solid var(--borde);
    }}
    .modal-detalle-item {{
      display: flex; gap: 0.6rem; font-size: 0.85rem;
    }}
    .modal-detalle-item b {{
      color: var(--hueso-tenue); font-weight: 400;
      min-width: 90px; text-transform: uppercase;
      font-size: 0.68rem; letter-spacing: 0.14em; padding-top: 0.15rem;
    }}
    .modal-detalle-item span {{ color: var(--hueso); }}
    .modal-descripcion {{
      color: var(--hueso-tenue); font-size: 0.92rem;
      line-height: 1.5; margin-bottom: 1.4rem;
      padding-top: 1rem; border-top: 1px solid var(--borde);
    }}
    .modal-btn-wa {{
      display: flex; align-items: center; justify-content: center;
      gap: 0.6rem; width: 100%;
      background: var(--wa-verde); color: #fff;
      border: none; border-radius: 3px;
      padding: 1rem 1.2rem;
      font-family: "Jost", sans-serif; font-weight: 500;
      font-size: 1rem; letter-spacing: 0.06em;
      cursor: pointer; text-decoration: none;
      -webkit-tap-highlight-color: transparent;
      transition: transform 160ms ease, box-shadow 160ms ease;
    }}
    .modal-btn-wa:hover {{
      transform: translateY(-1px);
      box-shadow: 0 8px 24px -8px rgba(37, 211, 102, 0.5);
    }}
    .modal-btn-wa svg {{ width: 22px; height: 22px; }}

    @media (min-width: 620px) {{
      .modal-info {{ padding: 1.8rem 1.7rem 2rem; }}
      .modal-nombre {{ font-size: 1.75rem; }}
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
    <div class="filtros" id="filtros"></div>
    <div class="contador" id="contador"></div>
    <div class="grilla" id="grilla"></div>
    <div class="vacio" id="vacio" style="display:none;">No se encontraron piezas.</div>
    <footer class="footer">Tienda 100% online. Realizamos delivery y envíos a todo el país. No contamos con local físico.</footer>
  </div>

  <!-- MODAL DE DETALLE -->
  <div class="modal-fondo" id="modal" role="dialog" aria-modal="true">
    <div class="modal-caja">
      <button class="modal-cerrar" id="modalCerrar" aria-label="Cerrar">&times;</button>
      <div id="modalContenido"></div>
    </div>
  </div>

  <script>
    var PRODUCTOS = {productos_json};
    var WHATSAPP = "{numero_whatsapp}";
    var grilla = document.getElementById("grilla");
    var vacio = document.getElementById("vacio");
    var contador = document.getElementById("contador");
    var inputBuscar = document.getElementById("buscar");
    var filtrosEl = document.getElementById("filtros");
    var modal = document.getElementById("modal");
    var modalContenido = document.getElementById("modalContenido");
    var modalCerrar = document.getElementById("modalCerrar");

    var categoriaActiva = "Todos";

    function escapar(t) {{
      var d = document.createElement("div");
      d.textContent = t == null ? "" : String(t);
      return d.innerHTML;
    }}

    function urlWhatsApp(p) {{
      var texto = "Hola! Me interesa esta pieza: " + p.nombre + " (" + p.precio + ")";
      return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(texto);
    }}

    var ICONO_WA =
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7.9-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4.2-.4.6-1.2.1-.2 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3A2.9 2.9 0 0 0 6.4 10a5 5 0 0 0 1.1 2.7 11.5 11.5 0 0 0 4.4 3.9c2 .8 2 .6 2.4.5a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c-.1-.1-.2-.2-.4-.3z"/>' +
      '</svg>';

    function cambiarFoto(elemento, url) {{
      var grande = document.getElementById("fotoGrande");
      if (grande) {{
        grande.src = url;
      }}
      var todas = document.querySelectorAll(".miniatura");
      for (var i = 0; i < todas.length; i++) {{
        todas[i].classList.remove("activa");
      }}
      elemento.classList.add("activa");
    }}

    function abrirModal(p) {{
      var foto;

      if (p.foto) {{
        foto = '<div class="modal-foto"><img id="fotoGrande" src="' + escapar(p.foto) + '" alt="' + escapar(p.nombre) + '" onerror="this.parentNode.outerHTML=\'<div class=modal-foto-vacia>M</div>\'"></div>';

        if (p.foto2) {{
          foto += '<div class="modal-miniaturas">' +
            '<img class="miniatura activa" src="' + escapar(p.foto) + '" alt="Vista 1" onclick="cambiarFoto(this, \'' + escapar(p.foto) + '\')">' +
            '<img class="miniatura" src="' + escapar(p.foto2) + '" alt="Vista 2" onclick="cambiarFoto(this, \'' + escapar(p.foto2) + '\')">' +
            '</div>';
        }}
      }} else {{
        foto = '<div class="modal-foto-vacia">M</div>';
      }}

      var detalles = "";
      if (p.material) {{
        detalles += '<div class="modal-detalle-item"><b>Material</b><span>' + escapar(p.material) + '</span></div>';
      }}
      if (p.talla) {{
        detalles += '<div class="modal-detalle-item"><b>Talla</b><span>' + escapar(p.talla) + '</span></div>';
      }}
      if (p.categoria) {{
        detalles += '<div class="modal-detalle-item"><b>Categoría</b><span>' + escapar(p.categoria) + '</span></div>';
      }}

      var descripcion = p.descripcion
        ? '<p class="modal-descripcion">' + escapar(p.descripcion) + '</p>'
        : '';

      modalContenido.innerHTML =
        foto +
        '<div class="modal-info">' +
          '<h2 class="modal-nombre">' + escapar(p.nombre) + '</h2>' +
          '<div class="modal-precio">' + escapar(p.precio) + '</div>' +
          (detalles ? '<div class="modal-detalles">' + detalles + '</div>' : '') +
          descripcion +
          '<a href="' + urlWhatsApp(p) + '" target="_blank" rel="noopener" class="modal-btn-wa">' +
            ICONO_WA + '<span>Consultar por WhatsApp</span>' +
          '</a>' +
        '</div>';

      modal.classList.add("abierto");
      document.body.classList.add("modal-abierto");
    }}

    function cerrarModal() {{
      modal.classList.remove("abierto");
      document.body.classList.remove("modal-abierto");
      setTimeout(function () {{ modalContenido.innerHTML = ""; }}, 240);
    }}

    modalCerrar.addEventListener("click", cerrarModal);
    modal.addEventListener("click", function (e) {{
      if (e.target === modal) cerrarModal();
    }});
    document.addEventListener("keydown", function (e) {{
      if (e.key === "Escape") cerrarModal();
    }});

    function tarjeta(p) {{
      var card = document.createElement("button");
      card.className = "card"; card.type = "button";
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
            '<span class="toque-detalle">Ver detalle</span>' +
          '</div>' +
        '</div>';
      card.addEventListener("click", function () {{ abrirModal(p); }});
      return card;
    }}

    function normalizar(t) {{
      return (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }}

    function construirFiltros() {{
      var ORDEN = ["Anillos", "Aros", "Cadenas", "Chokers", "Collares", "Conjuntos", "Dijes", "Llaveros", "Muñequeras", "Pendientes", "Pines", "Pulseras", "Soportes", "Otros"];
      var presentes = {{}};
      PRODUCTOS.forEach(function (p) {{ presentes[p.categoria || "Otros"] = true; }});
      var lista = ["Todos"];
      ORDEN.forEach(function (c) {{ if (presentes[c]) lista.push(c); }});
      Object.keys(presentes).forEach(function (c) {{
        if (lista.indexOf(c) === -1) lista.push(c);
      }});
      filtrosEl.innerHTML = "";
      lista.forEach(function (cat) {{
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "filtro-btn" + (cat === categoriaActiva ? " activo" : "");
        btn.textContent = cat;
        btn.addEventListener("click", function () {{
          categoriaActiva = cat;
          construirFiltros();
          aplicarFiltros();
        }});
        filtrosEl.appendChild(btn);
      }});
    }}

    function aplicarFiltros() {{
      var q = normalizar(inputBuscar.value);
      var filtrados = PRODUCTOS.filter(function (p) {{
        var coincideCat = categoriaActiva === "Todos" || (p.categoria || "Otros") === categoriaActiva;
        if (!coincideCat) return false;
        if (!q) return true;
        return normalizar(p.nombre).indexOf(q) !== -1 || normalizar(p.material).indexOf(q) !== -1;
      }});
      render(filtrados);
    }}

    function render(lista) {{
      grilla.innerHTML = "";
      if (lista.length === 0) {{
        vacio.style.display = "block"; contador.textContent = ""; return;
      }}
      vacio.style.display = "none";
      contador.textContent = lista.length + (lista.length === 1 ? " pieza" : " piezas");
      var frag = document.createDocumentFragment();
      lista.forEach(function (p) {{ frag.appendChild(tarjeta(p)); }});
      grilla.appendChild(frag);
    }}

    inputBuscar.addEventListener("input", aplicarFiltros);
    construirFiltros();
    aplicarFiltros();
  </script>
</body>
</html>
"""

class CuentasView(APIView):
    def get(self, request, negocio_id):
        # Trae cuentas del negocio + cuentas generales (negocio_id NULL)
        query = """
            SELECT c.id, c.negocio_id, c.nombre, c.tipo, c.saldo_inicial,
                   c.saldo_inicial
                   + COALESCE((SELECT SUM(m.monto) FROM movimiento m WHERE m.cuenta_id = c.id AND m.tipo = 'entrada'), 0)
                   - COALESCE((SELECT SUM(m.monto) FROM movimiento m WHERE m.cuenta_id = c.id AND m.tipo = 'salida'), 0)
                   + COALESCE((SELECT SUM(m.monto) FROM movimiento m WHERE m.cuenta_destino_id = c.id AND m.tipo = 'transferencia'), 0)
                   - COALESCE((SELECT SUM(m.monto) FROM movimiento m WHERE m.cuenta_id = c.id AND m.tipo = 'transferencia'), 0)
                   AS saldo_actual
              FROM cuenta c
             WHERE c.negocio_id = %s OR c.negocio_id IS NULL
             ORDER BY c.nombre
        """
        cuentas = fetch_all(query, [negocio_id])
        return Response(cuentas)

    def post(self, request, negocio_id):
        nombre = request.data.get("nombre")
        tipo = request.data.get("tipo", "banco")
        saldo_inicial = request.data.get("saldo_inicial", 0)

        query = """
            INSERT INTO cuenta (negocio_id, nombre, tipo, saldo_inicial, fecha_creacion)
            OUTPUT INSERTED.id
            VALUES (%s, %s, %s, %s, CAST(GETDATE() AS DATE))
        """
        cuenta_id = execute_insert(query, [negocio_id, nombre, tipo, saldo_inicial])
        return Response({"mensaje": "Cuenta creada", "cuenta_id": cuenta_id})

class MovimientosView(APIView):
    def get(self, request, negocio_id):
        # Movimientos de cuentas del negocio (o generales)
        cuenta_id = request.query_params.get("cuenta_id")

        if cuenta_id:
            query = """
                SELECT m.id, m.cuenta_id, m.tipo, m.monto, m.fecha, m.concepto,
                       m.referencia_tipo, m.referencia_id, m.cuenta_destino_id,
                       c.nombre AS cuenta_nombre,
                       cd.nombre AS cuenta_destino_nombre
                  FROM movimiento m
                  JOIN cuenta c ON c.id = m.cuenta_id
                  LEFT JOIN cuenta cd ON cd.id = m.cuenta_destino_id
                 WHERE m.cuenta_id = %s OR m.cuenta_destino_id = %s
                 ORDER BY m.fecha DESC, m.id DESC
            """
            movs = fetch_all(query, [cuenta_id, cuenta_id])
        else:
            query = """
                SELECT m.id, m.cuenta_id, m.tipo, m.monto, m.fecha, m.concepto,
                       m.referencia_tipo, m.referencia_id, m.cuenta_destino_id,
                       c.nombre AS cuenta_nombre,
                       cd.nombre AS cuenta_destino_nombre
                  FROM movimiento m
                  JOIN cuenta c ON c.id = m.cuenta_id
                  LEFT JOIN cuenta cd ON cd.id = m.cuenta_destino_id
                 WHERE c.negocio_id = %s OR c.negocio_id IS NULL
                 ORDER BY m.fecha DESC, m.id DESC
            """
            movs = fetch_all(query, [negocio_id])
        return Response(movs)

    def post(self, request, negocio_id):
        cuenta_id = request.data.get("cuenta_id")
        tipo = request.data.get("tipo")  # 'entrada', 'salida', 'transferencia'
        monto = request.data.get("monto")
        fecha = request.data.get("fecha")
        concepto = request.data.get("concepto")
        cuenta_destino_id = request.data.get("cuenta_destino_id")

        if tipo == "transferencia" and not cuenta_destino_id:
            return Response({"error": "Para transferencia hace falta la cuenta destino"}, status=400)

        query = """
            INSERT INTO movimiento (cuenta_id, tipo, monto, fecha, concepto, referencia_tipo, cuenta_destino_id)
            OUTPUT INSERTED.id
            VALUES (%s, %s, %s, %s, %s, 'manual', %s)
        """
        mov_id = execute_insert(query, [cuenta_id, tipo, monto, fecha, concepto, cuenta_destino_id])
        return Response({"mensaje": "Movimiento registrado", "mov_id": mov_id})
