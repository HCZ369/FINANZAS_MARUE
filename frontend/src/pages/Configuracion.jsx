import { useState, useEffect } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client"

function Configuracion({ negocioId }) {
  const [negocios, setNegocios] = useState([])
  const [categorias, setCategorias] = useState([])
  const [inyecciones, setInyecciones] = useState([])
  const [productos, setProductos] = useState([])
  const [lotes, setLotes] = useState([])

  // Negocio
  const [nombreNegocio, setNombreNegocio] = useState("")
  const [editandoNegocioId, setEditandoNegocioId] = useState(null)

  // Categoría
  const [nombreCategoria, setNombreCategoria] = useState("")
  const [tipoCategoria, setTipoCategoria] = useState("gasto")
  const [editandoCategoriaId, setEditandoCategoriaId] = useState(null)

  // Inyección
  const [montoInyeccion, setMontoInyeccion] = useState("")
  const [fechaInyeccion, setFechaInyeccion] = useState("")
  const [notaInyeccion, setNotaInyeccion] = useState("")
  const [editandoInyeccionId, setEditandoInyeccionId] = useState(null)

  // Lote
  const [fechaLote, setFechaLote] = useState("")
  const [tasaCambio, setTasaCambio] = useState("")
  const [descripcionLote, setDescripcionLote] = useState("")
  const [editandoLoteId, setEditandoLoteId] = useState(null)

  // Producto
  const [nombreProducto, setNombreProducto] = useState("")
  const [precioProducto, setPrecioProducto] = useState("")
  const [loteProducto, setLoteProducto] = useState("")
  const [costoUsdProducto, setCostoUsdProducto] = useState("")
  const [cantidadProducto, setCantidadProducto] = useState("")
  const [sugerencia, setSugerencia] = useState(null)
  const [editandoProductoId, setEditandoProductoId] = useState(null)

  // UI
  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState("exito")

  useEffect(() => {
    cargarDatos()
  }, [negocioId])

  async function cargarDatos() {
    try {
      setNegocios(await apiGet("/negocios/"))
      setCategorias(await apiGet(`/negocios/${negocioId}/categorias/`))
      setInyecciones(await apiGet(`/negocios/${negocioId}/inyecciones/`))
      setProductos(await apiGet(`/negocios/${negocioId}/productos/`))
      setLotes(await apiGet(`/negocios/${negocioId}/lotes/`))
    } catch (error) {
      mostrarMsg("Error cargando datos: " + error.message, "error")
    }
  }

  function mostrarMsg(texto, tipo) {
    setMensaje(texto)
    setTipoMensaje(tipo || "exito")
    if (tipo !== "error") {
      setTimeout(() => setMensaje(""), 4000)
    }
  }

  function formatearMonto(valor) {
    return Number(valor).toLocaleString("es-PY")
  }

  // =============================================
  // NEGOCIOS
  // =============================================
  async function guardarNegocio(evento) {
    evento.preventDefault()
    try {
      const datos = { nombre: nombreNegocio }
      const resultado = editandoNegocioId
        ? await apiPut(`/negocios/${editandoNegocioId}/`, datos)
        : await apiPost("/negocios/", datos)
      mostrarMsg(resultado.mensaje)
      setNombreNegocio("")
      setEditandoNegocioId(null)
      await cargarDatos()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  function editarNegocio(n) {
    setEditandoNegocioId(n.id)
    setNombreNegocio(n.nombre)
  }

  async function borrarNegocio(id) {
    if (!confirm("¿Eliminar este negocio? Se perderán todos sus datos.")) {
      return
    }
    try {
      const resultado = await apiDelete(`/negocios/${id}/`)
      mostrarMsg(resultado.mensaje)
      await cargarDatos()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  // =============================================
  // CATEGORÍAS
  // =============================================
  async function guardarCategoria(evento) {
    evento.preventDefault()
    try {
      const datos = { nombre: nombreCategoria, tipo: tipoCategoria }
      const resultado = editandoCategoriaId
        ? await apiPut(`/negocios/${negocioId}/categorias/${editandoCategoriaId}/`, datos)
        : await apiPost(`/negocios/${negocioId}/categorias/`, datos)
      mostrarMsg(resultado.mensaje)
      setNombreCategoria("")
      setEditandoCategoriaId(null)
      await cargarDatos()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  function editarCategoria(c) {
    setEditandoCategoriaId(c.id)
    setNombreCategoria(c.nombre)
    setTipoCategoria(c.tipo)
  }

  async function borrarCategoria(id) {
    if (!confirm("¿Eliminar esta categoría?")) {
      return
    }
    try {
      const resultado = await apiDelete(`/negocios/${negocioId}/categorias/${id}/`)
      mostrarMsg(resultado.mensaje)
      await cargarDatos()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  // =============================================
  // INYECCIONES
  // =============================================
  async function guardarInyeccion(evento) {
    evento.preventDefault()
    try {
      const datos = { monto: montoInyeccion, fecha: fechaInyeccion, nota: notaInyeccion }
      const resultado = editandoInyeccionId
        ? await apiPut(`/negocios/${negocioId}/inyecciones/${editandoInyeccionId}/`, datos)
        : await apiPost(`/negocios/${negocioId}/inyecciones/`, datos)
      mostrarMsg(resultado.mensaje)
      setMontoInyeccion("")
      setFechaInyeccion("")
      setNotaInyeccion("")
      setEditandoInyeccionId(null)
      await cargarDatos()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  function editarInyeccion(i) {
    setEditandoInyeccionId(i.id)
    setMontoInyeccion(i.monto)
    setFechaInyeccion(i.fecha)
    setNotaInyeccion(i.nota || "")
  }

  async function borrarInyeccion(id) {
    if (!confirm("¿Eliminar esta inyección?")) {
      return
    }
    try {
      const resultado = await apiDelete(`/negocios/${negocioId}/inyecciones/${id}/`)
      mostrarMsg(resultado.mensaje)
      await cargarDatos()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  // =============================================
  // LOTES
  // =============================================
  async function guardarLote(evento) {
    evento.preventDefault()
    try {
      const datos = { fecha: fechaLote, tasa_cambio: tasaCambio, descripcion: descripcionLote }
      const resultado = editandoLoteId
        ? await apiPut(`/negocios/${negocioId}/lotes/${editandoLoteId}/`, datos)
        : await apiPost(`/negocios/${negocioId}/lotes/`, datos)
      mostrarMsg(resultado.mensaje)
      setFechaLote("")
      setTasaCambio("")
      setDescripcionLote("")
      setEditandoLoteId(null)
      await cargarDatos()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  function editarLote(l) {
    setEditandoLoteId(l.id)
    setFechaLote(l.fecha)
    setTasaCambio(l.tasa_cambio)
    setDescripcionLote(l.descripcion || "")
  }

  async function borrarLote(id) {
    if (!confirm("¿Eliminar este lote?")) {
      return
    }
    try {
      const resultado = await apiDelete(`/negocios/${negocioId}/lotes/${id}/`)
      mostrarMsg(resultado.mensaje)
      await cargarDatos()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  // =============================================
  // PRODUCTOS
  // =============================================
  async function guardarProducto(evento) {
    evento.preventDefault()
    try {
      let costoUnitario = null
      if (sugerencia !== null) {
        costoUnitario = sugerencia.costo_unitario
      }
      const datos = {
        nombre: nombreProducto,
        precio: precioProducto,
        costo: costoUnitario,
        lote_id: loteProducto,
        costo_usd: costoUsdProducto,
        cantidad_comprada: cantidadProducto,
      }
      const resultado = editandoProductoId
        ? await apiPut(`/negocios/${negocioId}/productos/${editandoProductoId}/`, datos)
        : await apiPost(`/negocios/${negocioId}/productos/`, datos)
      mostrarMsg(resultado.mensaje)
      limpiarFormProducto()
      await cargarDatos()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  function limpiarFormProducto() {
    setNombreProducto("")
    setPrecioProducto("")
    setLoteProducto("")
    setCostoUsdProducto("")
    setCantidadProducto("")
    setSugerencia(null)
    setEditandoProductoId(null)
  }

  function editarProducto(p) {
    setEditandoProductoId(p.id)
    setNombreProducto(p.nombre)
    setPrecioProducto(p.precio)
    setLoteProducto(p.lote_id || "")
    setCostoUsdProducto(p.costo_usd || "")
    setCantidadProducto(p.cantidad_comprada || "")
    setSugerencia(null)
  }

  async function borrarProducto(id) {
    if (!confirm("¿Eliminar este producto?")) {
      return
    }
    try {
      const resultado = await apiDelete(`/negocios/${negocioId}/productos/${id}/`)
      mostrarMsg(resultado.mensaje)
      await cargarDatos()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  async function pedirSugerencia() {
    if (loteProducto === "" || costoUsdProducto === "") {
      mostrarMsg("Elegí un lote y cargá el costo USD para calcular la sugerencia", "error")
      return
    }
    try {
      const datos = { lote_id: loteProducto, costo_usd: costoUsdProducto }
      const resultado = await apiPost(`/negocios/${negocioId}/sugerencia-precio/`, datos)
      setSugerencia(resultado)
      setPrecioProducto(resultado.precio_sugerido)
    } catch (error) {
      mostrarMsg("Error calculando sugerencia: " + error.message, "error")
    }
  }

  return (
    <div>
      <h1>Configuración</h1>

      {mensaje && (
        <div className={tipoMensaje === "error" ? "msg msg-error" : "msg msg-exito"}>
          {mensaje}
          <button className="btn-cerrar-msg" onClick={() => setMensaje("")}>×</button>
        </div>
      )}

      {/* NEGOCIOS */}
      <section>
        <h2>Negocios</h2>
        <form onSubmit={guardarNegocio}>
          <input
            type="text"
            placeholder="Nombre del negocio"
            value={nombreNegocio}
            onChange={(e) => setNombreNegocio(e.target.value)}
          />
          <div className="fila-form">
            <button type="submit" className="btn-principal">
              {editandoNegocioId ? "Guardar" : "Crear negocio"}
            </button>
            {editandoNegocioId && (
              <button type="button" className="btn-secundario" onClick={() => { setEditandoNegocioId(null); setNombreNegocio("") }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
        <div className="lista-items">
          {negocios.map((n) => (
            <div className="fila-item" key={n.id}>
              <span>{n.nombre}</span>
              <div className="acciones">
                <button className="btn-accion" onClick={() => editarNegocio(n)}>Editar</button>
                <button className="btn-borrar" onClick={() => borrarNegocio(n.id)}>Borrar</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section>
        <h2>Categorías</h2>
        <form onSubmit={guardarCategoria}>
          <input
            type="text"
            placeholder="Nombre de la categoría"
            value={nombreCategoria}
            onChange={(e) => setNombreCategoria(e.target.value)}
          />
          <select value={tipoCategoria} onChange={(e) => setTipoCategoria(e.target.value)}>
            <option value="gasto">Gasto</option>
            <option value="ingreso">Ingreso</option>
          </select>
          <div className="fila-form">
            <button type="submit" className="btn-principal">
              {editandoCategoriaId ? "Guardar" : "Crear categoría"}
            </button>
            {editandoCategoriaId && (
              <button type="button" className="btn-secundario" onClick={() => { setEditandoCategoriaId(null); setNombreCategoria("") }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
        <div className="lista-items">
          {categorias.map((c) => (
            <div className="fila-item" key={c.id}>
              <span>{c.nombre} <span className="etiqueta-tipo">({c.tipo})</span></span>
              <div className="acciones">
                <button className="btn-accion" onClick={() => editarCategoria(c)}>Editar</button>
                <button className="btn-borrar" onClick={() => borrarCategoria(c.id)}>Borrar</button>
              </div>
            </div>
          ))}
          {categorias.length === 0 && <p className="lista-vacia">Sin categorías</p>}
        </div>
      </section>

      {/* INYECCIONES */}
      <section>
        <h2>Inyecciones de capital</h2>
        <form onSubmit={guardarInyeccion}>
          <div className="grid-form-config">
            <div className="campo">
              <label>Monto</label>
              <input
                type="number"
                placeholder="0"
                value={montoInyeccion}
                onChange={(e) => setMontoInyeccion(e.target.value)}
              />
            </div>
            <div className="campo">
              <label>Fecha</label>
              <input
                type="date"
                value={fechaInyeccion}
                onChange={(e) => setFechaInyeccion(e.target.value)}
              />
            </div>
          </div>
          <div className="campo">
            <label>Nota (opcional)</label>
            <input
              type="text"
              placeholder="Ej: compra de lote mayo"
              value={notaInyeccion}
              onChange={(e) => setNotaInyeccion(e.target.value)}
            />
          </div>
          <div className="fila-form">
            <button type="submit" className="btn-principal">
              {editandoInyeccionId ? "Guardar" : "Registrar inyección"}
            </button>
            {editandoInyeccionId && (
              <button type="button" className="btn-secundario" onClick={() => { setEditandoInyeccionId(null); setMontoInyeccion(""); setFechaInyeccion(""); setNotaInyeccion("") }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
        <div className="lista-items">
          {inyecciones.map((i) => (
            <div className="fila-item" key={i.id}>
              <span>
                <strong>{formatearMonto(i.monto)}</strong> — {i.fecha}
                {i.nota ? ` (${i.nota})` : ""}
              </span>
              <div className="acciones">
                <button className="btn-accion" onClick={() => editarInyeccion(i)}>Editar</button>
                <button className="btn-borrar" onClick={() => borrarInyeccion(i.id)}>Borrar</button>
              </div>
            </div>
          ))}
          {inyecciones.length === 0 && <p className="lista-vacia">Sin inyecciones</p>}
        </div>
      </section>

      {/* LOTES */}
      <section>
        <h2>Lotes de compra</h2>
        <form onSubmit={guardarLote}>
          <div className="grid-form-config">
            <div className="campo">
              <label>Fecha</label>
              <input
                type="date"
                value={fechaLote}
                onChange={(e) => setFechaLote(e.target.value)}
              />
            </div>
            <div className="campo">
              <label>Tasa de cambio</label>
              <input
                type="number"
                placeholder="Ej: 7350"
                value={tasaCambio}
                onChange={(e) => setTasaCambio(e.target.value)}
              />
            </div>
          </div>
          <div className="campo">
            <label>Descripción (opcional)</label>
            <input
              type="text"
              placeholder="Ej: Lote AliExpress mayo"
              value={descripcionLote}
              onChange={(e) => setDescripcionLote(e.target.value)}
            />
          </div>
          <div className="fila-form">
            <button type="submit" className="btn-principal">
              {editandoLoteId ? "Guardar" : "Crear lote"}
            </button>
            {editandoLoteId && (
              <button type="button" className="btn-secundario" onClick={() => { setEditandoLoteId(null); setFechaLote(""); setTasaCambio(""); setDescripcionLote("") }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
        <div className="lista-items">
          {lotes.map((l) => (
            <div className="fila-item" key={l.id}>
              <span>
                {l.fecha} — Tasa <strong>{formatearMonto(l.tasa_cambio)}</strong>
                {l.descripcion ? ` (${l.descripcion})` : ""}
              </span>
              <div className="acciones">
                <button className="btn-accion" onClick={() => editarLote(l)}>Editar</button>
                <button className="btn-borrar" onClick={() => borrarLote(l.id)}>Borrar</button>
              </div>
            </div>
          ))}
          {lotes.length === 0 && <p className="lista-vacia">Sin lotes</p>}
        </div>
      </section>

      {/* PRODUCTOS */}
      <section>
        <h2>Productos</h2>
        <form onSubmit={guardarProducto}>
          <div className="campo">
            <label>Nombre</label>
            <input
              type="text"
              placeholder="Nombre del producto"
              value={nombreProducto}
              onChange={(e) => setNombreProducto(e.target.value)}
            />
          </div>
          <div className="grid-form-config">
            <div className="campo">
              <label>Lote</label>
              <select value={loteProducto} onChange={(e) => setLoteProducto(e.target.value)}>
                <option value="">Seleccionar lote</option>
                {lotes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.fecha} — {l.descripcion || `Lote ${l.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label>Costo USD</label>
              <input
                type="number"
                placeholder="0.00"
                step="any"
                value={costoUsdProducto}
                onChange={(e) => setCostoUsdProducto(e.target.value)}
              />
            </div>
          </div>
          <div className="grid-form-config">
            <div className="campo">
              <label>Cantidad comprada</label>
              <input
                type="number"
                placeholder="0"
                value={cantidadProducto}
                onChange={(e) => setCantidadProducto(e.target.value)}
              />
            </div>
            <div className="campo">
              <label>&nbsp;</label>
              <button type="button" className="btn-secundario" onClick={pedirSugerencia} style={{ width: "100%" }}>
                Calcular sugerencia
              </button>
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
            <input
              type="number"
              placeholder="0"
              value={precioProducto}
              onChange={(e) => setPrecioProducto(e.target.value)}
            />
          </div>
          <div className="fila-form">
            <button type="submit" className="btn-principal">
              {editandoProductoId ? "Guardar" : "Crear producto"}
            </button>
            {editandoProductoId && (
              <button type="button" className="btn-secundario" onClick={limpiarFormProducto}>
                Cancelar
              </button>
            )}
          </div>
        </form>
        <div className="lista-items">
          {productos.map((p) => (
            <div className="fila-item" key={p.id}>
              <span>{p.nombre} — <strong>{formatearMonto(p.precio)}</strong></span>
              <div className="acciones">
                <button className="btn-accion" onClick={() => editarProducto(p)}>Editar</button>
                <button className="btn-borrar" onClick={() => borrarProducto(p.id)}>Borrar</button>
              </div>
            </div>
          ))}
          {productos.length === 0 && <p className="lista-vacia">Sin productos</p>}
        </div>
      </section>
    </div>
  )
}

export default Configuracion
