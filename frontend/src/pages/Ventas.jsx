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
    setClienteId("")
    setFecha("")
    setCarrito([])
    await cargarDatos()
  }

  async function borrarVenta(ventaId) {
    const resultado = await apiDelete(`/negocios/${negocioId}/ventas/${ventaId}/`)
    setMensaje(resultado.mensaje)
    await cargarDatos()
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
        {mensaje && <p>{mensaje}</p>}
      </form>

      <h2>Listado de ventas</h2>
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
          {ventas.map((v) => (
            <tr key={v.id}>
              <td>{v.fecha}</td>
              <td>{nombreCliente(v.cliente_id)}</td>
              <td>{v.monto_total}</td>
              <td><button onClick={() => borrarVenta(v.id)}>Borrar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Ventas