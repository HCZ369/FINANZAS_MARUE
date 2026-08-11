import { useState, useEffect } from "react"
import { apiGet, apiPost, apiDelete } from "../api/client"

function Ventas({ negocioId }) {
  const [ventas, setVentas] = useState([])
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [clienteId, setClienteId] = useState("")
  const [fecha, setFecha] = useState("")
  const [carrito, setCarrito] = useState([])
  const [mensaje, setMensaje] = useState("")
  const [avisos, setAvisos] = useState([])
  const [mostrarTodo, setMostrarTodo] = useState(false)
  const [detalleVenta, setDetalleVenta] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [negocioId])

  async function cargarDatos() {
    const ventasData = await apiGet(`/negocios/${negocioId}/ventas/`)
    const clientesData = await apiGet(`/negocios/${negocioId}/clientes/`)
    const productosData = await apiGet(`/negocios/${negocioId}/productos/`)
    setVentas(ventasData)
    setClientes(clientesData)
    setProductos(productosData)
  }

  function nombreCliente(clienteId) {
    const cliente = clientes.find((c) => c.id === clienteId)
    return cliente ? cliente.nombre : clienteId
  }

  function nombreProducto(productoId) {
    const producto = productos.find((p) => p.id === productoId)
    return producto ? producto.nombre : productoId
  }

  // Filtra las ventas segun el check: mes actual o todo
  function ventasFiltradas() {
    if (mostrarTodo) {
      return ventas
    }
    const ahora = new Date()
    const anioActual = ahora.getFullYear()
    const mesActual = ahora.getMonth() + 1

    const resultado = []
    for (let indice = 0; indice < ventas.length; indice++) {
      const venta = ventas[indice]
      const fechaVenta = new Date(venta.fecha)
      const anioVenta = fechaVenta.getFullYear()
      const mesVenta = fechaVenta.getMonth() + 1
      if (anioVenta === anioActual && mesVenta === mesActual) {
        resultado.push(venta)
      }
    }
    return resultado
  }

  function agregarAlCarrito() {
    setCarrito([...carrito, { producto_id: "", cantidad: 1 }])
  }

  function actualizarItemCarrito(indice, campo, valor) {
    const carritoActualizado = [...carrito]
    carritoActualizado[indice][campo] = valor
    setCarrito(carritoActualizado)
  }

  function quitarDelCarrito(indice) {
    const carritoActualizado = [...carrito]
    carritoActualizado.splice(indice, 1)
    setCarrito(carritoActualizado)
  }

  async function crearVenta(evento) {
    evento.preventDefault()
    const productosParaEnviar = carrito.map((item) => ({
      producto_id: Number(item.producto_id),
      cantidad: Number(item.cantidad),
    }))

    const resultado = await apiPost(`/negocios/${negocioId}/ventas/`, {
      cliente_id: Number(clienteId),
      fecha: fecha,
      productos: productosParaEnviar,
    })

    setMensaje(`${resultado.mensaje} — Total: ${resultado.monto_total}`)

    if (resultado.avisos && resultado.avisos.length > 0) {
      setAvisos(resultado.avisos)
    } else {
      setAvisos([])
    }

    setClienteId("")
    setFecha("")
    setCarrito([])
    await cargarDatos()
  }

  async function borrarVenta(ventaId) {
    const resultado = await apiDelete(`/negocios/${negocioId}/ventas/${ventaId}/`)
    setMensaje(resultado.mensaje)
    if (detalleVenta && detalleVenta.id === ventaId) {
      setDetalleVenta(null)
    }
    await cargarDatos()
  }

  async function verDetalle(ventaId) {
    const datos = await apiGet(`/negocios/${negocioId}/ventas/${ventaId}/`)
    setDetalleVenta(datos)
  }

  return (
    <div>
      <h1>Ventas</h1>

      <form onSubmit={crearVenta}>
        <div>
          <label>Cliente</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Seleccionar</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>

        <h3>Carrito</h3>
        {carrito.map((item, indice) => (
          <div key={indice} className="fila-carrito">
            <select
              value={item.producto_id}
              onChange={(e) => actualizarItemCarrito(indice, "producto_id", e.target.value)}
            >
              <option value="">Producto</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} — {p.precio}</option>
              ))}
            </select>
            <input
              type="number"
              value={item.cantidad}
              min="1"
              onChange={(e) => actualizarItemCarrito(indice, "cantidad", e.target.value)}
              style={{ width: "80px" }}
            />
            <button type="button" onClick={() => quitarDelCarrito(indice)}>X</button>
          </div>
        ))}
        <button type="button" onClick={agregarAlCarrito}>+ Agregar producto</button>
        <button type="submit">Registrar venta</button>
        {mensaje && <p className="mensaje-exito">{mensaje}</p>}
      </form>

      {avisos.length > 0 && (
        <div className="caja-aviso">
          <strong>Avisos de stock:</strong>
          {avisos.map((aviso, indice) => (
            <p key={indice}>{aviso.producto} quedó en stock {aviso.stock}</p>
          ))}
        </div>
      )}

      <div className="barra-filtro">
        <h2>{mostrarTodo ? "Historial completo" : "Ventas del mes actual"}</h2>
        <label>
          <input
            type="checkbox"
            checked={mostrarTodo}
            onChange={(e) => setMostrarTodo(e.target.checked)}
          />
          Mostrar historial completo
        </label>
      </div>

      <table className="tabla">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Total</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {ventasFiltradas().map((v) => (
            <tr key={v.id}>
              <td>{v.fecha}</td>
              <td>{nombreCliente(v.cliente_id)}</td>
              <td>{v.monto_total}</td>
              <td>
                <button onClick={() => verDetalle(v.id)}>Ver detalle</button>
                <button className="btn-borrar" onClick={() => borrarVenta(v.id)}>Borrar</button>
              </td>
            </tr>
          ))}
          {ventasFiltradas().length === 0 && (
            <tr><td colSpan="4">Sin ventas en este período</td></tr>
          )}
        </tbody>
      </table>

      {detalleVenta !== null && (
        <div className="caja-detalle">
          <h3>Detalle de venta del {detalleVenta.fecha}</h3>
          <p>Cliente: {nombreCliente(detalleVenta.cliente_id)}</p>
          <table className="tabla">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio unit.</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {detalleVenta.productos.map((d) => (
                <tr key={d.id}>
                  <td>{nombreProducto(d.producto_id)}</td>
                  <td>{d.cantidad}</td>
                  <td>{d.precio_unitario}</td>
                  <td>{d.subtotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p><strong>Total: {detalleVenta.monto_total}</strong></p>
          <button onClick={() => setDetalleVenta(null)}>Cerrar</button>
        </div>
      )}
    </div>
  )
}

export default Ventas