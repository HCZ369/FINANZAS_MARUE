"""
Migración Render Postgres → Neon
Ejecutar desde el venv que tiene psycopg2-binary instalado:
    python migrar_a_neon.py
"""

import psycopg2

# ============================================
# CONFIGURAR ESTAS DOS URLs
# ============================================
ORIGEN = "postgresql://gestionfinanciera_user:SCicjaErfkx6nV8tIBwhYne0WTZLyk4L@dpg-d9to2np42hec738noqgg-a.oregon-postgres.render.com/gestionfinanciera"
DESTINO = "postgresql://neondb_owner:npg_QgZsMJq8BXI5@ep-proud-shadow-acgddhva-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"  # <-- Pegar acá la connection string de Neon

# ============================================

def conectar(url, nombre):
    print("Conectando a " + nombre + "...")
    conn = psycopg2.connect(url)
    conn.autocommit = False
    print("  OK")
    return conn

def obtener_tablas(cursor):
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """)
    filas = cursor.fetchall()
    tablas = []
    for fila in filas:
        tablas.append(fila[0])
    return tablas

def obtener_ddl_tabla(cursor, tabla):
    """Genera un CREATE TABLE a partir de information_schema."""
    cursor.execute("""
        SELECT column_name, data_type, character_maximum_length, 
               is_nullable, column_default, numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
    """, (tabla,))
    columnas = cursor.fetchall()

    partes = []
    for col in columnas:
        nombre = col[0]
        tipo = col[1]
        max_len = col[2]
        nullable = col[3]
        default = col[4]
        num_precision = col[5]
        num_scale = col[6]

        # Mapear tipo
        if tipo == "character varying":
            tipo_sql = "VARCHAR(" + str(max_len) + ")" if max_len else "VARCHAR"
        elif tipo == "integer":
            # Detectar si es serial/identity por el default
            if default and "nextval" in str(default):
                tipo_sql = "SERIAL"
            else:
                tipo_sql = "INTEGER"
        elif tipo == "bigint":
            if default and "nextval" in str(default):
                tipo_sql = "BIGSERIAL"
            else:
                tipo_sql = "BIGINT"
        elif tipo == "numeric":
            if num_precision and num_scale:
                tipo_sql = "NUMERIC(" + str(num_precision) + "," + str(num_scale) + ")"
            else:
                tipo_sql = "NUMERIC"
        elif tipo == "text":
            tipo_sql = "TEXT"
        elif tipo == "boolean":
            tipo_sql = "BOOLEAN"
        elif tipo == "date":
            tipo_sql = "DATE"
        elif tipo == "timestamp without time zone":
            tipo_sql = "TIMESTAMP"
        elif tipo == "timestamp with time zone":
            tipo_sql = "TIMESTAMPTZ"
        elif tipo == "double precision":
            tipo_sql = "DOUBLE PRECISION"
        elif tipo == "real":
            tipo_sql = "REAL"
        else:
            tipo_sql = tipo.upper()

        linea = "  " + nombre + " " + tipo_sql

        # No poner default si es SERIAL (ya implica nextval)
        if default and "nextval" not in str(default):
            linea = linea + " DEFAULT " + str(default)

        if nullable == "NO" and "SERIAL" not in tipo_sql:
            linea = linea + " NOT NULL"

        partes.append(linea)

    # Detectar primary key
    cursor.execute("""
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = %s 
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position
    """, (tabla,))
    pk_cols = cursor.fetchall()
    if pk_cols:
        nombres_pk = []
        for pk in pk_cols:
            nombres_pk.append(pk[0])
        partes.append("  PRIMARY KEY (" + ", ".join(nombres_pk) + ")")

    ddl = "CREATE TABLE IF NOT EXISTS " + tabla + " (\n"
    ddl = ddl + ",\n".join(partes)
    ddl = ddl + "\n);"
    return ddl

def obtener_datos(cursor, tabla):
    cursor.execute("SELECT * FROM " + tabla)
    filas = cursor.fetchall()
    columnas = []
    for desc in cursor.description:
        columnas.append(desc[0])
    return columnas, filas

def insertar_datos(cursor, tabla, columnas, filas):
    if len(filas) == 0:
        return 0

    nombres = ", ".join(columnas)
    placeholders = ", ".join(["%s"] * len(columnas))
    sql = "INSERT INTO " + tabla + " (" + nombres + ") VALUES (" + placeholders + ")"

    contador = 0
    for fila in filas:
        try:
            cursor.execute(sql, fila)
            contador = contador + 1
        except Exception as error:
            print("    Error insertando fila: " + str(error))
    return contador

def actualizar_secuencias(cursor, tabla, columnas, filas):
    """Actualiza las secuencias SERIAL para que el próximo ID sea correcto."""
    if len(filas) == 0:
        return

    # Buscar si 'id' está en las columnas
    indice_id = -1
    for i in range(len(columnas)):
        if columnas[i] == "id":
            indice_id = i
            break

    if indice_id == -1:
        return

    # Buscar el máximo ID
    max_id = 0
    for fila in filas:
        valor = fila[indice_id]
        if valor and int(valor) > max_id:
            max_id = int(valor)

    if max_id > 0:
        try:
            cursor.execute(
                "SELECT setval(pg_get_serial_sequence('" + tabla + "', 'id'), " + str(max_id) + ")"
            )
        except Exception:
            # Si no tiene secuencia, no pasa nada
            pass

def migrar():
    if not DESTINO:
        print("ERROR: Configurá la variable DESTINO con la connection string de Neon")
        print("  Abrí este archivo y pegá la URL en la línea que dice DESTINO = \"\"")
        return

    conn_origen = None
    conn_destino = None

    try:
        conn_origen = conectar(ORIGEN, "Render (origen)")
        conn_destino = conectar(DESTINO, "Neon (destino)")

        cur_origen = conn_origen.cursor()
        cur_destino = conn_destino.cursor()

        # 1. Obtener lista de tablas
        tablas = obtener_tablas(cur_origen)
        print("\nTablas encontradas: " + str(len(tablas)))
        for t in tablas:
            print("  - " + t)

        # 2. Crear tablas en destino
        print("\n--- CREANDO TABLAS ---")
        for tabla in tablas:
            ddl = obtener_ddl_tabla(cur_origen, tabla)
            print("\n" + tabla + ":")
            print(ddl)
            try:
                cur_destino.execute(ddl)
                print("  -> Creada OK")
            except Exception as error:
                print("  -> Error: " + str(error))
                conn_destino.rollback()
                # Intentar continuar
                conn_destino = conectar(DESTINO, "Neon (reconectando)")
                cur_destino = conn_destino.cursor()

        conn_destino.commit()

        # 3. Migrar datos
        print("\n--- MIGRANDO DATOS ---")
        for tabla in tablas:
            columnas, filas = obtener_datos(cur_origen, tabla)
            print(tabla + ": " + str(len(filas)) + " filas")
            if len(filas) > 0:
                insertados = insertar_datos(cur_destino, tabla, columnas, filas)
                print("  -> " + str(insertados) + " insertadas")
                actualizar_secuencias(cur_destino, tabla, columnas, filas)

        conn_destino.commit()

        print("\n=== MIGRACIÓN COMPLETADA ===")
        print("Ahora actualizá DATABASE_URL en Render con la URL de Neon.")

    except Exception as error:
        print("\nERROR: " + str(error))
        if conn_destino:
            conn_destino.rollback()
    finally:
        if cur_origen:
            cur_origen.close()
        if cur_destino:
            cur_destino.close()
        if conn_origen:
            conn_origen.close()
        if conn_destino:
            conn_destino.close()

if __name__ == "__main__":
    migrar()