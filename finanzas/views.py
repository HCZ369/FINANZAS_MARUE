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
        nombre = request.data.get("nombre")
        tipo = request.data.get("tipo")

        query = "DELETE FROM categoria WHERE id = %s and negocio_id = %s"
        parametros = [categoria_id, negocio_id]

        filas_afectadas = execute_command(query, parametros)

        if filas_afectadas == 0:
            return Response({"error": "Categoria no encontrada"}, status = 404)

        return Response({"mensaje": "Categoria eliminada"})



    
