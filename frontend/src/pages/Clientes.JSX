import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from "../api/client"
import {
  normalizarTexto,
  convertirNumero,
  formatearFecha,
  formatearMonto,
  formatearCantidad,
  obtenerIniciales,
} from "../utils"

const FORMULARIO_INICIAL = {
  nombre: "",
  contacto: "",
  fechaNacimiento: "",
  correo: "",
  ruc: "",
}

const ETIQUETAS_PAGO = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
}

function Clientes({ negocioId }) {
  const temporizadorMensaje = useRef(null)

  const [clientes, setClientes] = useState([])
  const [clienteSeleccionadoId, setClienteSeleccionadoId] =
    useState(null)
  const [ventasCliente, setVentasCliente] = useState([])

  const [busqueda, setBusqueda] = useState("")
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [editandoId, setEditandoId] = useState(null)

  const [mensaje, setMensaje] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [cargandoFicha, setCargandoFicha] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState(null)

  const mostrarMensaje = useCallback((texto, tipo = "exito") => {
    if (temporizadorMensaje.current) {
      window.clearTimeout(temporizadorMensaje.current)
    }

    setMensaje({ texto, tipo })

    if (tipo !== "error") {
      temporizadorMensaje.current = window.setTimeout(() => {
        setMensaje(null)
      }, 4000)
    }
  }, [])

  const cargarClientes = useCallback(async () => {
    if (!negocioId) {
      setClientes([])
      setCargando(false)
      return
    }

    try {
      setCargando(true)

      const respuesta = await apiGet(
        `/negocios/${negocioId}/clientes/`
      )

      setClientes(Array.isArray(respuesta) ? respuesta : [])
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudieron cargar los clientes.",
        "error"
      )
    } finally {
      setCargando(false)
    }
  }, [negocioId, mostrarMensaje])

  useEffect(() => {
    cargarClientes()
  }, [cargarClientes])

  useEffect(() => {
    return () => {
      if (temporizadorMensaje.current) {
        window.clearTimeout(temporizadorMensaje.current)
      }
    }
  }, [])

  const clienteSeleccionado = useMemo(() => {
    return (
      clientes.find(
        (cliente) =>
          String(cliente.id) === String(clienteSeleccionadoId)
      ) || null
    )
  }, [clientes, clienteSeleccionadoId])

  const clientesFiltrados = useMemo(() => {
    const termino = normalizarTexto(busqueda)

    return clientes
      .filter((cliente) => {
        if (!termino) return true

        return [
          cliente.nombre,
          cliente.contacto,
          cliente.correo,
          cliente.ruc,
        ].some((campo) =>
          normalizarTexto(campo).includes(termino)
        )
      })
      .sort((a, b) =>
        String(a.nombre || "").localeCompare(
          String(b.nombre || ""),
          "es",
          { sensitivity: "base" }
        )
      )
  }, [clientes, busqueda])

  const estadisticas = useMemo(() => {
    const totalGastado = ventasCliente.reduce(
      (total, venta) =>
        total + convertirNumero(venta.monto_total),
      0
    )

    const ventasOrdenadas = [...ventasCliente].sort((a, b) =>
      String(b.fecha || "").localeCompare(String(a.fecha || ""))
    )

    return {
      totalGastado,
      cantidadVentas: ventasCliente.length,
      promedioCompra:
        ventasCliente.length > 0
          ? totalGastado / ventasCliente.length
          : 0,
      ultimaCompra: ventasOrdenadas[0]?.fecha || null,
    }
  }, [ventasCliente])

  const formularioValido = formulario.nombre.trim().length > 0

  function actualizarFormulario(campo, valor) {
    setFormulario((formularioActual) => ({
      ...formularioActual,
      [campo]: valor,
    }))
  }

  async function seleccionarCliente(cliente) {
    setClienteSeleccionadoId(cliente.id)
    setVentasCliente([])

    try {
      setCargandoFicha(true)

      const respuesta = await apiGet(
        `/negocios/${negocioId}/clientes/${cliente.id}/ventas/`
      )

      setVentasCliente(
        Array.isArray(respuesta) ? respuesta : []
      )
    } catch (error) {
      setVentasCliente([])

      mostrarMensaje(
        error?.message ||
          "No se pudo cargar el historial del cliente.",
        "error"
      )
    } finally {
      setCargandoFicha(false)
    }
  }

  function iniciarEdicion(cliente) {
    setEditandoId(cliente.id)

    setFormulario({
      nombre: cliente.nombre || "",
      contacto: cliente.contacto || "",
      fechaNacimiento: cliente.fecha_nacimiento || "",
      correo: cliente.correo || "",
      ruc: cliente.ruc || "",
    })
  }

  function limpiarFormulario() {
    setEditandoId(null)
    setFormulario(FORMULARIO_INICIAL)
  }

  function validarFormulario() {
    if (!formulario.nombre.trim()) {
      return "El nombre del cliente es obligatorio."
    }

    if (
      formulario.correo.trim() &&
      !esCorreoValido(formulario.correo)
    ) {
      return "Ingresá un correo válido."
    }

    return null
  }

  async function guardarCliente(evento) {
    evento.preventDefault()

    const errorValidacion = validarFormulario()

    if (errorValidacion) {
      mostrarMensaje(errorValidacion, "error")
      return
    }

    const datos = {
      nombre: formulario.nombre.trim(),
      contacto: formulario.contacto.trim() || null,
      fecha_nacimiento: formulario.fechaNacimiento || null,
      correo: formulario.correo.trim() || null,
      ruc: formulario.ruc.trim() || null,
    }

    try {
      setGuardando(true)

      const resultado = editandoId
        ? await apiPut(
            `/negocios/${negocioId}/clientes/${editandoId}/`,
            datos
          )
        : await apiPost(
            `/negocios/${negocioId}/clientes/`,
            datos
          )

      mostrarMensaje(
        resultado?.mensaje ||
          (editandoId
            ? "Cliente actualizado correctamente."
            : "Cliente creado correctamente.")
      )

      limpiarFormulario()
      await cargarClientes()
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudo guardar el cliente.",
        "error"
      )
    } finally {
      setGuardando(false)
    }
  }

  async function borrarCliente(cliente) {
    const debeEliminarse = window.confirm(
      `¿Eliminar a "${cliente.nombre}"? Esta acción no se puede deshacer.`
    )

    if (!debeEliminarse) return

    try {
      setEliminandoId(cliente.id)

      const resultado = await apiDelete(
        `/negocios/${negocioId}/clientes/${cliente.id}/`
      )

      setClientes((clientesActuales) =>
        clientesActuales.filter(
          (item) => String(item.id) !== String(cliente.id)
        )
      )

      if (
        String(clienteSeleccionadoId) === String(cliente.id)
      ) {
        setClienteSeleccionadoId(null)
        setVentasCliente([])
      }

      if (String(editandoId) === String(cliente.id)) {
        limpiarFormulario()
      }

      mostrarMensaje(
        resultado?.mensaje || "Cliente eliminado correctamente."
      )
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudo eliminar el cliente.",
        "error"
      )
    } finally {
      setEliminandoId(null)
    }
  }

  if (cargando) {
    return (
      <main className="pagina-clientes">
        <h1>Clientes</h1>
        <p className="mensaje-cargando">
          Cargando clientes...
        </p>
      </main>
    )
  }

  return (
    <main className="pagina-clientes">
      <header className="encabezado-pagina">
        <div>
          <h1>Clientes</h1>
          <p className="subtitulo-pagina">
            Administrá clientes y consultá sus compras.
          </p>
        </div>
      </header>

      {mensaje && (
        <div
          className={
            mensaje.tipo === "error"
              ? "msg msg-error"
              : "msg msg-exito"
          }
          role={mensaje.tipo === "error" ? "alert" : "status"}
        >
          <span>{mensaje.texto}</span>

          <button
            type="button"
            className="btn-cerrar-msg"
            onClick={() => setMensaje(null)}
            aria-label="Cerrar mensaje"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid-clientes">
        <section className="col-lista">
          <div className="cabecera-seccion">
            <div>
              <h2>
                {editandoId ? "Editar cliente" : "Nuevo cliente"}
              </h2>

              <p>
                {editandoId
                  ? "Modificá los datos del cliente."
                  : "Registrá un nuevo cliente."}
              </p>
            </div>
          </div>

          <form
            className="form-cliente"
            onSubmit={guardarCliente}
          >
            <div className="campo">
              <label htmlFor="cliente-nombre">Nombre</label>

              <input
                id="cliente-nombre"
                type="text"
                placeholder="Nombre completo"
                value={formulario.nombre}
                onChange={(evento) =>
                  actualizarFormulario(
                    "nombre",
                    evento.target.value
                  )
                }
                maxLength={150}
                required
              />
            </div>

            <div className="fila-form">
              <div className="campo">
                <label htmlFor="cliente-contacto">
                  Contacto / Celular
                </label>

                <input
                  id="cliente-contacto"
                  type="text"
                  placeholder="0981 000 000"
                  value={formulario.contacto}
                  onChange={(evento) =>
                    actualizarFormulario(
                      "contacto",
                      evento.target.value
                    )
                  }
                />
              </div>

              <div className="campo">
                <label htmlFor="cliente-ruc">RUC</label>

                <input
                  id="cliente-ruc"
                  type="text"
                  placeholder="RUC o documento"
                  value={formulario.ruc}
                  onChange={(evento) =>
                    actualizarFormulario(
                      "ruc",
                      evento.target.value
                    )
                  }
                />
              </div>
            </div>

            <div className="fila-form">
              <div className="campo">
                <label htmlFor="cliente-correo">Correo</label>

                <input
                  id="cliente-correo"
                  type="email"
                  value={formulario.correo}
                  onChange={(evento) =>
                    actualizarFormulario(
                      "correo",
                      evento.target.value
                    )
                  }
                />
              </div>

              <div className="campo">
                <label htmlFor="cliente-nacimiento">
                  Fecha de nacimiento
                </label>

                <input
                  id="cliente-nacimiento"
                  type="date"
                  value={formulario.fechaNacimiento}
                  onChange={(evento) =>
                    actualizarFormulario(
                      "fechaNacimiento",
                      evento.target.value
                    )
                  }
                />
              </div>
            </div>

            <div className="acciones-formulario-clientes">
              {editandoId && (
                <button
                  type="button"
                  className="btn-secundario"
                  onClick={limpiarFormulario}
                  disabled={guardando}
                >
                  Cancelar
                </button>
              )}

              <button
                type="submit"
                className="btn-principal"
                disabled={!formularioValido || guardando}
              >
                {guardando
                  ? "Guardando..."
                  : editandoId
                    ? "Guardar cambios"
                    : "Crear cliente"}
              </button>
            </div>
          </form>

          <div className="barra-busqueda">
            <div className="campo buscador-clientes">
              <label htmlFor="buscar-cliente">
                Buscar clientes
              </label>

              <input
                id="buscar-cliente"
                type="search"
                placeholder="Nombre, contacto, correo o RUC"
                value={busqueda}
                onChange={(evento) =>
                  setBusqueda(evento.target.value)
                }
              />
            </div>

            <span className="contador">
              {clientesFiltrados.length}{" "}
              {clientesFiltrados.length === 1
                ? "cliente"
                : "clientes"}
            </span>
          </div>

          <div className="lista-clientes">
            {clientesFiltrados.map((cliente) => {
              const seleccionado =
                String(clienteSeleccionadoId) ===
                String(cliente.id)

              return (
                <article
                  key={cliente.id}
                  className={
                    seleccionado
                      ? "item-cliente seleccionado"
                      : "item-cliente"
                  }
                >
                  <button
                    type="button"
                    className="info-cliente"
                    onClick={() => seleccionarCliente(cliente)}
                    aria-pressed={seleccionado}
                  >
                    <span
                      className="cliente-inicial"
                      aria-hidden="true"
                    >
                      {obtenerIniciales(cliente.nombre)}
                    </span>

                    <span className="cliente-texto">
                      <span className="nombre-cliente">
                        {cliente.nombre}
                      </span>

                      <span className="detalle-cliente">
                        {cliente.contacto ||
                          cliente.correo ||
                          "Sin datos de contacto"}
                      </span>
                    </span>
                  </button>

                  <div className="acciones-cliente">
                    <button
                      type="button"
                      className="btn-accion"
                      onClick={() => iniciarEdicion(cliente)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="btn-borrar"
                      onClick={() => borrarCliente(cliente)}
                      disabled={eliminandoId === cliente.id}
                    >
                      {eliminandoId === cliente.id
                        ? "Eliminando..."
                        : "Eliminar"}
                    </button>
                  </div>
                </article>
              )
            })}

            {clientesFiltrados.length === 0 && (
              <div className="lista-vacia">
                <p>
                  {busqueda.trim()
                    ? `No hay resultados para "${busqueda.trim()}".`
                    : "No hay clientes registrados."}
                </p>

                {busqueda.trim() && (
                  <button
                    type="button"
                    className="btn-secundario"
                    onClick={() => setBusqueda("")}
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="col-ficha">
          {!clienteSeleccionado ? (
            <div className="ficha-vacia">
              <div>
                <span className="ficha-vacia-simbolo">+</span>
                <h2>Seleccioná un cliente</h2>
                <p>
                  Elegí un cliente para consultar sus datos y su
                  historial de compras.
                </p>
              </div>
            </div>
          ) : (
            <div className="ficha-cliente">
              <div className="ficha-cliente-cabecera">
                <div className="ficha-cliente-identidad">
                  <span className="ficha-cliente-inicial">
                    {obtenerIniciales(clienteSeleccionado.nombre)}
                  </span>

                  <div>
                    <span className="ficha-etiqueta">
                      Ficha del cliente
                    </span>

                    <h2>{clienteSeleccionado.nombre}</h2>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-accion"
                  onClick={() =>
                    iniciarEdicion(clienteSeleccionado)
                  }
                >
                  Editar
                </button>
              </div>

              <div className="datos-cliente">
                <DatoCliente
                  etiqueta="Contacto"
                  valor={clienteSeleccionado.contacto}
                />

                <DatoCliente
                  etiqueta="Correo"
                  valor={clienteSeleccionado.correo}
                />

                <DatoCliente
                  etiqueta="RUC"
                  valor={clienteSeleccionado.ruc}
                />

                <DatoCliente
                  etiqueta="Nacimiento"
                  valor={formatearFecha(
                    clienteSeleccionado.fecha_nacimiento, "Sin registro"
                  )}
                />
              </div>

              {cargandoFicha ? (
                <div className="ficha-cargando">
                  Cargando historial...
                </div>
              ) : (
                <>
                  <div className="stats-cliente">
                    <Metrica
                      etiqueta="Total gastado"
                      valor={formatearMonto(
                        estadisticas.totalGastado
                      )}
                      destacada
                    />

                    <Metrica
                      etiqueta="Compras"
                      valor={formatearCantidad(
                        estadisticas.cantidadVentas
                      )}
                    />

                    <Metrica
                      etiqueta="Promedio"
                      valor={formatearMonto(
                        estadisticas.promedioCompra
                      )}
                    />

                    <Metrica
                      etiqueta="Última compra"
                      valor={formatearFecha(
                        estadisticas.ultimaCompra, "Sin registro"
                      )}
                    />
                  </div>

                  <div className="historial-cliente-cabecera">
                    <h3>Historial de compras</h3>

                    <span className="contador">
                      {ventasCliente.length} registros
                    </span>
                  </div>

                  <div className="contenedor-tabla">
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th scope="col">Fecha</th>
                          <th scope="col">Total</th>
                          <th scope="col">Pago</th>
                        </tr>
                      </thead>

                      <tbody>
                        {ventasCliente.map((venta) => (
                          <tr key={venta.id}>
                            <td>
                              {formatearFecha(venta.fecha)}
                            </td>

                            <td className="monto">
                              {formatearMonto(
                                venta.monto_total
                              )}
                            </td>

                            <td>
                              {ETIQUETAS_PAGO[
                                venta.metodo_pago
                              ] ||
                                venta.metodo_pago ||
                                "Sin especificar"}
                            </td>
                          </tr>
                        ))}

                        {ventasCliente.length === 0 && (
                          <tr>
                            <td
                              colSpan={3}
                              className="celda-vacia"
                            >
                              Sin compras registradas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function DatoCliente({ etiqueta, valor }) {
  return (
    <div className="dato">
      <span className="etiqueta">{etiqueta}</span>
      <span className="valor">{valor || "No registrado"}</span>
    </div>
  )
}

function Metrica({ etiqueta, valor, destacada = false }) {
  return (
    <div className={destacada ? "stat stat-destacada" : "stat"}>
      <span className="stat-valor">{valor}</span>
      <span className="stat-etiqueta">{etiqueta}</span>
    </div>
  )
}

function esCorreoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
}

export default Clientes