import { useEffect, useMemo, useState } from "react"
import { apiGet } from "../api/client"

const STOCK_BAJO = -1

function Stock({ negocioId }) {
  const [stock, setStock] = useState([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [ordenarPor, setOrdenarPor] = useState("nombre")
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function cargarStock() {
      try {
        setCargando(true)
        setError("")

        const datos = await apiGet(
          `/negocios/${negocioId}/stock/`
        )

        setStock(Array.isArray(datos) ? datos : [])
      } catch (err) {
        setError(
          err?.message || "No se pudo cargar el stock."
        )
      } finally {
        setCargando(false)
      }
    }

    cargarStock()
  }, [negocioId])

  const conteos = useMemo(() => {
    return stock.reduce(
      (acc, item) => {
        const cantidad = Number(item.stock) || 0

        if (cantidad <= 0) {
          acc.agotados++
        } else if (cantidad <= STOCK_BAJO) {
          acc.bajos++
        } else {
          acc.ok++
        }

        acc.total++

        return acc
      },
      {
        total: 0,
        agotados: 0,
        bajos: 0,
        ok: 0,
      }
    )
  }, [stock])

  const listaFiltrada = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()

    return stock
      .filter((item) => {
        const nombre =
          item.producto_nombre?.toLowerCase() || ""

        if (termino && !nombre.includes(termino)) {
          return false
        }

        const cantidad = Number(item.stock) || 0

        if (
          filtroEstado === "agotado" &&
          cantidad > 0
        ) {
          return false
        }

        if (
          filtroEstado === "bajo" &&
          (cantidad <= 0 || cantidad > STOCK_BAJO)
        ) {
          return false
        }

        if (
          filtroEstado === "ok" &&
          cantidad <= STOCK_BAJO
        ) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        if (ordenarPor === "stock_asc") {
          return a.stock - b.stock
        }

        if (ordenarPor === "stock_desc") {
          return b.stock - a.stock
        }

        return a.producto_nombre.localeCompare(
          b.producto_nombre
        )
      })
  }, [stock, busqueda, filtroEstado, ordenarPor])

  function obtenerEstadoStock(cantidad) {
    if (cantidad <= 0) {
      return {
        texto: "Agotado",
        badge: "badge badge-agotado",
        fila: "stock-agotado",
      }
    }

    if (cantidad <= STOCK_BAJO) {
      return {
        texto: "Bajo",
        badge: "badge badge-bajo",
        fila: "stock-bajo",
      }
    }

    return {
      texto: "OK",
      badge: "badge badge-ok",
      fila: "",
    }
  }

  function limpiarFiltros() {
    setBusqueda("")
    setFiltroEstado("todos")
    setOrdenarPor("nombre")
  }

  if (cargando) {
    return (
      <div className="pagina-stock">
        <h1>Stock</h1>
        <p>Cargando stock...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pagina-stock">
        <h1>Stock</h1>
        <div className="msg msg-error">{error}</div>
      </div>
    )
  }

  return (
    <div className="pagina-stock">
      <h1>Stock</h1>

      {conteos.agotados > 0 && (
        <div className="msg msg-error">
          {conteos.agotados} producto
          {conteos.agotados !== 1 ? "s" : ""} agotado
          {conteos.agotados !== 1 ? "s" : ""}
        </div>
      )}

      {conteos.bajos > 0 && (
        <div className="msg msg-aviso">
          {conteos.bajos} producto
          {conteos.bajos !== 1 ? "s" : ""} con stock
          bajo (≤ {STOCK_BAJO})
        </div>
      )}

      <div className="barra-stock">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-busqueda"
        />

        <div className="filtros-stock">
          <button
            className={
              filtroEstado === "todos"
                ? "btn-filtro activo"
                : "btn-filtro"
            }
            onClick={() => setFiltroEstado("todos")}
          >
            Todos ({conteos.total})
          </button>

          <button
            className={
              filtroEstado === "ok"
                ? "btn-filtro activo"
                : "btn-filtro"
            }
            onClick={() => setFiltroEstado("ok")}
          >
            OK ({conteos.ok})
          </button>

          <button
            className={
              filtroEstado === "bajo"
                ? "btn-filtro activo"
                : "btn-filtro"
            }
            onClick={() => setFiltroEstado("bajo")}
          >
            Bajo ({conteos.bajos})
          </button>

          <button
            className={
              filtroEstado === "agotado"
                ? "btn-filtro activo"
                : "btn-filtro"
            }
            onClick={() => setFiltroEstado("agotado")}
          >
            Agotado ({conteos.agotados})
          </button>
        </div>

        <select
          value={ordenarPor}
          onChange={(e) => setOrdenarPor(e.target.value)}
          className="select-orden"
        >
          <option value="nombre">Nombre</option>
          <option value="stock_asc">
            Menor stock
          </option>
          <option value="stock_desc">
            Mayor stock
          </option>
        </select>

        <button
          className="btn-secundario"
          onClick={limpiarFiltros}
        >
          Limpiar
        </button>
      </div>

      <table className="tabla">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Comprado</th>
            <th>Vendido</th>
            <th>Stock</th>
            <th>Estado</th>
          </tr>
        </thead>

        <tbody>
          {listaFiltrada.map((item) => {
            const estado = obtenerEstadoStock(
              Number(item.stock)
            )

            return (
              <tr
                key={item.producto_id}
                className={estado.fila}
              >
                <td>{item.producto_nombre}</td>
                <td>{item.comprado}</td>
                <td>{item.vendido}</td>
                <td className="monto">
                  {item.stock}
                </td>
                <td>
                  <span className={estado.badge}>
                    {estado.texto}
                  </span>
                </td>
              </tr>
            )
          })}

          {listaFiltrada.length === 0 && (
            <tr>
              <td
                colSpan="5"
                className="celda-vacia"
              >
                {busqueda
                  ? `Sin resultados para "${busqueda}"`
                  : "No hay productos cargados"}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="contador-resultados">
        Mostrando {listaFiltrada.length} de{" "}
        {stock.length} productos
      </p>
    </div>
  )
}

export default Stock