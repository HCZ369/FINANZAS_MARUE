import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client"

function Catalogo({ negocioId }) {
  const navigate = useNavigate()

  const [productos, setProductos] = useState([])
  const [stock, setStock] = useState([])
  const [lotes, setLotes] = useState([])
  const [busqueda, setBusqueda] = useState("")
  const [filtroStock, setFiltroStock] = useState("todos")
  const [ordenar, setOrdenar] = useState("nombre")

  // Selección para venta
  const [seleccionados, setSeleccionados] = useState({}) // { productoId: cantidad }

  // Modal detalle/edición
  const [productoAbierto, setProductoAbierto] = useState(null)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [modoCrear, setModoCrear] = useState(false)

  // Formulario de edición/creación
  const [formNombre, setFormNombre] = useState("")
  const [formPrecio, setFormPrecio] = useState("")
  const [formLote, setFormLote] = useState("")
  const [formCostoUsd, setFormCostoUsd] = useState("")
  const [formCantidad, setFormCantidad] = useState("")
  const [formImagenUrl, setFormImagenUrl] = useState("")
  const [sugerencia, setSugerencia] = useState(null)

  // UI
  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState("exito")

  useEffect(function () {
    cargarDatos()
  }, [negocioId])

  async function cargarDatos() {
    try {
      const productosData = await apiGet("/negocios/" + negocioId + "/productos/")
      const stockData = await apiGet("/negocios/" + negocioId + "/stock/")
      const lotesData = await apiGet("/negocios/" + negocioId + "/lotes/")
      setProductos(productosData)
      setStock(stockData)
      setLotes(lotesData)
    } catch (error) {
      mostrarMsg("Error cargando datos: " + error.message, "error")
    }
  }

  function mostrarMsg(texto, tipo) {
    setMensaje(texto)
    setTipoMensaje(tipo || "exito")
    if (tipo !== "error") {
      setTimeout(function () { setMensaje("") }, 4000)
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

  // --- Filtro y orden ---
  function productosFiltrados() {
    let resultado = []

    for (let i = 0; i < productos.length; i++) {
      const p = productos[i]
      const infoStock = obtenerStock(p.id)

      if (busqueda.trim()) {
        if (!p.nombre.toLowerCase().includes(busqueda.toLowerCase())) {
          continue
        }
      }

      if (filtroStock === "disponible" && infoStock.stock <= 0) { continue }
      if (filtroStock === "bajo" && (infoStock.stock <= 0 || infoStock.stock > 10)) { continue }
      if (filtroStock === "agotado" && infoStock.stock > 0) { continue }

      resultado.push({
        id: p.id,
        nombre: p.nombre,
        precio: Number(p.precio),
        imagen_url: p.imagen_url || null,
        costo_usd: p.costo_usd || null,
        lote_id: p.lote_id || null,
        cantidad_comprada: p.cantidad_comprada || null,
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
    if (cantidad <= 0) { return "cat-estado cat-agotado" }
    if (cantidad <= 10) { return "cat-estado cat-bajo" }
    return "cat-estado cat-ok"
  }

  function textoEstado(cantidad) {
    if (cantidad <= 0) { return "Agotado" }
    return cantidad + " uds."
  }

  // --- Selección para venta ---
  function toggleSeleccion(producto, evento) {
    evento.stopPropagation()
    const nuevo = Object.assign({}, seleccionados)
    if (nuevo[producto.id]) {
      delete nuevo[producto.id]
    } else {
      nuevo[producto.id] = {
        producto_id: String(producto.id),
        nombre: producto.nombre,
        cantidad: 1,
        precio_lista: producto.precio,
        precio_vendido: producto.precio,
      }
    }
    setSeleccionados(nuevo)
  }

  function cantidadSeleccionados() {
    return Object.keys(seleccionados).length
  }

  function irAVenta() {
    const items = []
    const ids = Object.keys(seleccionados)
    for (let i = 0; i < ids.length; i++) {
      items.push(seleccionados[ids[i]])
    }
    navigate("/ventas", { state: { carritoInicial: items } })
  }

  // --- Modal detalle ---
  function abrirDetalle(producto) {
    setProductoAbierto(producto)
    setModoEdicion(false)
    setModoCrear(false)
    setSugerencia(null)
  }

  function cerrarModal() {
    setProductoAbierto(null)
    setModoEdicion(false)
    setModoCrear(false)
    setSugerencia(null)
  }

  // --- Edición ---
  function iniciarEdicion(producto) {
    setModoEdicion(true)
    setModoCrear(false)
    setFormNombre(producto.nombre)
    setFormPrecio(String(producto.precio))
    setFormLote(producto.lote_id ? String(producto.lote_id) : "")
    setFormCostoUsd(producto.costo_usd ? String(producto.costo_usd) : "")
    setFormCantidad(producto.cantidad_comprada ? String(producto.cantidad_comprada) : "")
    setFormImagenUrl(producto.imagen_url || "")
    setSugerencia(null)
  }

  function iniciarCreacion() {
    setProductoAbierto(null)
    setModoCrear(true)
    setModoEdicion(false)
    setFormNombre("")
    setFormPrecio("")
    setFormLote("")
    setFormCostoUsd("")
    setFormCantidad("")
    setFormImagenUrl("")
    setSugerencia(null)
  }

  async function guardarProducto() {
    if (!formNombre.trim()) {
      mostrarMsg("El nombre es obligatorio", "error")
      return
    }
    if (!formPrecio || Number(formPrecio) <= 0) {
      mostrarMsg("Ingresá un precio válido", "error")
      return
    }

    let costoUnitario = null
    if (sugerencia !== null) {
      costoUnitario = sugerencia.costo_unitario
    }

    const datos = {
      nombre: formNombre,
      precio: formPrecio,
      costo: costoUnitario,
      lote_id: formLote || null,
      costo_usd: formCostoUsd || null,
      cantidad_comprada: formCantidad || null,
      imagen_url: formImagenUrl || null,
    }

    try {
      let resultado
      if (modoCrear) {
        resultado = await apiPost("/negocios/" + negocioId + "/productos/", datos)
      } else {
        resultado = await apiPut("/negocios/" + negocioId + "/productos/" + productoAbierto.id + "/", datos)
      }
      mostrarMsg(resultado.mensaje)
      cerrarModal()
      await cargarDatos()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  async function borrarProducto(productoId) {
    if (!confirm("¿Eliminar este producto?")) { return }
    try {
      const resultado = await apiDelete("/negocios/" + negocioId + "/productos/" + productoId + "/")
      mostrarMsg(resultado.mensaje)
      cerrarModal()
      await cargarDatos()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  async function pedirSugerencia() {
    if (!formLote || !formCostoUsd) {
      mostrarMsg("Elegí un lote y cargá el costo USD", "error")
      return
    }
    try {
      const resultado = await apiPost("/negocios/" + negocioId + "/sugerencia-precio/", {
        lote_id: formLote,
        costo_usd: formCostoUsd,
      })
      setSugerencia(resultado)
      setFormPrecio(String(resultado.precio_sugerido))
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  // Conteos
  let totalOk = 0
  let totalBajo = 0
  let totalAgotado = 0
  for (let i = 0; i < productos.length; i++) {
    const info = obtenerStock(productos[i].id)
    if (info.stock <= 0) { totalAgotado++ }
    else if (info.stock <= 10) { totalBajo++ }
    else { totalOk++ }
  }

  const lista = productosFiltrados()
  const haySeleccion = cantidadSeleccionados() > 0

  return (
    <div>
      <div className="cat-header">
        <h1>Catálogo</h1>
        <button className="btn-principal" onClick={iniciarCreacion}>+ Nuevo producto</button>
      </div>

      {mensaje && (
        <div className={tipoMensaje === "error" ? "msg msg-error" : "msg msg-exito"}>
          {mensaje}
          <button className="btn-cerrar-msg" onClick={function () { setMensaje("") }}>×</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="cat-toolbar">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={function (e) { setBusqueda(e.target.value) }}
          className="cat-input-busqueda"
        />
        <div className="filtros-stock">
          <button className={filtroStock === "todos" ? "btn-filtro activo" : "btn-filtro"} onClick={function () { setFiltroStock("todos") }}>Todos ({productos.length})</button>
          <button className={filtroStock === "disponible" ? "btn-filtro activo" : "btn-filtro"} onClick={function () { setFiltroStock("disponible") }}>OK ({totalOk})</button>
          <button className={filtroStock === "bajo" ? "btn-filtro activo" : "btn-filtro"} onClick={function () { setFiltroStock("bajo") }}>Bajo ({totalBajo})</button>
          <button className={filtroStock === "agotado" ? "btn-filtro activo" : "btn-filtro"} onClick={function () { setFiltroStock("agotado") }}>Agotado ({totalAgotado})</button>
        </div>
        <select className="cat-select-orden" value={ordenar} onChange={function (e) { setOrdenar(e.target.value) }}>
          <option value="nombre">Nombre A-Z</option>
          <option value="precio_asc">Precio: menor</option>
          <option value="precio_desc">Precio: mayor</option>
          <option value="stock_asc">Menos stock</option>
        </select>
      </div>

      <p className="cat-conteo">{lista.length} producto{lista.length !== 1 ? "s" : ""}</p>

      {/* Grid */}
      <div className="cat-grid">
        {lista.map(function (p) {
          const estaSeleccionado = seleccionados[p.id] !== undefined
          return (
            <div
              key={p.id}
              className={
                "cat-card" +
                (p.stock <= 0 ? " cat-card-agotado" : "") +
                (estaSeleccionado ? " cat-card-seleccionado" : "")
              }
              onClick={function () { abrirDetalle(p) }}
            >
              {/* Zona visual */}
              <div className="cat-card-visual" style={{ backgroundColor: colorProducto(p.nombre) }}>
                {p.imagen_url ? (
                  <img
                    src={p.imagen_url}
                    alt={p.nombre}
                    className="cat-card-img"
                    onError={function (e) { e.target.style.display = "none" }}
                  />
                ) : null}
                <span className="cat-card-inicial">{inicialProducto(p.nombre)}</span>
                <span className={claseEstado(p.stock)}>{textoEstado(p.stock)}</span>

                {/* Botón seleccionar para venta */}
                <button
                  className={"cat-btn-seleccionar" + (estaSeleccionado ? " seleccionado" : "")}
                  onClick={function (e) { toggleSeleccion(p, e) }}
                  title={estaSeleccionado ? "Quitar de venta" : "Agregar a venta"}
                >
                  {estaSeleccionado ? "✓" : "+"}
                </button>
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

      {/* Barra flotante de venta */}
      {haySeleccion && (
        <div className="cat-barra-venta">
          <span>{cantidadSeleccionados()} producto{cantidadSeleccionados() !== 1 ? "s" : ""} seleccionado{cantidadSeleccionados() !== 1 ? "s" : ""}</span>
          <div className="cat-barra-acciones">
            <button className="btn-secundario" onClick={function () { setSeleccionados({}) }}>Limpiar</button>
            <button className="btn-principal" onClick={irAVenta}>Ir a venta</button>
          </div>
        </div>
      )}

      {/* ===== MODAL DETALLE ===== */}
      {productoAbierto !== null && !modoEdicion && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-contenido cat-modal" onClick={function (e) { e.stopPropagation() }}>
            <div className="modal-cabecera">
              <h3>{productoAbierto.nombre}</h3>
              <button className="btn-cerrar-modal" onClick={cerrarModal}>×</button>
            </div>

            {/* Imagen o visual */}
            <div className="cat-detalle-visual" style={{ backgroundColor: colorProducto(productoAbierto.nombre) }}>
              {productoAbierto.imagen_url ? (
                <img
                  src={productoAbierto.imagen_url}
                  alt={productoAbierto.nombre}
                  className="cat-detalle-img"
                  onError={function (e) { e.target.style.display = "none" }}
                />
              ) : null}
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

            <div className="cat-detalle-acciones">
              <button className="btn-principal" onClick={function () { iniciarEdicion(productoAbierto) }}>Editar producto</button>
              <button className="btn-borrar" onClick={function () { borrarProducto(productoAbierto.id) }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL EDICIÓN / CREACIÓN ===== */}
      {(modoEdicion || modoCrear) && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-contenido cat-modal" onClick={function (e) { e.stopPropagation() }}>
            <div className="modal-cabecera">
              <h3>{modoCrear ? "Nuevo producto" : "Editar producto"}</h3>
              <button className="btn-cerrar-modal" onClick={cerrarModal}>×</button>
            </div>

            <div className="cat-form-edicion">
              <div className="campo">
                <label>Nombre</label>
                <input type="text" value={formNombre} onChange={function (e) { setFormNombre(e.target.value) }} placeholder="Nombre del producto" />
              </div>

              <div className="campo">
                <label>Imagen URL (opcional)</label>
                <input type="text" value={formImagenUrl} onChange={function (e) { setFormImagenUrl(e.target.value) }} placeholder="https://..." />
                {formImagenUrl && (
                  <div className="cat-preview-img">
                    <img
                      src={formImagenUrl}
                      alt="Preview"
                      onError={function (e) { e.target.style.display = "none" }}
                    />
                  </div>
                )}
              </div>

              <div className="grid-form-config">
                <div className="campo">
                  <label>Lote</label>
                  <select value={formLote} onChange={function (e) { setFormLote(e.target.value) }}>
                    <option value="">Seleccionar lote</option>
                    {lotes.map(function (l) {
                      return (
                        <option key={l.id} value={l.id}>
                          {l.fecha} — {l.descripcion || "Lote " + l.id}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div className="campo">
                  <label>Costo USD</label>
                  <input type="number" step="any" value={formCostoUsd} onChange={function (e) { setFormCostoUsd(e.target.value) }} placeholder="0.00" />
                </div>
              </div>

              <div className="grid-form-config">
                <div className="campo">
                  <label>Cantidad comprada</label>
                  <input type="number" value={formCantidad} onChange={function (e) { setFormCantidad(e.target.value) }} placeholder="0" />
                </div>
                <div className="campo">
                  <label>&nbsp;</label>
                  <button type="button" className="btn-secundario" onClick={pedirSugerencia} style={{ width: "100%" }}>Calcular sugerencia</button>
                </div>
              </div>

              {sugerencia !== null && (
                <div className="caja-sugerencia">
                  <p>Costo unitario: <strong>{sugerencia.costo_unitario}</strong></p>
                  <p>Multiplicador: <strong>{sugerencia.multiplicador}</strong></p>
                  <p>Precio sugerido: <strong>{sugerencia.precio_sugerido}</strong></p>
                </div>
              )}

              <div className="campo">
                <label>Precio final</label>
                <input type="number" value={formPrecio} onChange={function (e) { setFormPrecio(e.target.value) }} placeholder="0" />
              </div>

              <div className="fila-form">
                <button className="btn-principal" onClick={guardarProducto}>
                  {modoCrear ? "Crear producto" : "Guardar cambios"}
                </button>
                <button className="btn-secundario" onClick={cerrarModal}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Catalogo
