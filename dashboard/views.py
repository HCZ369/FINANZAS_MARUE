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

class ProyeccionVsRealidadView(APIView):
    def get(self, request, negocio_id):
        query_ventas = """
            SELECT FORMAT(fecha, 'yyyy-MM') AS mes, 
                   SUM(monto_total) AS venta_real
              FROM venta
             WHERE negocio_id = %s
             GROUP BY FORMAT(fecha, 'yyyy-MM')
        """
        parametros = [negocio_id]
        ventas_por_mes = fetch_all(query_ventas, parametros)

        query_inyecciones = """
            SELECT FORMAT(fecha, 'yyyy-MM') as mes,
                   SUM(monto) as inyeccion
              FROM inyeccion_capital
             WHERE negocio_id = %s
             GROUP BY FORMAT(fecha, 'yyyy-MM')
        """
        inyecciones_por_mes = fetch_all(query_inyecciones, parametros)

        #Paso las inyecciones a un diccionario para buscarlas por mes
        inyeccion_de_mes = {}
        for fila in inyecciones_por_mes:
            inyeccion_de_mes[fila["mes"]] = fila["inyeccion"]

        #Paso las ventas reales a un diccionario tambien
        venta_de_mes = {}
        for fila in ventas_por_mes:
            venta_de_mes[fila["mes"]] = fila["venta_real"]

        #Junto todos los meses que aparecen en las dos fuentes
        meses = set()
        for mes in inyeccion_de_mes:
            meses.add(mes)
        for mes in venta_de_mes:
            meses.add(mes)

        meses_ordenados = sorted(meses)

        #Recorro mes a mes armando la proyeccion
        resultado = []
        capital_operativo = 0

        
        for mes in meses_ordenados:
            inyeccion = inyeccion_de_mes.get(mes, 0)
            capital_operativo = capital_operativo + inyeccion

            proyeccion_venta = capital_operativo * 2

            venta_real = venta_de_mes.get(mes, 0)

            brecha = venta_real - proyeccion_venta

            fila_resultado = {
                "mes": mes,
                "capital_operativo": capital_operativo,
                "proyeccion_venta": proyeccion_venta,
                "venta_real": venta_real,
                "brecha": brecha,
            }
            resultado.append(fila_resultado)

            # Preparo el capital del mes siguiente: la reposicion es la mitad de lo vendido esperado
            capital_operativo = proyeccion_venta / 2

        return Response(resultado)