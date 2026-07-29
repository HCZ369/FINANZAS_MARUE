from rest_framework.response import Response
from rest_framework.views import APIView
from core.db import fetch_all, execute_command, fetch_one

class CategoriasView(APIView):
    def get(self, request, negocio_id):

        query = "SELECT * FROM categoria WHERE negocio_id = %s"
        parametros = [negocio_id]

        categorias_obtenidas = fetch_all(query, parametros)

        return Response(categorias_obtenidas)

    def post(self, request, negocio_id):
        nombre = request.data.get("nombre")
        tipo = request.data.get("tipo")

        query = "INSERT INTO categoria (negocio_id, nombre, tipo) VALUES (%s, %s, %s)"
        parametros = [negocio_id, nombre, tipo]

        execute_command(query, parametros)

        return Response({"mensaje": "Categoria creada"})

class CategoriaDetalleView(APIView):
    def get(self, request, negocio_id, categoria_id):

        query = "SELECT * FROM categoria WHERE id = %s AND negocio_id = %s"

        parametros = [categoria_id, negocio_id]

        resultados = fetch_one(query, parametros)

        if resultados is None:
            return Response({"error": "Categoria no encontrada"}, status=404)

        return Response(resultados)

    def put(self, request, negocio_id, categoria_id):
        nombre = request.data.get("nombre")
        tipo = request.data.get("tipo")

        query = "UPDATE categoria SET nombre = %s, tipo = %s WHERE id = %s AND negocio_id = %s"
        parametros = [nombre, tipo, categoria_id, negocio_id]

        filas_afectadas = execute_command(query, parametros)

        if filas_afectadas == 0:
            return Response({"error": "Categoria no encontrada"}, status=404)

        return Response({"mensaje": "Categoria actualizada"})

    def delete(self, request, negocio_id, categoria_id):
        query = "DELETE FROM categoria WHERE id = %s and negocio_id = %s"
        parametros = [categoria_id, negocio_id]

        filas_afectadas = execute_command(query, parametros)

        if filas_afectadas == 0:
            return Response({"error": "Categoria no encontrada"}, status = 404)

        return Response({"mensaje": "Categoria eliminada"})

class InyeccionesView(APIView):
    def get(self, request, negocio_id):
        query = "SELECT * FROM inyeccion_capital WHERE negocio_id = %s"
        parametros = [negocio_id]
        resultados = fetch_all(query, parametros)

        return Response(resultados)

    def post(self, request, negocio_id):

        monto = request.data.get("monto")
        fecha = request.data.get("fecha")
        nota = request.data.get("nota")

        query = "INSERT INTO inyeccion_capital (negocio_id, monto, fecha, nota) VALUES (%s, %s, %s, %s)"
        parametros = [negocio_id, monto, fecha, nota]

        filas_afectadas = execute_command(query, parametros)

        if filas_afectadas == 0:
            return Response({"error": "No se realizo el registro de inyeccion"}, status = 400)

        return Response({"mensaje": "Inyeccion creada"})

class InyeccionDetalleView(APIView):
    def get(self, request, negocio_id, inyeccion_id):
        query = "SELECT * FROM inyeccion_capital WHERE id = %s AND negocio_id = %s"
        parametros = [inyeccion_id, negocio_id]

        registros = fetch_one(query, parametros)

        if registros is None:
            return Response({"error": "Inyeccion no encontrada"}, status=404)

        return Response(registros)

    def put(self, request, negocio_id, inyeccion_id):

        monto = request.data.get("monto")
        fecha = request.data.get("fecha")
        nota = request.data.get("nota")

        query = "UPDATE inyeccion_capital SET monto = %s, fecha = %s, nota = %s WHERE id = %s AND negocio_id = %s"
        parametros = [monto, fecha, nota, inyeccion_id, negocio_id]

        filas_afectadas = execute_command(query, parametros)

        if filas_afectadas == 0:
            return Response({"error": "Inyeccion no actualizada"}, status = 404)

        return Response({"mensaje": "Inyeccion actualizada"})

    def delete(self, request, negocio_id, inyeccion_id):
        query = "DELETE FROM inyeccion_capital WHERE id = %s AND negocio_id = %s"
        parametros = [inyeccion_id, negocio_id]

        filas_afectadas = execute_command(query, parametros)
        
        if filas_afectadas == 0:
            return Response({"error": "Inyeccion no eliminada"}, status = 404)

        return Response({"mensaje": "Inyeccion eliminada"})
        