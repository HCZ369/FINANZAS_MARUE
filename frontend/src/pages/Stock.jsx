import { useState, useEffect } from "react"
import { apiGet } from "../api/client"

function Stock({ negocioId }) {
  const [stock, setStock] = useState([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos") // "todos" | "bajo" | "agotado" | "ok"
  const [ordenarPor, setOrdenarPor] = useState("nombre") // "nombre" | "stock_asc" | "stock_desc"

  useEffect(() => {
    async function traerStock() {
      try {
        const datos = await apiGet(`/negocios/${negocioId}/stock/`)
        setStock(datos)
      } catch (error) {
        // silencioso por ahora
      }
    }
    traerStock()
  }, [negocioId])

  // --- Conteos rápidos ---
  function contarPorEstado() {
    let agotados = 0
    let bajos = 0
    let ok = 0
    for (let i = 0; i < stock.length; i++) {
      const cant = stock[i].stock
      if (cant <= 0) {
        agotados = agotados + 1
      } else if (cant <= 10) {
        bajos = bajos + 1
      } else {
        ok = ok + 1
      }
    }
    return { agotados, bajos, ok, total: stock.length }
  }

  // --- Filtrado y ordenamiento ---
  function stockFiltrado() {
    let resultado = []

    // Filtro por búsqueda
    for (let i = 0; i < stock.length; i++) {
      const item = stock[i]
      const coincide = !busqueda.trim() ||
        item.producto_nombre.toLowerCase().includes(busqueda.toLowerCase())

      if (!coincide) {
        continue
      }

      // Filtro por estado
      if (filtroEstado === "agotado" && item.stock > 0) {
        continue
      }
      if (filtroEstado === "bajo" && (item.stock <= 0 || item.stock > 10)) {
        continue
      }
      if (filtroEstado === "ok" && item.stock <= 10) {
        continue
      }

      resultado.push(item)
    }

    // Ordenar
    if (ordenarPor === "stock_asc") {
      resultado.sort((a, b) => a.stock - b.stock)
    } else if (ordenarPor === "stock_desc") {
      resultado.sort((a, b) => b.stock - a.stock)
    } else {
      resultado.sort((a, b) => a.producto_nombre.localeCompare(b.producto_nombre))
    }

    return resultado
  }

  function claseFila(cantidad) {
    if (cantidad <= 0) {
      return "stock-agotado"
    }
    if (cantidad <= 10) {
      return "stock-bajo"
    }
    return ""
  }

  function etiquetaEstado(cantidad) {
    if (cantidad <= 0) {
      return "Agotado"
    }
    if (cantidad <= 10) {
      return "Bajo"
    }
    return "OK"
  }

  function claseEtiqueta(cantidad) {
    if (cantidad <= 0) {
      return "badge badge-agotado"
    }
    if (cantidad <= 10) {
      return "badge badge-bajo"
    }
    return "badge badge-ok"
  }

  const conteos = contarPorEstado()
  const listaFiltrada = stockFiltrado()

  return (
    <div className="pagina-stock">
      <h1>Stock</h1>

      {/* Alertas de stock */}
      {conteos.agotados > 0 && (
        <div className="msg msg-error">
          {conteos.agotados} producto{conteos.agotados > 1 ? "s" : ""} agotado{conteos.agotados > 1 ? "s" : ""}
        </div>
      )}
      {conteos.bajos > 0 && (
        <div className="msg msg-aviso">
          {conteos.bajos} producto{conteos.bajos > 1 ? "s" : ""} con stock bajo (≤10 unidades)
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
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
            className={filtroEstado === "todos" ? "btn-filtro activo" : "btn-filtro"}
            onClick={() => setFiltroEstado("todos")}
          >Todos ({conteos.total})</button>
          <button
            className={filtroEstado === "ok" ? "btn-filtro activo" : "btn-filtro"}
            onClick={() => setFiltroEstado("ok")}
          >OK ({conteos.ok})</button>
          <button
            className={filtroEstado === "bajo" ? "btn-filtro activo" : "btn-filtro"}
            onClick={() => setFiltroEstado("bajo")}
          >Bajo ({conteos.bajos})</button>
          <button
            className={filtroEstado === "agotado" ? "btn-filtro activo" : "btn-filtro"}
            onClick={() => setFiltroEstado("agotado")}
          >Agotado ({conteos.agotados})</button>
        </div>

        <select
          value={ordenarPor}
          onChange={(e) => setOrdenarPor(e.target.value)}
          className="select-orden"
        >
          <option value="nombre">Ordenar: Nombre</option>
          <option value="stock_asc">Ordenar: Menos stock</option>
          <option value="stock_desc">Ordenar: Más stock</option>
        </select>
      </div>

      {/* Tabla */}
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
          {listaFiltrada.map((item) => (
            <tr key={item.producto_id} className={claseFila(item.stock)}>
              <td>{item.producto_nombre}</td>
              <td>{item.comprado}</td>
              <td>{item.vendido}</td>
              <td className="monto">{item.stock}</td>
              <td><span className={claseEtiqueta(item.stock)}>{etiquetaEstado(item.stock)}</span></td>
            </tr>
          ))}
          {listaFiltrada.length === 0 && (
            <tr><td colSpan="5" className="celda-vacia">
              {busqueda ? "Sin resultados para \"" + busqueda + "\"" : "No hay productos cargados"}
            </td></tr>
          )}
        </tbody>
      </table>

      <p className="contador-resultados">
        Mostrando {listaFiltrada.length} de {stock.length} productos
      </p>
    </div>
  )
}

export default Stock
