from rest_framework.response import Response
from rest_framework.views import APIView
from core.db import fetch_all, fetch_one, execute_command, execute_insert

class ClientesView(APIView):
    def get(self, request, negocio_id):

        query = "SELECT * FROM cliente WHERE negocio_id = %s"
        parametros = [negocio_id]

        registros = fetch_all(query, parametros)

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
            return Response({"error": "No se registro al cliente"}, status = 400)

        return Response({"mensaje": "Cliente registrado"})

class ClienteDetalleView(APIView):
    def get(self, request, negocio_id, cliente_id):
        query = "SELECT * FROM cliente WHERE id = %s AND negocio_id = %s"
        parametros = [cliente_id, negocio_id]
        cliente = fetch_one(query, parametros)
        if cliente is None:
            return Response({"error": "Cliente no encontrado"}, status = 404)
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
            return Response({"error": "Cliente no actualizado"}, status = 404)

        return Response({"mensaje": "Cliente actualizado"})

    def delete(self, request, negocio_id, cliente_id):
        query = "DELETE FROM cliente WHERE id = %s AND negocio_id = %s"
        parametros = [cliente_id, negocio_id]

        registros = execute_command(query, parametros)
        
        if registros == 0:
            return Response({"error": "Cliente no eliminado"}, status = 404)

        return Response({"mensaje": "Cliente eliminado"})

class ProductosView(APIView):
    def get(self, request, negocio_id):
        query = "SELECT * FROM producto WHERE negocio_id = %s"
        parametros = [negocio_id]

        registros = fetch_all(query, parametros)

        return Response(registros)

    def post(self, request, negocio_id):
        nombre = request.data.get("nombre")
        precio = request.data.get("precio")

        query = "INSERT INTO producto (negocio_id, nombre, precio) VALUES (%s, %s, %s)"
        parametros = [negocio_id, nombre, precio]

        filas_afectadas = execute_command(query, parametros)

        if filas_afectadas == 0:
            return Response({"error": "No se registro el producto"}, status=400)

        return Response({"mensaje": "Producto creado"})


class ProductoDetalleView(APIView):
    def get(self, request, negocio_id, producto_id):
        query = "SELECT * FROM producto WHERE id = %s AND negocio_id = %s"
        parametros = [producto_id, negocio_id]

        producto = fetch_one(query, parametros)

        if producto is None:
            return Response({"error": "Producto no encontrado"}, status=404)

        return Response(producto)

    def put(self, request, negocio_id, producto_id):
        nombre = request.data.get("nombre")
        precio = request.data.get("precio")

        query = "UPDATE producto SET nombre = %s, precio = %s WHERE id = %s AND negocio_id = %s"
        parametros = [nombre, precio, producto_id, negocio_id]

        filas_afectadas = execute_command(query, parametros)

        if filas_afectadas == 0:
            return Response({"error": "Producto no actualizado"}, status=404)

        return Response({"mensaje": "Producto actualizado"})

    def delete(self, request, negocio_id, producto_id):
        query = "DELETE FROM producto WHERE id = %s AND negocio_id = %s"
        parametros = [producto_id, negocio_id]

        filas_afectadas = execute_command(query, parametros)

        if filas_afectadas == 0:
            return Response({"error": "Producto no eliminado"}, status=404)

        return Response({"mensaje": "Producto eliminado"})

class VentasView(APIView):
    def get(self, request, negocio_id):
        query = "SELECT * FROM venta WHERE negocio_id = %s"
        parametros = [negocio_id]
        registros = fetch_all(query, parametros)
        return Response(registros)
    
    def post(self, request, negocio_id):

        cliente_id = request.data.get("cliente_id")
        fecha = request.data.get("fecha")
        productos = request.data.get("productos")
        monto_total = 0

        query = "INSERT INTO venta (negocio_id, cliente_id, fecha, monto_total) OUTPUT INSERTED.id VALUES (%s, %s, %s, %s)"
        parametros = [negocio_id, cliente_id, fecha, monto_total]

        venta_id = execute_insert(query, parametros)

        monto_acumulado = 0

        for producto_item in productos:
            producto_id = producto_item.get("producto_id")
            cantidad = producto_item.get("cantidad")
            query = "SELECT precio FROM producto WHERE id = %s"
            parametros = [producto_id]
            precio_producto = fetch_one(query, parametros)
            subtotal = precio_producto["precio"] * cantidad

            query_detalle = "INSERT INTO venta_detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (%s, %s, %s, %s, %s)"
            parametros_detalle = [venta_id, producto_id, cantidad, precio_producto["precio"], subtotal]
            execute_command(query_detalle, parametros_detalle)

            monto_acumulado += subtotal

        query_update = "UPDATE venta SET monto_total = %s WHERE id = %s"
        parametro_update = [monto_acumulado, venta_id]

        execute_command(query_update, parametro_update)

        return Response({"mensaje": "Venta creada", "venta_id": venta_id, "monto_total": monto_acumulado})

class VentaDetalleView(APIView):
    def get(self, request, negocio_id, venta_id):
        query = "SELECT * FROM venta WHERE id = %s AND negocio_id = %s"
        parametros = [venta_id, negocio_id]

        venta = fetch_one(query, parametros)

        if venta is None:
            return Response({"error": "Venta no encontrada"}, status = 404)
        
        query_detalle = "SELECT * FROM venta_detalle WHERE venta_id = %s"

        parametros_detalle = [venta_id]
        detalles = fetch_all(query_detalle, parametros_detalle)

        venta["productos"] = detalles

        return Response(venta)