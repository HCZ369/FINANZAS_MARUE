from rest_framework.response import Response
from rest_framework.views import APIView
from core.db import fetch_all, fetch_one, execute_command, execute_insert
from django.db import transaction


class ClientesView(APIView):
    def get(self, request, negocio_id):
        query = "SELECT * FROM cliente WHERE negocio_id = %s"
        registros = fetch_all(query, [negocio_id])
        return Response(registros)

    def post(self, request, negocio_id):
        nombre = request.data.get("nombre")
        contacto = request.data.get("contacto")
        fecha_nacimiento = request.data.get("fecha_nacimiento")
        correo = request.data.get("correo")
        ruc = request.data.get("ruc")

        query = "INSERT INTO cliente (negocio_id, nombre, contacto, fecha_nacimiento, correo, ruc) VALUES (%s, %s, %s, %s, %s, %s)"
        parametros = [negocio_id, nombre, contacto, fecha_nacimiento, correo, ruc]

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
        contacto = request.data.get("contacto")
        fecha_nacimiento = request.data.get("fecha_nacimiento")
        correo = request.data.get("correo")
        ruc = request.data.get("ruc")

        query = "UPDATE cliente SET nombre = %s, contacto = %s, fecha_nacimiento = %s, correo = %s, ruc = %s WHERE id = %s AND negocio_id = %s"
        parametros = [nombre, contacto, fecha_nacimiento, correo, ruc, cliente_id, negocio_id]

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
        query = "SELECT id, negocio_id, nombre, precio, costo, lote_id, costo_usd, cantidad_comprada FROM producto WHERE negocio_id = %s"
        registros = fetch_all(query, [negocio_id])
        return Response(registros)

    def post(self, request, negocio_id):
        nombre = request.data.get("nombre")
        precio = request.data.get("precio")
        costo = request.data.get("costo")
        lote_id = request.data.get("lote_id")
        costo_usd = request.data.get("costo_usd")
        cantidad_comprada = request.data.get("cantidad_comprada")

        query = "INSERT INTO producto (negocio_id, nombre, precio, costo, lote_id, costo_usd, cantidad_comprada) VALUES (%s, %s, %s, %s, %s, %s, %s)"
        parametros = [negocio_id, nombre, precio, costo, lote_id, costo_usd, cantidad_comprada]

        filas_afectadas = execute_command(query, parametros)

        if filas_afectadas == 0:
            return Response({"error": "No se registro el producto"}, status=400)

        return Response({"mensaje": "Producto creado"})


class ProductoDetalleView(APIView):
    def get(self, request, negocio_id, producto_id):
        query = "SELECT * FROM producto WHERE id = %s AND negocio_id = %s"
        producto = fetch_one(query, [producto_id, negocio_id])

        if producto is None:
            return Response({"error": "Producto no encontrado"}, status=404)

        return Response(producto)

    def put(self, request, negocio_id, producto_id):
        nombre = request.data.get("nombre")
        precio = request.data.get("precio")
        costo = request.data.get("costo")
        lote_id = request.data.get("lote_id")
        costo_usd = request.data.get("costo_usd")
        cantidad_comprada = request.data.get("cantidad_comprada")

        query = "UPDATE producto SET nombre = %s, precio = %s, costo = %s, lote_id = %s, costo_usd = %s, cantidad_comprada = %s WHERE id = %s AND negocio_id = %s"
        parametros = [nombre, precio, costo, lote_id, costo_usd, cantidad_comprada, producto_id, negocio_id]

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
        productos = request.data.get("productos")

        try:
            with transaction.atomic():
                venta_id = self.crear_venta(negocio_id, cliente_id, fecha, productos)
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

    def crear_venta(self, negocio_id, cliente_id, fecha, productos):
        query = "INSERT INTO venta (negocio_id, cliente_id, fecha, monto_total) VALUES (%s, %s, %s, %s) RETURNING id"
        venta_id = execute_insert(query, [negocio_id, cliente_id, fecha, 0])

        monto_acumulado = 0
        for producto_item in productos:
            producto_id = producto_item.get("producto_id")
            cantidad = producto_item.get("cantidad")

            query_precio = "SELECT precio FROM producto WHERE id = %s"
            precio_producto = fetch_one(query_precio, [producto_id])
            precio = precio_producto["precio"]
            subtotal = precio * cantidad

            query_detalle = "INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (%s, %s, %s, %s, %s)"
            execute_command(query_detalle, [venta_id, producto_id, cantidad, precio, subtotal])

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
                SELECT producto.nombre AS nombre,
                       COALESCE(producto.cantidad_comprada, 0) - COALESCE(SUM(venta_detalle.cantidad), 0) AS stock
                  FROM producto
                  LEFT JOIN venta_detalle ON venta_detalle.producto_id = producto.id
                 WHERE producto.id = %s
                 GROUP BY producto.nombre, producto.cantidad_comprada
            """
            resultado = fetch_one(query_stock, [producto_id])
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
        productos = request.data.get("productos")

        try:
            with transaction.atomic():
                self.actualizar_venta(negocio_id, venta_id, cliente_id, fecha, productos)
        except Exception as error:
            return Response({"error": "No se pudo actualizar la venta"}, status=400)

        monto_total = self.calcular_monto(venta_id)
        avisos = self.revisar_stock(productos)

        return Response({
            "mensaje": "Venta actualizada",
            "monto_total": monto_total,
            "avisos": avisos,
        })

    def actualizar_venta(self, negocio_id, venta_id, cliente_id, fecha, productos):
        query_venta = "UPDATE venta SET cliente_id = %s, fecha = %s WHERE id = %s AND negocio_id = %s"
        execute_command(query_venta, [cliente_id, fecha, venta_id, negocio_id])

        query_borrar = "DELETE FROM venta_detalle WHERE venta_id = %s"
        execute_command(query_borrar, [venta_id])

        monto_acumulado = 0
        for producto_item in productos:
            producto_id = producto_item.get("producto_id")
            cantidad = producto_item.get("cantidad")

            query_precio = "SELECT precio FROM producto WHERE id = %s"
            precio_producto = fetch_one(query_precio, [producto_id])
            precio = precio_producto["precio"]
            subtotal = precio * cantidad

            query_detalle = "INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (%s, %s, %s, %s, %s)"
            execute_command(query_detalle, [venta_id, producto_id, cantidad, precio, subtotal])

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
                SELECT producto.nombre AS nombre,
                       COALESCE(producto.cantidad_comprada, 0) - COALESCE(SUM(venta_detalle.cantidad), 0) AS stock
                  FROM producto
                  LEFT JOIN venta_detalle ON venta_detalle.producto_id = producto.id
                 WHERE producto.id = %s
                 GROUP BY producto.nombre, producto.cantidad_comprada
            """
            resultado = fetch_one(query_stock, [producto_id])
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
        query = "SELECT id, negocio_id, fecha, tasa_cambio, descripcion FROM lote WHERE negocio_id = %s ORDER BY fecha DESC"
        resultados = fetch_all(query, [negocio_id])
        return Response(resultados)

    def post(self, request, negocio_id):
        fecha = request.data.get("fecha")
        tasa_cambio = request.data.get("tasa_cambio")
        descripcion = request.data.get("descripcion")

        query = "INSERT INTO lote (negocio_id, fecha, tasa_cambio, descripcion) VALUES (%s, %s, %s, %s)"
        parametros = [negocio_id, fecha, tasa_cambio, descripcion]

        filas_afectadas = execute_command(query, parametros)

        if filas_afectadas == 0:
            return Response({"error": "No se registro el lote"}, status=400)

        return Response({"mensaje": "Lote creado"})


class LoteDetalleView(APIView):
    def put(self, request, negocio_id, lote_id):
        fecha = request.data.get("fecha")
        tasa_cambio = request.data.get("tasa_cambio")
        descripcion = request.data.get("descripcion")

        query = "UPDATE lote SET fecha = %s, tasa_cambio = %s, descripcion = %s WHERE id = %s AND negocio_id = %s"
        parametros = [fecha, tasa_cambio, descripcion, lote_id, negocio_id]

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

        precio_sugerido = round(costo_unitario) * multiplicador

        respuesta = {
            "costo_unitario": costo_unitario,
            "multiplicador": multiplicador,
            "precio_sugerido": precio_sugerido,
        }
        return Response(respuesta)


class StockView(APIView):
    def get(self, request, negocio_id):
        query = """
                SELECT producto.id AS producto_id,
                       producto.nombre AS producto_nombre,
                       COALESCE(producto.cantidad_comprada, 0) AS comprado,
                       COALESCE(SUM(venta_detalle.cantidad), 0) AS vendido,
                       COALESCE(producto.cantidad_comprada, 0) - COALESCE(SUM(venta_detalle.cantidad), 0) AS stock
                  FROM producto
                  LEFT JOIN venta_detalle ON venta_detalle.producto_id = producto.id
                 WHERE producto.negocio_id = %s
                 GROUP BY producto.id, producto.nombre, producto.cantidad_comprada
                 ORDER BY producto.nombre
                """
        resultados = fetch_all(query, [negocio_id])
        return Response(resultados)