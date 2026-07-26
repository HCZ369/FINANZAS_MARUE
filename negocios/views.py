from rest_framework.response import Response
from rest_framework.views import APIView
from core.db import fetch_all, execute_command


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