import { useEffect, useMemo, useState } from "react"
import { apiGet } from "../api/client"

const FORMATEADOR_MONTO = new Intl.NumberFormat("es-PY", {
  maximumFractionDigits: 0,
})

const FORMATEADOR_UNIDADES = new Intl.NumberFormat("es-PY", {
  maximumFractionDigits: 0,
})

function TablaTopProductos({ negocioId }) {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let componenteActivo = true

    async function cargarProductos() {
      if (!negocioId) {
        setProductos([])
        setCargando(false)
        return
      }

      try {
        setCargando(true)
        setError("")

        const respuesta = await apiGet(
          `/negocios/${negocioId}/dashboard/productos-mas-vendidos/`
        )

        if (!componenteActivo) return

        const productosNormalizados = Array.isArray(respuesta)
          ? respuesta
              .map(normalizarProducto)
              .filter((producto) => producto.unidades > 0)
              .sort((a, b) => {
                if (b.unidades !== a.unidades) {
                  return b.unidades - a.unidades
                }

                return b.total - a.total
              })
          : []

        setProductos(productosNormalizados)
      } catch (errorPeticion) {
        if (!componenteActivo) return

        setProductos([])
        setError(
          errorPeticion?.message ||
            "No se pudieron cargar los productos más vendidos."
        )
      } finally {
        if (componenteActivo) {
          setCargando(false)
        }
      }
    }

    cargarProductos()

    return () => {
      componenteActivo = false
    }
  }, [negocioId])

  const resumen = useMemo(() => {
    return productos.reduce(
      (resultado, producto) => {
        resultado.unidades += producto.unidades
        resultado.total += producto.total

        return resultado
      },
      {
        unidades: 0,
        total: 0,
      }
    )
  }, [productos])

  const maximoUnidades = useMemo(() => {
    return Math.max(
      ...productos.map((producto) => producto.unidades),
      0
    )
  }, [productos])

  if (cargando) {
    return (
      <EstadoTabla>
        <div className="tabla-cargando-linea" />
        <span>Cargando productos...</span>
      </EstadoTabla>
    )
  }

  if (error) {
    return (
      <EstadoTabla tipo="error">
        <span>{error}</span>
      </EstadoTabla>
    )
  }

  if (productos.length === 0) {
    return (
      <EstadoTabla>
        <span className="tabla-vacia-titulo">
          Todavía no hay ventas registradas
        </span>

        <span>
          Los productos aparecerán aquí después de registrar ventas.
        </span>
      </EstadoTabla>
    )
  }

  return (
    <div className="top-productos">
      <div className="top-productos-resumen">
        <Resumen
          etiqueta="Productos"
          valor={productos.length}
        />

        <Resumen
          etiqueta="Unidades vendidas"
          valor={formatearUnidades(resumen.unidades)}
        />

        <Resumen
          etiqueta="Ingresos"
          valor={formatearMonto(resumen.total)}
          destacado
        />
      </div>

      <div className="contenedor-tabla">
        <table className="tabla tabla-top-productos">
          <thead>
            <tr>
              <th scope="col" className="columna-posicion">
                Posición
              </th>

              <th scope="col">
                Producto
              </th>

              <th scope="col">
                Unidades
              </th>

              <th scope="col">
                Participación
              </th>

              <th scope="col" className="columna-numerica">
                Total vendido
              </th>
            </tr>
          </thead>

          <tbody>
            {productos.map((producto, indice) => {
              const porcentajeBarra =
                maximoUnidades > 0
                  ? (producto.unidades / maximoUnidades) * 100
                  : 0

              const participacion =
                resumen.unidades > 0
                  ? producto.unidades / resumen.unidades
                  : 0

              return (
                <tr key={producto.id}>
                  <td className="columna-posicion">
                    <span
                      className={`posicion-producto ${
                        indice < 3 ? "posicion-destacada" : ""
                      }`}
                    >
                      {String(indice + 1).padStart(2, "0")}
                    </span>
                  </td>

                  <td>
                    <div className="producto-tabla">
                      <span
                        className="producto-inicial"
                        aria-hidden="true"
                      >
                        {obtenerIniciales(producto.nombre)}
                      </span>

                      <span className="producto-nombre">
                        {producto.nombre}
                      </span>
                    </div>
                  </td>

                  <td>
                    <span className="producto-unidades">
                      {formatearUnidades(producto.unidades)}
                    </span>
                  </td>

                  <td className="columna-participacion">
                    <div className="participacion-producto">
                      <div
                        className="participacion-barra"
                        aria-hidden="true"
                      >
                        <span
                          style={{
                            width: `${Math.min(
                              porcentajeBarra,
                              100
                            )}%`,
                          }}
                        />
                      </div>

                      <span>
                        {formatearPorcentaje(participacion)}
                      </span>
                    </div>
                  </td>

                  <td className="columna-numerica">
                    <strong className="producto-total">
                      {formatearMonto(producto.total)}
                    </strong>
                  </td>
                </tr>
              )
            })}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={2}>Total mostrado</td>

              <td>
                {formatearUnidades(resumen.unidades)}
              </td>

              <td>
                {formatearPorcentaje(1)}
              </td>

              <td className="columna-numerica">
                {formatearMonto(resumen.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function Resumen({ etiqueta, valor, destacado = false }) {
  return (
    <div
      className={`top-productos-metrica ${
        destacado ? "top-productos-metrica-destacada" : ""
      }`}
    >
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
    </div>
  )
}

function EstadoTabla({ children, tipo = "" }) {
  return (
    <div
      className={`tabla-estado ${
        tipo ? `tabla-estado-${tipo}` : ""
      }`}
    >
      {children}
    </div>
  )
}

function normalizarProducto(producto) {
  return {
    id:
      producto?.producto_id ??
      producto?.id ??
      producto?.producto_nombre,

    nombre:
      producto?.producto_nombre?.trim() ||
      producto?.nombre?.trim() ||
      "Producto sin nombre",

    unidades: Math.max(
      0,
      convertirNumero(producto?.unidades_vendidas)
    ),

    total: Math.max(
      0,
      convertirNumero(producto?.total_vendido)
    ),
  }
}

function convertirNumero(valor) {
  const numero = Number(valor)

  return Number.isFinite(numero) ? numero : 0
}

function formatearMonto(valor) {
  return FORMATEADOR_MONTO.format(convertirNumero(valor))
}

function formatearUnidades(valor) {
  return FORMATEADOR_UNIDADES.format(convertirNumero(valor))
}

function formatearPorcentaje(valor) {
  return new Intl.NumberFormat("es-PY", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(convertirNumero(valor))
}

function obtenerIniciales(nombre) {
  const palabras = String(nombre || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (palabras.length === 0) return "?"

  if (palabras.length === 1) {
    return palabras[0].slice(0, 2).toUpperCase()
  }

  return `${palabras[0][0]}${palabras[1][0]}`.toUpperCase()
}

export default TablaTopProductos