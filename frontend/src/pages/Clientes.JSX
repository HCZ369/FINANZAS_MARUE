import { useState, useEffect } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client"

function Clientes({ negocioId }) {
  const [clientes, setClientes] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [ventasCliente, setVentasCliente] = useState([])
  const [busqueda, setBusqueda] = useState("")

  // Formulario
  const [nombre, setNombre] = useState("")
  const [celular, setCelular] = useState("")
  const [contacto, setContacto] = useState("")
  const [fechaNacimiento, setFechaNacimiento] = useState("")
  const [correo, setCorreo] = useState("")
  const [ruc, setRuc] = useState("")
  const [editandoId, setEditandoId] = useState(null)
  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState("exito")

  useEffect(() => {
    cargarClientes()
  }, [negocioId])

  async function cargarClientes() {
    try {
      const datos = await apiGet(`/negocios/${negocioId}/clientes/`)
      setClientes(datos)
    } catch (error) {
      mostrarMsg("Error cargando clientes: " + error.message, "error")
    }
  }

  function mostrarMsg(texto, tipo) {
    setMensaje(texto)
    setTipoMensaje(tipo || "exito")
    if (tipo !== "error") {
      setTimeout(() => setMensaje(""), 4000)
    }
  }

  // --- Búsqueda ---
  function clientesFiltrados() {
    if (!busqueda.trim()) {
      return clientes
    }
    const termino = busqueda.toLowerCase()
    const resultado = []
    for (let i = 0; i < clientes.length; i++) {
      const c = clientes[i]
      const coincide =
        c.nombre.toLowerCase().includes(termino) ||
        (c.celular && c.celular.includes(termino)) ||
        (c.contacto && c.contacto.toLowerCase().includes(termino)) ||
        (c.correo && c.correo.toLowerCase().includes(termino)) ||
        (c.ruc && c.ruc.includes(termino))
      if (coincide) {
        resultado.push(c)
      }
    }
    return resultado
  }

  // --- Selección y ficha ---
  async function seleccionarCliente(cliente) {
    setClienteSeleccionado(cliente)
    try {
      const ventas = await apiGet(`/negocios/${negocioId}/clientes/${cliente.id}/ventas/`)
      setVentasCliente(ventas)
    } catch (error) {
      setVentasCliente([])
    }
  }

  function calcularEstadisticas() {
    if (ventasCliente.length === 0) {
      return { totalGastado: 0, cantidadVentas: 0, ultimaCompra: "—", promedioCompra: 0 }
    }

    let totalGastado = 0
    let ultimaFecha = ""
    for (let i = 0; i < ventasCliente.length; i++) {
      totalGastado = totalGastado + Number(ventasCliente[i].monto_total)
      if (ventasCliente[i].fecha > ultimaFecha) {
        ultimaFecha = ventasCliente[i].fecha
      }
    }

    return {
      totalGastado: totalGastado,
      cantidadVentas: ventasCliente.length,
      ultimaCompra: ultimaFecha || "—",
      promedioCompra: Math.round(totalGastado / ventasCliente.length),
    }
  }

  // --- CRUD ---
  function editarCliente(cliente) {
    setEditandoId(cliente.id)
    setNombre(cliente.nombre)
    setCelular(cliente.celular || "")
    setContacto(cliente.contacto || "")
    setFechaNacimiento(cliente.fecha_nacimiento || "")
    setCorreo(cliente.correo || "")
    setRuc(cliente.ruc || "")
  }

  function limpiarFormulario() {
    setEditandoId(null)
    setNombre("")
    setCelular("")
    setContacto("")
    setFechaNacimiento("")
    setCorreo("")
    setRuc("")
  }

  async function guardarCliente(evento) {
    evento.preventDefault()
    if (!nombre.trim()) {
      mostrarMsg("El nombre es obligatorio", "error")
      return
    }

    const datos = {
      nombre: nombre,
      celular: celular,
      contacto: contacto,
      fecha_nacimiento: fechaNacimiento,
      correo: correo,
      ruc: ruc,
    }

    try {
      const resultado = editandoId
        ? await apiPut(`/negocios/${negocioId}/clientes/${editandoId}/`, datos)
        : await apiPost(`/negocios/${negocioId}/clientes/`, datos)
      mostrarMsg(resultado.mensaje)
      limpiarFormulario()
      await cargarClientes()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  async function borrarCliente(id) {
    if (!confirm("¿Eliminar este cliente?")) {
      return
    }
    try {
      const resultado = await apiDelete(`/negocios/${negocioId}/clientes/${id}/`)
      mostrarMsg(resultado.mensaje)
      if (clienteSeleccionado && clienteSeleccionado.id === id) {
        setClienteSeleccionado(null)
        setVentasCliente([])
      }
      await cargarClientes()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  function formatearMonto(monto) {
    return Number(monto).toLocaleString("es-PY")
  }

  const stats = calcularEstadisticas()

  return (
    <div className="pagina-clientes">
      <h1>Clientes</h1>

      {mensaje && (
        <div className={tipoMensaje === "error" ? "msg msg-error" : "msg msg-exito"}>
          {mensaje}
          <button className="btn-cerrar-msg" onClick={() => setMensaje("")}>×</button>
        </div>
      )}

      <div className="grid-clientes">
        {/* === COLUMNA IZQUIERDA: Formulario + Lista === */}
        <section className="col-lista">
          <h2>{editandoId ? "Editar cliente" : "Nuevo cliente"}</h2>
          <form onSubmit={guardarCliente} className="form-cliente">
            <input
              type="text"
              placeholder="Nombre *"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <input
              type="tel"
              placeholder="Celular"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
            />
            <input
              type="text"
              placeholder="Contacto / Instagram / Red social"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
            />
            <input
              type="email"
              placeholder="Correo"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
            <div className="fila-form">
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                title="Fecha de nacimiento"
              />
              <input
                type="text"
                placeholder="RUC"
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
              />
            </div>
            <div className="fila-form">
              <button type="submit" className="btn-principal">
                {editandoId ? "Guardar cambios" : "Crear cliente"}
              </button>
              {editandoId && (
                <button type="button" className="btn-secundario" onClick={limpiarFormulario}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="barra-busqueda">
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <span className="contador">{clientesFiltrados().length} clientes</span>
          </div>

          <div className="lista-clientes">
            {clientesFiltrados().map((c) => (
              <div
                className={
                  clienteSeleccionado && clienteSeleccionado.id === c.id
                    ? "item-cliente seleccionado"
                    : "item-cliente"
                }
                key={c.id}
              >
                <div className="info-cliente" onClick={() => seleccionarCliente(c)}>
                  <span className="nombre-cliente">{c.nombre}</span>
                  <span className="detalle-cliente">
                    {c.celular || c.contacto || "Sin contacto"}
                  </span>
                </div>
                <div className="acciones-cliente">
                  <button className="btn-accion" onClick={() => editarCliente(c)}>Editar</button>
                  <button className="btn-borrar" onClick={() => borrarCliente(c.id)}>Borrar</button>
                </div>
              </div>
            ))}
            {clientesFiltrados().length === 0 && (
              <p className="lista-vacia">
                {busqueda ? "Sin resultados para \"" + busqueda + "\"" : "No hay clientes registrados"}
              </p>
            )}
          </div>
        </section>

        {/* === COLUMNA DERECHA: Ficha del cliente === */}
        <section className="col-ficha">
          {clienteSeleccionado === null ? (
            <div className="ficha-vacia">
              <p>Seleccioná un cliente para ver su ficha e historial.</p>
            </div>
          ) : (
            <div className="ficha-cliente">
              <h2>{clienteSeleccionado.nombre}</h2>

              <div className="datos-cliente">
                <div className="dato">
                  <span className="etiqueta">Celular</span>
                  <span className="valor">{clienteSeleccionado.celular || "—"}</span>
                </div>
                <div className="dato">
                  <span className="etiqueta">Contacto</span>
                  <span className="valor">{clienteSeleccionado.contacto || "—"}</span>
                </div>
                <div className="dato">
                  <span className="etiqueta">Correo</span>
                  <span className="valor">{clienteSeleccionado.correo || "—"}</span>
                </div>
                <div className="dato">
                  <span className="etiqueta">RUC</span>
                  <span className="valor">{clienteSeleccionado.ruc || "—"}</span>
                </div>
                <div className="dato">
                  <span className="etiqueta">Nacimiento</span>
                  <span className="valor">{clienteSeleccionado.fecha_nacimiento || "—"}</span>
                </div>
              </div>

              {/* Estadísticas del cliente */}
              <div className="stats-cliente">
                <div className="stat">
                  <span className="stat-valor">{formatearMonto(stats.totalGastado)}</span>
                  <span className="stat-etiqueta">Total gastado</span>
                </div>
                <div className="stat">
                  <span className="stat-valor">{stats.cantidadVentas}</span>
                  <span className="stat-etiqueta">Compras</span>
                </div>
                <div className="stat">
                  <span className="stat-valor">{formatearMonto(stats.promedioCompra)}</span>
                  <span className="stat-etiqueta">Promedio</span>
                </div>
                <div className="stat">
                  <span className="stat-valor">{stats.ultimaCompra}</span>
                  <span className="stat-etiqueta">Última compra</span>
                </div>
              </div>

              {/* Historial */}
              <h3>Historial de compras</h3>
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasCliente.map((v) => (
                    <tr key={v.id}>
                      <td>{v.fecha}</td>
                      <td className="monto">{formatearMonto(v.monto_total)}</td>
                      <td>{v.metodo_pago || "—"}</td>
                    </tr>
                  ))}
                  {ventasCliente.length === 0 && (
                    <tr><td colSpan="3" className="celda-vacia">Sin compras registradas</td></tr>
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
