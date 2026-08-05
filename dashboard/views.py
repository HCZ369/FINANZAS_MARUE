from rest_framework.response import Response
from rest_framework.views import APIView
from core.db import fetch_all, execute_command, fetch_one

class GastosPorCategoriaView(APIView):
    def get(self, request, negocio_id):
        query = """ SELECT categoria.id AS categoria_id,
                           categoria.nombre AS categoria_nombre,
                           SUM(gasto.monto) AS total
                    FROM gasto
                    JOIN categoria ON gasto.categoria_id = categoria.id
                    WHERE gasto.negocio_id = %s
                    GROUP BY categoria.id, categoria.nombre """
        parametros = [negocio_id]
        resultados = fetch_all(query, parametros)
        return Response(resultados)