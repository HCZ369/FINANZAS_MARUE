import { useState, useEffect } from "react"
import { apiGet } from "../api/client"

function Catalogo({ negocioId }) {
  const [productos, setProductos] = useState([])
  const [stock, setStock] = useState([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroStock, setFiltroStock] = useState("todos")
  const [ordenar, setOrdenar] = useState("nombre")
  const [productoAbierto, setProductoAbierto] = useState(null)

  useEffect(function () {
    cargarDatos()
  }, [negocioId])

  async function cargarDatos() {
    try {
      const productosData = await apiGet("/negocios/" + negocioId + "/productos/")
      const stockData = await apiGet("/negocios/" + negocioId + "/stock/")
      setProductos(productosData)
      setStock(stockData)
    } catch (error) {
      console.error("Error cargando catálogo:", error)
    }
  }

  function obtenerStock(productoId) {
    for (let i = 0; i < stock.length; i++) {
      if (stock[i].producto_id === productoId) {
        return stock[i]
      }
    }
    return { stock: 0, comprado: 0, vendido: 0 }
  }

  function formatearMonto(valor) {
    return Number(valor).toLocaleString("es-PY")
  }

  // Color único por nombre para diferenciar productos similares
  function colorProducto(nombre) {
    let hash = 0
    for (let i = 0; i < nombre.length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash) % 360
    return "hsl(" + hue + ", 30%, 16%)"
  }

  function inicialProducto(nombre) {
    const palabras = nombre.trim().split(" ")
    if (palabras.length >= 2) {
      return (palabras[0][0] + palabras[1][0]).toUpperCase()
    }
    return nombre.substring(0, 2).toUpperCase()
  }

  function productosFiltrados() {
    let resultado = []

    for (let i = 0; i < productos.length; i++) {
      const p = productos[i]
      const infoStock = obtenerStock(p.id)

      if (busqueda.trim()) {
        const termino = busqueda.toLowerCase()
        if (!p.nombre.toLowerCase().includes(termino)) {
          continue
        }
      }

      if (filtroStock === "disponible" && infoStock.stock <= 0) {
        continue
      }
      if (filtroStock === "bajo" && (infoStock.stock <= 0 || infoStock.stock > 10)) {
        continue
      }
      if (filtroStock === "agotado" && infoStock.stock > 0) {
        continue
      }

      resultado.push({
        id: p.id,
        nombre: p.nombre,
        precio: Number(p.precio),
        costo_usd: p.costo_usd || null,
        stock: infoStock.stock,
        comprado: infoStock.comprado,
        vendido: infoStock.vendido,
      })
    }

    if (ordenar === "nombre") {
      resultado.sort(function (a, b) { return a.nombre.localeCompare(b.nombre) })
    } else if (ordenar === "precio_asc") {
      resultado.sort(function (a, b) { return a.precio - b.precio })
    } else if (ordenar === "precio_desc") {
      resultado.sort(function (a, b) { return b.precio - a.precio })
    } else if (ordenar === "stock_asc") {
      resultado.sort(function (a, b) { return a.stock - b.stock })
    }

    return resultado
  }

  function claseEstado(cantidad) {
    if (cantidad <= 0) {
      return "cat-estado cat-agotado"
    }
    if (cantidad <= 10) {
      return "cat-estado cat-bajo"
    }
    return "cat-estado cat-ok"
  }

  function textoEstado(cantidad) {
    if (cantidad <= 0) {
      return "Agotado"
    }
    return cantidad + " uds."
  }

  // Conteos
  let totalOk = 0
  let totalBajo = 0
  let totalAgotado = 0
  for (let i = 0; i < productos.length; i++) {
    const info = obtenerStock(productos[i].id)
    if (info.stock <= 0) {
      totalAgotado = totalAgotado + 1
    } else if (info.stock <= 10) {
      totalBajo = totalBajo + 1
    } else {
      totalOk = totalOk + 1
    }
  }

  const lista = productosFiltrados()

  return (
    <div>
      <h1>Catálogo</h1>

      <div className="cat-toolbar">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={function (e) { setBusqueda(e.target.value) }}
          className="cat-input-busqueda"
        />
        <div className="filtros-stock">
          <button
            className={filtroStock === "todos" ? "btn-filtro activo" : "btn-filtro"}
            onClick={function () { setFiltroStock("todos") }}
          >Todos ({productos.length})</button>
          <button
            className={filtroStock === "disponible" ? "btn-filtro activo" : "btn-filtro"}
            onClick={function () { setFiltroStock("disponible") }}
          >OK ({totalOk})</button>
          <button
            className={filtroStock === "bajo" ? "btn-filtro activo" : "btn-filtro"}
            onClick={function () { setFiltroStock("bajo") }}
          >Bajo ({totalBajo})</button>
          <button
            className={filtroStock === "agotado" ? "btn-filtro activo" : "btn-filtro"}
            onClick={function () { setFiltroStock("agotado") }}
          >Agotado ({totalAgotado})</button>
        </div>
        <select
          className="cat-select-orden"
          value={ordenar}
          onChange={function (e) { setOrdenar(e.target.value) }}
        >
          <option value="nombre">Nombre A-Z</option>
          <option value="precio_asc">Precio: menor</option>
          <option value="precio_desc">Precio: mayor</option>
          <option value="stock_asc">Menos stock</option>
        </select>
      </div>

      <p className="cat-conteo">{lista.length} producto{lista.length !== 1 ? "s" : ""}</p>

      <div className="cat-grid">
        {lista.map(function (p) {
          return (
            <div
              key={p.id}
              className={p.stock <= 0 ? "cat-card cat-card-agotado" : "cat-card"}
              onClick={function () { setProductoAbierto(p) }}
            >
              <div className="cat-card-visual" style={{ backgroundColor: colorProducto(p.nombre) }}>
                <span className="cat-card-inicial">{inicialProducto(p.nombre)}</span>
                <span className={claseEstado(p.stock)}>{textoEstado(p.stock)}</span>
              </div>

              <div className="cat-card-info">
                <span className="cat-card-nombre" title={p.nombre}>{p.nombre}</span>
                <div className="cat-card-pie">
                  <span className="cat-card-precio">{formatearMonto(p.precio)}</span>
                  {p.vendido > 0 && (
                    <span className="cat-card-vendidos">{p.vendido} vend.</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {lista.length === 0 && (
          <p className="cat-vacio">
            {busqueda ? "Sin resultados para \"" + busqueda + "\"" : "No hay productos cargados"}
          </p>
        )}
      </div>

      {productoAbierto !== null && (
        <div className="modal-overlay" onClick={function () { setProductoAbierto(null) }}>
          <div className="modal-contenido" onClick={function (e) { e.stopPropagation() }}>
            <div className="modal-cabecera">
              <h3>{productoAbierto.nombre}</h3>
              <button className="btn-cerrar-modal" onClick={function () { setProductoAbierto(null) }}>×</button>
            </div>

            <div className="cat-detalle-visual" style={{ backgroundColor: colorProducto(productoAbierto.nombre) }}>
              <span className="cat-detalle-inicial">{inicialProducto(productoAbierto.nombre)}</span>
            </div>

            <div className="cat-detalle-stats">
              <div className="stat">
                <span className="stat-valor">{formatearMonto(productoAbierto.precio)}</span>
                <span className="stat-etiqueta">Precio</span>
              </div>
              <div className="stat">
                <span className="stat-valor">{productoAbierto.stock}</span>
                <span className="stat-etiqueta">Stock</span>
              </div>
              <div className="stat">
                <span className="stat-valor">{productoAbierto.vendido}</span>
                <span className="stat-etiqueta">Vendidos</span>
              </div>
              <div className="stat">
                <span className="stat-valor">{productoAbierto.comprado}</span>
                <span className="stat-etiqueta">Comprados</span>
              </div>
            </div>

            {productoAbierto.costo_usd && (
              <p className="cat-detalle-costo">Costo: ${productoAbierto.costo_usd} USD</p>
            )}

            <div className="cat-detalle-barra">
              <span className={claseEstado(productoAbierto.stock)}>
                {textoEstado(productoAbierto.stock)}
              </span>
              {productoAbierto.vendido > 0 && productoAbierto.comprado > 0 && (
                <span className="cat-detalle-rotacion">
                  Rotación: {Math.round((productoAbierto.vendido / productoAbierto.comprado) * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Catalogo
