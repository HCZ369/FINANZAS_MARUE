from rest_framework.response import Response
from rest_framework.views import APIView
from core.db import fetch_all, execute_command, fetch_one


class NegociosView(APIView):
    def get(self, request):
        query = "SELECT * FROM negocio"
        negocios = fetch_all(query)
        return Response(negocios)

    def post(self, request):
        nombre = request.data.get("nombre")
        query = "INSERT INTO negocio (nombre) VALUES (%s)"
        execute_command(query, [nombre])
        return Response({"mensaje": "Negocio creado"})

class NegocioDetalleView(APIView):
    def get(self, request, negocio_id):
        query = "SELECT  * FROM negocio where id = %s"
        negocio = fetch_one(query, [negocio_id])
        if negocio is None:
            return Response({"error": "Negocio no encontrado"}, status=404)
        return Response(negocio)

    def put(self, request, negocio_id):
        nombre = request.data.get("nombre")

        query = "UPDATE negocio SET nombre = %s WHERE id = %s"
        parametros = [nombre, negocio_id]

        filas_afectadas = execute_command(query, parametros)

        if filas_afectadas == 0:
            return Response({"error": "Negocio no encontrado"}, status=404)
        return Response({"mensaje": "Negocio actualizado"})

    def delete(self, request, negocio_id):

        query = "DELETE FROM negocio WHERE id = %s"
        parametros = [negocio_id]

        filas_afectadas = execute_command(query, parametros)

        if filas_afectadas == 0:
            return Response({"error": "Negocio no encontrado"}, status=404)
        return Response({"mensaje": "Negocio eliminado"})

class SetupTablasView(APIView):
    def get(self, request):
        comandos = [
            """CREATE TABLE IF NOT EXISTS negocio (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(200) NOT NULL,
                fecha_creacion DATE DEFAULT CURRENT_DATE
            )""",
            """CREATE TABLE IF NOT EXISTS categoria (
                id SERIAL PRIMARY KEY,
                negocio_id INT NOT NULL,
                nombre VARCHAR(200) NOT NULL,
                tipo VARCHAR(50) NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS inyeccion_capital (
                id SERIAL PRIMARY KEY,
                negocio_id INT NOT NULL,
                monto DECIMAL(14,2) NOT NULL,
                fecha DATE NOT NULL,
                nota VARCHAR(300)
            )""",
            """CREATE TABLE IF NOT EXISTS cliente (
                id SERIAL PRIMARY KEY,
                negocio_id INT NOT NULL,
                nombre VARCHAR(200) NOT NULL,
                contacto VARCHAR(100),
                fecha_nacimiento DATE,
                correo VARCHAR(200),
                ruc VARCHAR(50)
            )""",
            """CREATE TABLE IF NOT EXISTS lote (
                id SERIAL PRIMARY KEY,
                negocio_id INT NOT NULL,
                fecha DATE NOT NULL,
                tasa_cambio DECIMAL(12,2) NOT NULL,
                descripcion VARCHAR(200)
            )""",
            """CREATE TABLE IF NOT EXISTS producto (
                id SERIAL PRIMARY KEY,
                negocio_id INT NOT NULL,
                nombre VARCHAR(200) NOT NULL,
                precio DECIMAL(14,2),
                costo DECIMAL(14,2),
                lote_id INT,
                costo_usd DECIMAL(12,2),
                cantidad_comprada INT
            )""",
            """CREATE TABLE IF NOT EXISTS venta (
                id SERIAL PRIMARY KEY,
                negocio_id INT NOT NULL,
                cliente_id INT,
                fecha DATE NOT NULL,
                monto_total DECIMAL(14,2) DEFAULT 0
            )""",
            """CREATE TABLE IF NOT EXISTS venta_detalle (
                id SERIAL PRIMARY KEY,
                venta_id INT NOT NULL,
                producto_id INT NOT NULL,
                cantidad INT NOT NULL,
                precio_unitario DECIMAL(14,2) NOT NULL,
                subtotal DECIMAL(14,2) NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS gasto (
                id SERIAL PRIMARY KEY,
                negocio_id INT NOT NULL,
                categoria_id INT,
                monto DECIMAL(14,2) NOT NULL,
                fecha DATE NOT NULL,
                descripcion VARCHAR(300)
            )""",
        ]

        for comando in comandos:
            execute_command(comando)

        return Response({"mensaje": "Tablas creadas"})