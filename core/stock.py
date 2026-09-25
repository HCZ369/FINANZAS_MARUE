from core.db import fetch_one

def stock_de_producto(producto_id):
    if producto_id is None:
        return 0

    query = """
        SELECT ISNULL((SELECT SUM(CANTIDAD_COMPRADA)
          FROM LOTE_PRODUCTO
         WHERE PRODUCTO_ID = %s), 0) 
         - 
         ISNULL((SELECT SUM(CANTIDAD) 
            FROM VENTA_DETALLE
           WHERE PRODUCTO_ID = %s), 0) as stock
        """
    parametros = [producto_id, producto_id]

    resultado = fetch_one(query, parametros)

    if resultado is None:
        return 0
    
    return int(resultado["stock"])
