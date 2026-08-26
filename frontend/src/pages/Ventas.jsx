import { useState, useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { apiGet, apiPost, apiDelete } from "../api/client"

function Ventas({ negocioId }) {
  const location = useLocation()

  const [ventas, setVentas] = useState([])
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])

  // --- Formulario de venta ---
  const [clienteId, setClienteId] = useState("")
  const [busquedaCliente, setBusquedaCliente] = useState("")
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false)
  const [fecha, setFecha] = useState("")
  const [metodoPago, setMetodoPago] = useState("efectivo")
  const [notas, setNotas] = useState("")
  const [carrito, setCarrito] = useState([])

  // --- Búsqueda de productos en carrito ---
  const [busquedaProducto, setBusquedaProducto] = useState("")
  const [indiceItemActivo, setIndiceItemActivo] = useState(null)

  // --- UI ---
  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState("exito") // "exito" | "error"
  const [avisos, setAvisos] = useState([])
  const [filtroVentas, setFiltroVentas] = useState("mes") // "mes" | "semana" | "hoy" | "todo"
  const [detalleVenta, setDetalleVenta] = useState(null)

  const refListaClientes = useRef(null)

  useEffect(() => {
    cargarDatos()
  }, [negocioId])

  // Recibir productos preseleccionados desde Catálogo
  useEffect(() => {
    if (location.state && location.state.carritoInicial) {
      setCarrito(location.state.carritoInicial)
      // Limpiar el state para que no se repita al navegar
      window.history.replaceState({}, "")
    }
  }, [location.state])

  // Cerrar dropdown de clientes al hacer click fuera
  useEffect(() => {
    function cerrarDropdown(evento) {
      if (refListaClientes.current && !refListaClientes.current.contains(evento.target)) {
        setMostrarListaClientes(false)
      }
    }
    document.addEventListener("mousedown", cerrarDropdown)
    return () => document.removeEventListener("mousedown", cerrarDropdown)
  }, [])

  async function cargarDatos() {
    try {
      const ventasData = await apiGet(`/negocios/${negocioId}/ventas/`)
      const clientesData = await apiGet(`/negocios/${negocioId}/clientes/`)
      const productosData = await apiGet(`/negocios/${negocioId}/productos/`)
      setVentas(ventasData)
      setClientes(clientesData)
      setProductos(productosData)
    } catch (error) {
      mostrarMensaje("Error cargando datos: " + error.message, "error")
    }
  }

  function mostrarMensaje(texto, tipo) {
    setMensaje(texto)
    setTipoMensaje(tipo || "exito")
    if (tipo !== "error") {
      setTimeout(() => setMensaje(""), 5000)
    }
  }

  // --- Helpers de nombre ---
  function nombreCliente(id) {
    const cliente = clientes.find((c) => c.id === id)
    return cliente ? cliente.nombre : "—"
  }

  function nombreProducto(id) {
    const producto = productos.find((p) => p.id === id)
    return producto ? producto.nombre : "—"
  }

  function precioProducto(id) {
    const producto = productos.find((p) => p.id === id)
    return producto ? Number(producto.precio) : 0
  }

  // --- Filtro de clientes (búsqueda) ---
  function clientesFiltrados() {
    if (!busquedaCliente.trim()) {
      return clientes
    }
    const termino = busquedaCliente.toLowerCase()
    const resultado = []
    for (let i = 0; i < clientes.length; i++) {
      const c = clientes[i]
      const coincideNombre = c.nombre.toLowerCase().includes(termino)
      const coincideCelular = c.celular && c.celular.includes(termino)
      const coincideContacto = c.contacto && c.contacto.toLowerCase().includes(termino)
      if (coincideNombre || coincideCelular || coincideContacto) {
        resultado.push(c)
      }
    }
    return resultado
  }

  function seleccionarClienteBusqueda(cliente) {
    setClienteId(String(cliente.id))
    setBusquedaCliente(cliente.nombre)
    setMostrarListaClientes(false)
  }

  // --- Filtro de productos para carrito ---
  function productosFiltrados() {
    if (!busquedaProducto.trim()) {
      return productos
    }
    const termino = busquedaProducto.toLowerCase()
    const resultado = []
    for (let i = 0; i < productos.length; i++) {
      const p = productos[i]
      if (p.nombre.toLowerCase().includes(termino)) {
        resultado.push(p)
      }
    }
    return resultado
  }

  // --- Carrito ---
  function agregarProductoAlCarrito(producto) {
    // Verificar si ya está en el carrito
    for (let i = 0; i < carrito.length; i++) {
      if (carrito[i].producto_id === String(producto.id)) {
        const actualizado = [...carrito]
        actualizado[i].cantidad = actualizado[i].cantidad + 1
        setCarrito(actualizado)
        setBusquedaProducto("")
        setIndiceItemActivo(null)
        return
      }
    }

    const nuevoItem = {
      producto_id: String(producto.id),
      nombre: producto.nombre,
      cantidad: 1,
      precio_lista: Number(producto.precio),
      precio_vendido: Number(producto.precio), // por defecto = precio lista
    }
    setCarrito([...carrito, nuevoItem])
    setBusquedaProducto("")
    setIndiceItemActivo(null)
  }

  function actualizarItemCarrito(indice, campo, valor) {
    const actualizado = [...carrito]
    if (campo === "cantidad") {
      actualizado[indice].cantidad = Math.max(1, Number(valor))
    } else if (campo === "precio_vendido") {
      actualizado[indice].precio_vendido = valor === "" ? "" : Number(valor)
    }
    setCarrito(actualizado)
  }

  function quitarDelCarrito(indice) {
    const actualizado = [...carrito]
    actualizado.splice(indice, 1)
    setCarrito(actualizado)
  }

  function calcularSubtotal(item) {
    const precio = item.precio_vendido === "" ? 0 : item.precio_vendido
    return precio * item.cantidad
  }

  function calcularTotalCarrito() {
    let total = 0
    for (let i = 0; i < carrito.length; i++) {
      total = total + calcularSubtotal(carrito[i])
    }
    return total
  }

  function calcularDescuentoTotal() {
    let descuento = 0
    for (let i = 0; i < carrito.length; i++) {
      const item = carrito[i]
      const diff = item.precio_lista - (item.precio_vendido === "" ? 0 : item.precio_vendido)
      if (diff > 0) {
        descuento = descuento + (diff * item.cantidad)
      }
    }
    return descuento
  }

  // --- Crear venta ---
  async function crearVenta(evento) {
    evento.preventDefault()

    if (!clienteId) {
      mostrarMensaje("Seleccioná un cliente", "error")
      return
    }
    if (!fecha) {
      mostrarMensaje("Ingresá la fecha", "error")
      return
    }
    if (carrito.length === 0) {
      mostrarMensaje("Agregá al menos un producto", "error")
      return
    }

    // Validar que todos los items tengan precio
    for (let i = 0; i < carrito.length; i++) {
      if (carrito[i].precio_vendido === "" || carrito[i].precio_vendido <= 0) {
        mostrarMensaje("El precio vendido debe ser mayor a 0 para todos los items", "error")
        return
      }
    }

    const productosParaEnviar = []
    for (let i = 0; i < carrito.length; i++) {
      productosParaEnviar.push({
        producto_id: Number(carrito[i].producto_id),
        cantidad: Number(carrito[i].cantidad),
        precio_vendido: Number(carrito[i].precio_vendido),
      })
    }

    try {
      const resultado = await apiPost(`/negocios/${negocioId}/ventas/`, {
        cliente_id: Number(clienteId),
        fecha: fecha,
        metodo_pago: metodoPago,
        notas: notas,
        productos: productosParaEnviar,
      })

      mostrarMensaje(`${resultado.mensaje} — Total: ${resultado.monto_total}`)

      if (resultado.avisos && resultado.avisos.length > 0) {
        setAvisos(resultado.avisos)
      } else {
        setAvisos([])
      }

      // Limpiar formulario
      setClienteId("")
      setBusquedaCliente("")
      setFecha("")
      setMetodoPago("efectivo")
      setNotas("")
      setCarrito([])
      await cargarDatos()
    } catch (error) {
      mostrarMensaje("Error: " + error.message, "error")
    }
  }

  // --- Borrar venta ---
  async function borrarVenta(ventaId) {
    if (!confirm("¿Eliminar esta venta?")) {
      return
    }
    try {
      const resultado = await apiDelete(`/negocios/${negocioId}/ventas/${ventaId}/`)
      mostrarMensaje(resultado.mensaje)
      if (detalleVenta && detalleVenta.id === ventaId) {
        setDetalleVenta(null)
      }
      await cargarDatos()
    } catch (error) {
      mostrarMensaje("Error: " + error.message, "error")
    }
  }

  // --- Detalle ---
  async function verDetalle(ventaId) {
    try {
      const datos = await apiGet(`/negocios/${negocioId}/ventas/${ventaId}/`)
      setDetalleVenta(datos)
    } catch (error) {
      mostrarMensaje("Error: " + error.message, "error")
    }
  }

  // --- Filtro de ventas por período ---
  function ventasFiltradas() {
    if (filtroVentas === "todo") {
      return ventas
    }

    const ahora = new Date()
    const resultado = []

    for (let i = 0; i < ventas.length; i++) {
      const venta = ventas[i]
      const fechaVenta = new Date(venta.fecha)

      if (filtroVentas === "hoy") {
        const mismoAnio = fechaVenta.getFullYear() === ahora.getFullYear()
        const mismoMes = fechaVenta.getMonth() === ahora.getMonth()
        const mismoDia = fechaVenta.getDate() === ahora.getDate()
        if (mismoAnio && mismoMes && mismoDia) {
          resultado.push(venta)
        }
      } else if (filtroVentas === "semana") {
        const haceUnaSemana = new Date(ahora)
        haceUnaSemana.setDate(haceUnaSemana.getDate() - 7)
        if (fechaVenta >= haceUnaSemana) {
          resultado.push(venta)
        }
      } else if (filtroVentas === "mes") {
        const mismoAnio = fechaVenta.getFullYear() === ahora.getFullYear()
        const mismoMes = fechaVenta.getMonth() === ahora.getMonth()
        if (mismoAnio && mismoMes) {
          resultado.push(venta)
        }
      }
    }
    return resultado
  }

  function totalVentasFiltradas() {
    const lista = ventasFiltradas()
    let total = 0
    for (let i = 0; i < lista.length; i++) {
      total = total + Number(lista[i].monto_total)
    }
    return total
  }

  // --- Formateo ---
  function formatearMonto(monto) {
    return Number(monto).toLocaleString("es-PY")
  }

  function etiquetaMetodoPago(metodo) {
    const mapa = {
      efectivo: "Efectivo",
      transferencia: "Transferencia",
      tarjeta: "Tarjeta",
      fiado: "Fiado",
    }
    return mapa[metodo] || metodo || "—"
  }

  return (
    <div className="pagina-ventas">
      <h1>Ventas</h1>

      {mensaje && (
        <div className={tipoMensaje === "error" ? "msg msg-error" : "msg msg-exito"}>
          {mensaje}
          <button className="btn-cerrar-msg" onClick={() => setMensaje("")}>×</button>
        </div>
      )}

      {avisos.length > 0 && (
        <div className="msg msg-aviso">
          <strong>Avisos de stock:</strong>
          {avisos.map((aviso, i) => (
            <p key={i}>{aviso.producto} quedó en stock {aviso.stock}</p>
          ))}
          <button className="btn-cerrar-msg" onClick={() => setAvisos([])}>×</button>
        </div>
      )}

      {/* ===== FORMULARIO DE VENTA ===== */}
      <section className="seccion-formulario">
        <h2>Registrar venta</h2>
        <form onSubmit={crearVenta}>
          <div className="grid-form-venta">
            {/* Buscador de cliente */}
            <div className="campo" ref={refListaClientes}>
              <label>Cliente</label>
              <input
                type="text"
                placeholder="Buscar por nombre o celular..."
                value={busquedaCliente}
                onChange={(e) => {
                  setBusquedaCliente(e.target.value)
                  setMostrarListaClientes(true)
                  setClienteId("")
                }}
                onFocus={() => setMostrarListaClientes(true)}
              />
              {mostrarListaClientes && (
                <div className="dropdown-busqueda">
                  {clientesFiltrados().length === 0 && (
                    <div className="dropdown-vacio">Sin resultados</div>
                  )}
                  {clientesFiltrados().map((c) => (
                    <div
                      key={c.id}
                      className="dropdown-item"
                      onClick={() => seleccionarClienteBusqueda(c)}
                    >
                      <span className="dropdown-nombre">{c.nombre}</span>
                      {c.celular && <span className="dropdown-detalle">{c.celular}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="campo">
              <label>Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>

            <div className="campo">
              <label>Método de pago</label>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="fiado">Fiado</option>
              </select>
            </div>
          </div>

          {/* Buscador de productos */}
          <div className="seccion-carrito">
            <h3>Productos</h3>
            <div className="buscador-producto">
              <input
                type="text"
                placeholder="Buscar producto por nombre..."
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
              />
              {busquedaProducto.trim() && (
                <div className="dropdown-busqueda dropdown-productos">
                  {productosFiltrados().length === 0 && (
                    <div className="dropdown-vacio">Sin resultados</div>
                  )}
                  {productosFiltrados().map((p) => (
                    <div
                      key={p.id}
                      className="dropdown-item"
                      onClick={() => agregarProductoAlCarrito(p)}
                    >
                      <span className="dropdown-nombre">{p.nombre}</span>
                      <span className="dropdown-precio">{formatearMonto(p.precio)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Items del carrito */}
            {carrito.length > 0 && (
              <table className="tabla tabla-carrito">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>P. Lista</th>
                    <th>P. Vendido</th>
                    <th>Desc.</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {carrito.map((item, indice) => {
                    const descuentoItem = (item.precio_lista - (item.precio_vendido === "" ? 0 : item.precio_vendido)) * item.cantidad
                    return (
                      <tr key={indice}>
                        <td>{item.nombre}</td>
                        <td>
                          <input
                            type="number"
                            className="input-cantidad"
                            value={item.cantidad}
                            min="1"
                            onChange={(e) => actualizarItemCarrito(indice, "cantidad", e.target.value)}
                          />
                        </td>
                        <td className="monto-lista">{formatearMonto(item.precio_lista)}</td>
                        <td>
                          <input
                            type="number"
                            className="input-precio"
                            value={item.precio_vendido}
                            min="0"
                            step="any"
                            onChange={(e) => actualizarItemCarrito(indice, "precio_vendido", e.target.value)}
                          />
                        </td>
                        <td className={descuentoItem > 0 ? "monto-descuento" : ""}>
                          {descuentoItem > 0 ? "-" + formatearMonto(descuentoItem) : "—"}
                        </td>
                        <td className="monto-subtotal">{formatearMonto(calcularSubtotal(item))}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-quitar"
                            onClick={() => quitarDelCarrito(indice)}
                          >×</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4"></td>
                    <td className="monto-descuento">
                      {calcularDescuentoTotal() > 0 ? "-" + formatearMonto(calcularDescuentoTotal()) : ""}
                    </td>
                    <td className="monto-total-carrito">{formatearMonto(calcularTotalCarrito())}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}

            {carrito.length === 0 && (
              <p className="carrito-vacio">Buscá un producto arriba para agregarlo a la venta.</p>
            )}
          </div>

          {/* Notas */}
          <div className="campo campo-notas">
            <label>Notas (opcional)</label>
            <textarea
              placeholder="Ej: le fié la mitad, devolvió 1 unidad, etc."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows="2"
            />
          </div>

          <div className="fila-acciones-form">
            <span className="total-preview">
              Total: <strong>{formatearMonto(calcularTotalCarrito())}</strong>
            </span>
            <button type="submit" className="btn-principal" disabled={carrito.length === 0}>
              Registrar venta
            </button>
          </div>
        </form>
      </section>

      {/* ===== LISTADO DE VENTAS ===== */}
      <section className="seccion-listado">
        <div className="barra-filtro">
          <h2>Historial</h2>
          <div className="filtros-periodo">
            <button
              className={filtroVentas === "hoy" ? "btn-filtro activo" : "btn-filtro"}
              onClick={() => setFiltroVentas("hoy")}
            >Hoy</button>
            <button
              className={filtroVentas === "semana" ? "btn-filtro activo" : "btn-filtro"}
              onClick={() => setFiltroVentas("semana")}
            >Semana</button>
            <button
              className={filtroVentas === "mes" ? "btn-filtro activo" : "btn-filtro"}
              onClick={() => setFiltroVentas("mes")}
            >Mes</button>
            <button
              className={filtroVentas === "todo" ? "btn-filtro activo" : "btn-filtro"}
              onClick={() => setFiltroVentas("todo")}
            >Todo</button>
          </div>
          <span className="total-filtro">
            {ventasFiltradas().length} ventas — Total: {formatearMonto(totalVentasFiltradas())}
          </span>
        </div>

        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Pago</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ventasFiltradas().map((v) => (
              <tr key={v.id}>
                <td>{v.fecha}</td>
                <td>{nombreCliente(v.cliente_id)}</td>
                <td>{etiquetaMetodoPago(v.metodo_pago)}</td>
                <td className="monto">{formatearMonto(v.monto_total)}</td>
                <td className="acciones-celda">
                  <button className="btn-accion" onClick={() => verDetalle(v.id)}>Detalle</button>
                  <button className="btn-borrar" onClick={() => borrarVenta(v.id)}>Borrar</button>
                </td>
              </tr>
            ))}
            {ventasFiltradas().length === 0 && (
              <tr><td colSpan="5" className="celda-vacia">Sin ventas en este período</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* ===== DETALLE DE VENTA ===== */}
      {detalleVenta !== null && (
        <div className="modal-overlay" onClick={() => setDetalleVenta(null)}>
          <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
            <div className="modal-cabecera">
              <h3>Venta del {detalleVenta.fecha}</h3>
              <button className="btn-cerrar-modal" onClick={() => setDetalleVenta(null)}>×</button>
            </div>
            <p>Cliente: <strong>{nombreCliente(detalleVenta.cliente_id)}</strong></p>
            {detalleVenta.metodo_pago && (
              <p>Pago: {etiquetaMetodoPago(detalleVenta.metodo_pago)}</p>
            )}
            {detalleVenta.notas && (
              <p className="nota-detalle">Notas: {detalleVenta.notas}</p>
            )}

            <table className="tabla">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>P. Unit.</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detalleVenta.productos.map((d) => (
                  <tr key={d.id}>
                    <td>{nombreProducto(d.producto_id)}</td>
                    <td>{d.cantidad}</td>
                    <td>{formatearMonto(d.precio_unitario)}</td>
                    <td>{formatearMonto(d.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="total-detalle">Total: <strong>{formatearMonto(detalleVenta.monto_total)}</strong></p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Ventas
