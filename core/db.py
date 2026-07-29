from django.db import connection

def fetch_all(sql, params=None):
    """Ejecuta un select y devuelve una lista de diccionarios, uno por fila, con las columnas como clave"""
    if params is None:
        params = []
    cursor = connection.cursor()

    try:
        cursor.execute(sql, params)

        columnas = []

        for columna in cursor.description:
            nombre_columna = columna[0]
            columnas.append(nombre_columna)

        filas = cursor.fetchall()
        resultado = []

        for fila in filas:
            filas_diccionario = {}
            for posicion in range(len(columnas)):
                nombre_columna = columnas[posicion]
                valor = fila[posicion]
                filas_diccionario[nombre_columna] = valor
            resultado.append(filas_diccionario)
        return resultado
    finally:
        cursor.close()

def fetch_one(sql, params=None):
    """Ejecuta un select que espera un solo resultado. Devuelve un diccionario o None si no hay resultados"""

    resultados = fetch_all(sql, params)

    if len(resultados) == 0:
        return None

    primer_resultado = resultados[0]

    return primer_resultado

def execute_command(sql, params=None):
    """Ejecuta un insert, update, delete y devuelve la cantidad de filas afectadas"""

    if params is None:
        params = []

    cursor = connection.cursor()

    try:

        cursor.execute(sql, params)
        filas_afectadas = cursor.rowcount
        return filas_afectadas
    
    finally:

        if cursor:
            cursor.close()