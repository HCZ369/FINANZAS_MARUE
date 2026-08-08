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

class EvolucionMensualView(APIView):
    def get(self, request, negocio_id):
        query = """
            SELECT YEAR(fecha) as anio,
                   MONTH(fecha) as mes,
                   SUM(monto) as total
              FROM gasto
             WHERE negocio_id = %s
             GROUP BY YEAR(fecha), MONTH(fecha) 
             ORDER BY YEAR(fecha), MONTH(fecha)
        """
        parametros = [negocio_id]
        resultados = fetch_all(query, parametros)

        return Response(resultados)

class TotalesView(APIView):
    def get(self, request, negocio_id):
        query = """
            SELECT
                (SELECT ISNULL(SUM(monto), 0) FROM inyeccion_capital WHERE negocio_id = %s) AS inyecciones,
                (SELECT ISNULL(SUM(monto_total), 0) FROM venta WHERE negocio_id = %s) AS ventas,
                (SELECT ISNULL(SUM(monto), 0) FROM gasto WHERE negocio_id = %s) AS gastos,
                (SELECT COUNT(*) FROM producto WHERE negocio_id = %s) AS cantidad_productos,
                (SELECT COUNT(*) FROM cliente WHERE negocio_id = %s) AS cantidad_clientes,
                (SELECT COUNT(*) FROM venta WHERE negocio_id = %s) AS cantidad_ventas
        """
        parametros = [negocio_id, negocio_id, negocio_id, negocio_id, negocio_id, negocio_id]
        resultado = fetch_one(query, parametros)
        resultado["saldo"] = resultado["inyecciones"] + resultado["ventas"] - resultado["gastos"]
        return Response(resultado)

class ProductosMasVendidosView(APIView):
    def get(self, request, negocio_id):
        query = """
            SELECT producto.id AS producto_id,
                   producto.nombre AS producto_nombre,
                   SUM(venta_detalle.cantidad) AS unidades_vendidas,
                   SUM(venta_detalle.subtotal) AS total_vendido
            FROM venta_detalle
            JOIN venta ON venta_detalle.venta_id = venta.id
            JOIN producto ON venta_detalle.producto_id = producto.id
            WHERE venta.negocio_id = %s
            GROUP BY producto.id, producto.nombre
            ORDER BY unidades_vendidas DESC
        """
        parametros = [negocio_id]
        resultados = fetch_all(query, parametros)
        return Response(resultados[:5])