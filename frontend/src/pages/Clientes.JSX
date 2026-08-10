import { useState, useEffect } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client"

function Clientes({ negocioId }) {
  const [clientes, setClientes] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [ventasCliente, setVentasCliente] = useState([])

  const [nombre, setNombre] = useState("")
  const [contacto, setContacto] = useState("")
  const [fechaNacimiento, setFechaNacimiento] = useState("")
  const [correo, setCorreo] = useState("")
  const [ruc, setRuc] = useState("")
  const [editandoId, setEditandoId] = useState(null)
  const [mensaje, setMensaje] = useState("")

  useEffect(() => {
    cargarClientes()
  }, [negocioId])

  async function cargarClientes() {
    const datos = await apiGet(`/negocios/${negocioId}/clientes/`)
    setClientes(datos)
  }

  async function seleccionarCliente(cliente) {
    setClienteSeleccionado(cliente)
    const ventas = await apiGet(`/negocios/${negocioId}/clientes/${cliente.id}/ventas/`)
    setVentasCliente(ventas)
  }

  function editarCliente(cliente) {
    setEditandoId(cliente.id)
    setNombre(cliente.nombre)
    setContacto(cliente.contacto || "")
    setFechaNacimiento(cliente.fecha_nacimiento || "")
    setCorreo(cliente.correo || "")
    setRuc(cliente.ruc || "")
  }

  function limpiarFormulario() {
    setEditandoId(null)
    setNombre("")
    setContacto("")
    setFechaNacimiento("")
    setCorreo("")
    setRuc("")
  }

  async function guardarCliente(evento) {
    evento.preventDefault()
    const datos = {
      nombre: nombre,
      contacto: contacto,
      fecha_nacimiento: fechaNacimiento,
      correo: correo,
      ruc: ruc,
    }
    const resultado = editandoId
      ? await apiPut(`/negocios/${negocioId}/clientes/${editandoId}/`, datos)
      : await apiPost(`/negocios/${negocioId}/clientes/`, datos)
    setMensaje(resultado.mensaje)
    limpiarFormulario()
    await cargarClientes()
  }

  async function borrarCliente(id) {
    const resultado = await apiDelete(`/negocios/${negocioId}/clientes/${id}/`)
    setMensaje(resultado.mensaje)
    if (clienteSeleccionado && clienteSeleccionado.id === id) {
      setClienteSeleccionado(null)
      setVentasCliente([])
    }
    await cargarClientes()
  }

  return (
    <div>
      <h1>Clientes</h1>
      {mensaje && <p className="mensaje-exito">{mensaje}</p>}

      <div className="grid-clientes">
        <section>
          <h2>{editandoId ? "Editar cliente" : "Nuevo cliente"}</h2>
          <form onSubmit={guardarCliente}>
            <input type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <input type="text" placeholder="Contacto" value={contacto} onChange={(e) => setContacto(e.target.value)} />
            <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
            <input type="email" placeholder="Correo" value={correo} onChange={(e) => setCorreo(e.target.value)} />
            <input type="text" placeholder="RUC" value={ruc} onChange={(e) => setRuc(e.target.value)} />
            <button type="submit">{editandoId ? "Guardar" : "Crear cliente"}</button>
            {editandoId && <button type="button" onClick={limpiarFormulario}>Cancelar</button>}
          </form>

          <h2>Agenda</h2>
          <div className="lista-items">
            {clientes.map((c) => (
              <div className="fila-item" key={c.id}>
                <span onClick={() => seleccionarCliente(c)} style={{ cursor: "pointer" }}>
                  {c.nombre} {c.contacto ? `— ${c.contacto}` : ""}
                </span>
                <div className="acciones">
                  <button onClick={() => editarCliente(c)}>Editar</button>
                  <button className="btn-borrar" onClick={() => borrarCliente(c.id)}>Borrar</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>Ficha del cliente</h2>
          {clienteSeleccionado === null ? (
            <p>Seleccioná un cliente de la agenda para ver su ficha e historial.</p>
          ) : (
            <div>
              <p><strong>{clienteSeleccionado.nombre}</strong></p>
              <p>Contacto: {clienteSeleccionado.contacto || "—"}</p>
              <p>Correo: {clienteSeleccionado.correo || "—"}</p>
              <p>RUC: {clienteSeleccionado.ruc || "—"}</p>
              <p>Nacimiento: {clienteSeleccionado.fecha_nacimiento || "—"}</p>

              <h3>Historial de ventas</h3>
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasCliente.map((v) => (
                    <tr key={v.id}>
                      <td>{v.fecha}</td>
                      <td>{v.monto_total}</td>
                    </tr>
                  ))}
                  {ventasCliente.length === 0 && (
                    <tr><td colSpan="2">Sin ventas registradas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Clientes