from rest_framework.response import Response
from rest_framework.views import APIView
from core.db import fetch_all, fetch_one, execute_command, execute_insert
from django.db import transaction


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
            SELECT p.id, p.negocio_id, p.nombre, p.precio, p.imagen_url, p.estado,
                   COALESCE(compras.total, 0) AS cantidad_comprada,
                   COALESCE(ventas_total.total, 0) AS cantidad_vendida,
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
        registros = fetch_all(query, [negocio_id])
        return Response(registros)

    def post(self, request, negocio_id):
        nombre = request.data.get("nombre")
        precio = request.data.get("precio")
        imagen_url = request.data.get("imagen_url")
        categoria_id = request.data.get("categoria_id")
        descripcion = request.data.get("descripcion")

        query = """
            INSERT INTO producto (negocio_id, nombre, precio, imagen_url, categoria_id, descripcion)
            OUTPUT INSERTED.id
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        parametros = [negocio_id, nombre, precio, imagen_url, categoria_id, descripcion]
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
        categoria_id = request.data.get("categoria_id")
        descripcion = request.data.get("descripcion")

        query = "UPDATE producto SET nombre = %s, precio = %s, imagen_url = %s, categoria_id = %s, descripcion = %s WHERE id = %s AND negocio_id = %s"
        parametros = [nombre, precio, imagen_url, categoria_id, descripcion, producto_id, negocio_id]

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

        query = """
            INSERT INTO lote (negocio_id, fecha, tasa_cambio, descripcion, plataforma)
            OUTPUT INSERTED.id
            VALUES (%s, %s, %s, %s, %s)
        """
        parametros = [negocio_id, fecha, tasa_cambio, descripcion, plataforma]
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

        query = "UPDATE lote SET fecha = %s, tasa_cambio = %s, descripcion = %s, plataforma = %s WHERE id = %s AND negocio_id = %s"
        parametros = [fecha, tasa_cambio, descripcion, plataforma, lote_id, negocio_id]

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