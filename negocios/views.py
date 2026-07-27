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

        execute_command(query, parametros)

        filas_afectadas = execute_command.rowcount
        if filas_afectadas == 0:
            return Response({"error": "Negocio no encontrado"}, status=404)
        return Response({"mensaje": "Negocio actualizado"})

    def delete(self, request, negocio_id):

        query = "DELETE FROM negocio WHERE id = %s"
        parametros = [negocio_id]

        execute_command(query, parametros)
        
        filas_afectadas = execute_command.rowcount
        if filas_afectadas == 0:
            return Response({"error": "Negocio no encontrado"}, status=404)
        return Response({"mensaje": "Negocio eliminad"})