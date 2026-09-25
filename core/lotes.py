from core.db import fetch_one, execute_command


def sincronizar_gasto_de_lote(lote_id):
    """Crea o actualiza el gasto asociado a un lote.
    El monto es la suma de la mercaderia mas el costo de retiro."""

    if lote_id is None:
        return

    query_lote = """
        SELECT negocio_id,
               fecha,
               costo_retiro,
               descripcion
          FROM lote
         WHERE id = %s
    """
    lote = fetch_one(query_lote, [lote_id])

    if lote is None:
        return

    query_suma = """
        SELECT COALESCE(
            (SELECT SUM(COALESCE(costo, 0)
               FROM lote_producto
              WHERE lote_id = %s), 0) AS suma
    """
    fila_suma = fetch_one(query_suma, [lote_id])
    suma = fila_suma["suma"]

    costo_retiro = lote["costo_retiro"]
    total = suma + costo_retiro

    query_categoria = """
        SELECT id
          FROM categoria
         WHERE negocio_id = %s
           AND nombre = 'Mercaderia'
    """
    fila_categoria = fetch_one(query_categoria, [lote["negocio_id"]])

    if fila_categoria is None:
        categoria_id = None
    else:
        categoria_id = fila_categoria["id"]

    descripcion = "Lote " + str(lote_id) + " - " + str(lote["descripcion"])

    query_existente = "SELECT id FROM gasto WHERE lote_id = %s"
    gasto_existente = fetch_one(query_existente, [lote_id])

    if gasto_existente is not None:
        query_update = """
            UPDATE gasto
               SET negocio_id = %s,
                   categoria_id = %s,
                   monto = %s,
                   fecha = %s,
                   descripcion = %s
             WHERE id = %s
        """
        parametros_update = [
            lote["negocio_id"],
            categoria_id,
            total,
            lote["fecha"],
            descripcion,
            gasto_existente["id"],
        ]
        execute_command(query_update, parametros_update)
    else:
        query_insert = """
            INSERT INTO gasto (negocio_id, categoria_id, monto, fecha, descripcion, lote_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        parametros_insert = [
            lote["negocio_id"],
            categoria_id,
            total,
            lote["fecha"],
            descripcion,
            lote_id,
        ]
        execute_command(query_insert, parametros_insert)