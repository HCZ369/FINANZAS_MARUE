import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { apiDelete, apiGet, apiPost } from "../api/client"
import {
  normalizarTexto,
  convertirNumero,
  convertirFechaLocal,
  obtenerFechaActual,
  formatearFecha,
  formatearMontoDecimal,
} from "../utils"

const FILTROS_VENTA = {
  HOY: "hoy",
  SEMANA: "semana",
  MES: "mes",
  TODO: "todo",
}

const METODOS_PAGO = {
  EFECTIVO: "efectivo",
  TRANSFERENCIA: "transferencia",
}

const ETIQUETAS_PAGO = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
}

function prepararCarritoInicial(carritoInicial) {
  if (!Array.isArray(carritoInicial)) return []

  return carritoInicial
    .filter((item) => item?.producto_id)
    .map((item) => {
      const precioLista = convertirNumero(
        item.precio_lista ?? item.precio ?? item.precio_vendido
      )

      return {
        producto_id: String(item.producto_id),
        nombre: item.nombre || "Producto",
        cantidad: Math.max(1, convertirNumero(item.cantidad, 1)),
        precio_lista: precioLista,
        precio_vendido: convertirNumero(
          item.precio_vendido ?? precioLista
        ),
      }
    })
}

function Ventas({ negocioId }) {
  const location = useLocation()
  const navigate = useNavigate()

  const referenciaClientes = useRef(null)
  const referenciaProductos = useRef(null)
  const temporizadorMensaje = useRef(null)

  const [ventas, setVentas] = useState([])
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])

  const [clienteId, setClienteId] = useState("")
  const [busquedaCliente, setBusquedaCliente] = useState("")
  const [mostrarClientes, setMostrarClientes] = useState(false)

  const [fecha, setFecha] = useState(obtenerFechaActual)
  const [metodoPago, setMetodoPago] = useState(METODOS_PAGO.EFECTIVO)
  const [notas, setNotas] = useState("")
  const [carrito, setCarrito] = useState([])

  const [busquedaProducto, setBusquedaProducto] = useState("")
  const [mostrarProductos, setMostrarProductos] = useState(false)

  const [filtroVentas, setFiltroVentas] = useState(FILTROS_VENTA.MES)
  const [detalleVenta, setDetalleVenta] = useState(null)

  const [mensaje, setMensaje] = useState(null)
  const [avisos, setAvisos] = useState([])

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [cargandoDetalleId, setCargandoDetalleId] = useState(null)

  const mostrarMensaje = useCallback((texto, tipo = "exito") => {
    if (temporizadorMensaje.current) {
      window.clearTimeout(temporizadorMensaje.current)
    }

    setMensaje({ texto, tipo })

    if (tipo !== "error") {
      temporizadorMensaje.current = window.setTimeout(() => {
        setMensaje(null)
      }, 5000)
    }
  }, [])

  const cargarDatos = useCallback(async () => {
    if (!negocioId) {
      setVentas([])
      setClientes([])
      setProductos([])
      setCargando(false)
      return
    }

    try {
      setCargando(true)

      const [ventasData, clientesData, productosData] = await Promise.all([
        apiGet(`/negocios/${negocioId}/ventas/`),
        apiGet(`/negocios/${negocioId}/clientes/`),
        apiGet(`/negocios/${negocioId}/productos/`),
      ])

      setVentas(Array.isArray(ventasData) ? ventasData : [])
      setClientes(Array.isArray(clientesData) ? clientesData : [])
      setProductos(Array.isArray(productosData) ? productosData : [])
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudieron cargar los datos de ventas.",
        "error"
      )
    } finally {
      setCargando(false)
    }
  }, [negocioId, mostrarMensaje])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  useEffect(() => {
    const carritoInicial = location.state?.carritoInicial

    if (!Array.isArray(carritoInicial) || carritoInicial.length === 0) {
      return
    }

    setCarrito(prepararCarritoInicial(carritoInicial))

    navigate(location.pathname, {
      replace: true,
      state: {},
    })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    function cerrarListas(evento) {
      if (
        referenciaClientes.current &&
        !referenciaClientes.current.contains(evento.target)
      ) {
        setMostrarClientes(false)
      }

      if (
        referenciaProductos.current &&
        !referenciaProductos.current.contains(evento.target)
      ) {
        setMostrarProductos(false)
      }
    }

    document.addEventListener("mousedown", cerrarListas)

    return () => {
      document.removeEventListener("mousedown", cerrarListas)
    }
  }, [])

  useEffect(() => {
    function cerrarModalConEscape(evento) {
      if (evento.key === "Escape") {
        setDetalleVenta(null)
        setMostrarClientes(false)
        setMostrarProductos(false)
      }
    }

    document.addEventListener("keydown", cerrarModalConEscape)

    return () => {
      document.removeEventListener("keydown", cerrarModalConEscape)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (temporizadorMensaje.current) {
        window.clearTimeout(temporizadorMensaje.current)
      }
    }
  }, [])

  const clientesPorId = useMemo(() => {
    return new Map(
      clientes.map((cliente) => [String(cliente.id), cliente])
    )
  }, [clientes])

  const productosPorId = useMemo(() => {
    return new Map(
      productos.map((producto) => [String(producto.id), producto])
    )
  }, [productos])

  const clientesFiltrados = useMemo(() => {
    const termino = normalizarTexto(busquedaCliente)

    if (!termino) {
      return clientes.slice(0, 20)
    }

    return clientes
      .filter((cliente) => {
        const nombre = normalizarTexto(cliente.nombre)
        const celular = normalizarTexto(cliente.celular)
        const contacto = normalizarTexto(cliente.contacto)

        return (
          nombre.includes(termino) ||
          celular.includes(termino) ||
          contacto.includes(termino)
        )
      })
      .slice(0, 20)
  }, [clientes, busquedaCliente])

  const idsProductosCarrito = useMemo(() => {
    return new Set(carrito.map((item) => String(item.producto_id)))
  }, [carrito])

  const productosFiltrados = useMemo(() => {
    const termino = normalizarTexto(busquedaProducto)

    if (!termino) return []

    return productos
      .filter((producto) => {
        const nombre = normalizarTexto(producto.nombre)
        return nombre.includes(termino)
      })
      .sort((a, b) => {
        const aEnCarrito = idsProductosCarrito.has(String(a.id))
        const bEnCarrito = idsProductosCarrito.has(String(b.id))

        if (aEnCarrito !== bEnCarrito) {
          return aEnCarrito ? 1 : -1
        }

        return String(a.nombre || "").localeCompare(
          String(b.nombre || ""),
          "es",
          { sensitivity: "base" }
        )
      })
      .slice(0, 20)
  }, [productos, busquedaProducto, idsProductosCarrito])

  const resumenCarrito = useMemo(() => {
    return carrito.reduce(
      (resumen, item) => {
        const cantidad = Math.max(1, convertirNumero(item.cantidad, 1))
        const precioLista = convertirNumero(item.precio_lista)
        const precioVendido = convertirNumero(item.precio_vendido)
        const subtotal = cantidad * precioVendido
        const diferencia = precioLista - precioVendido
        const descuento = diferencia > 0 ? diferencia * cantidad : 0

        resumen.total += subtotal
        resumen.descuento += descuento
        resumen.unidades += cantidad

        return resumen
      },
      {
        total: 0,
        descuento: 0,
        unidades: 0,
      }
    )
  }, [carrito])

  const ventasFiltradas = useMemo(() => {
    const ahora = new Date()
    const inicioHoy = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate()
    )

    const inicioSemana = new Date(inicioHoy)
    inicioSemana.setDate(inicioHoy.getDate() - 6)

    return ventas
      .filter((venta) => {
        if (filtroVentas === FILTROS_VENTA.TODO) {
          return true
        }

        const fechaVenta = convertirFechaLocal(venta.fecha)

        if (!fechaVenta) return false

        if (filtroVentas === FILTROS_VENTA.HOY) {
          return fechaVenta.getTime() === inicioHoy.getTime()
        }

        if (filtroVentas === FILTROS_VENTA.SEMANA) {
          return fechaVenta >= inicioSemana && fechaVenta <= ahora
        }

        if (filtroVentas === FILTROS_VENTA.MES) {
          return (
            fechaVenta.getFullYear() === ahora.getFullYear() &&
            fechaVenta.getMonth() === ahora.getMonth()
          )
        }

        return true
      })
      .sort((a, b) => {
        const fechaA = convertirFechaLocal(a.fecha)?.getTime() || 0
        const fechaB = convertirFechaLocal(b.fecha)?.getTime() || 0

        return fechaB - fechaA
      })
  }, [ventas, filtroVentas])

  const totalVentasFiltradas = useMemo(() => {
    return ventasFiltradas.reduce(
      (total, venta) => total + convertirNumero(venta.monto_total),
      0
    )
  }, [ventasFiltradas])

  const formularioValido = useMemo(() => {
    if (!clienteId || !fecha || carrito.length === 0) {
      return false
    }

    return carrito.every((item) => {
      const cantidad = convertirNumero(item.cantidad)
      const precio = convertirNumero(item.precio_vendido)

      return cantidad > 0 && precio > 0
    })
  }, [clienteId, fecha, carrito])

  function nombreCliente(id) {
    return clientesPorId.get(String(id))?.nombre || "Sin cliente"
  }

  function nombreProducto(id) {
    return productosPorId.get(String(id))?.nombre || "Producto eliminado"
  }

  function formatearMonto(monto) {
    return formatearMontoDecimal(monto)
  }

  function etiquetaMetodoPago(metodo) {
    return ETIQUETAS_PAGO[metodo] || metodo || "Sin especificar"
  }

  function seleccionarCliente(cliente) {
    setClienteId(String(cliente.id))
    setBusquedaCliente(cliente.nombre || "")
    setMostrarClientes(false)
  }

  function cambiarBusquedaCliente(valor) {
    setBusquedaCliente(valor)
    setClienteId("")
    setMostrarClientes(true)
  }

  function agregarProducto(producto) {
    const productoId = String(producto.id)

    setCarrito((carritoActual) => {
      const productoExistente = carritoActual.find(
        (item) => String(item.producto_id) === productoId
      )

      if (productoExistente) {
        return carritoActual.map((item) => {
          if (String(item.producto_id) !== productoId) {
            return item
          }

          return {
            ...item,
            cantidad: convertirNumero(item.cantidad, 1) + 1,
          }
        })
      }

      const precio = convertirNumero(producto.precio)

      return [
        ...carritoActual,
        {
          producto_id: productoId,
          nombre: producto.nombre || "Producto",
          cantidad: 1,
          precio_lista: precio,
          precio_vendido: precio,
        },
      ]
    })

    setBusquedaProducto("")
    setMostrarProductos(false)
  }

  function actualizarItem(productoId, campo, valor) {
    setCarrito((carritoActual) =>
      carritoActual.map((item) => {
        if (String(item.producto_id) !== String(productoId)) {
          return item
        }

        if (campo === "cantidad") {
          return {
            ...item,
            cantidad:
              valor === ""
                ? ""
                : Math.max(1, convertirNumero(valor, 1)),
          }
        }

        if (campo === "precio_vendido") {
          return {
            ...item,
            precio_vendido:
              valor === ""
                ? ""
                : Math.max(0, convertirNumero(valor)),
          }
        }

        return item
      })
    )
  }

  function quitarProducto(productoId) {
    setCarrito((carritoActual) =>
      carritoActual.filter(
        (item) => String(item.producto_id) !== String(productoId)
      )
    )
  }

  function calcularSubtotal(item) {
    const cantidad = convertirNumero(item.cantidad)
    const precio = convertirNumero(item.precio_vendido)

    return cantidad * precio
  }

  function calcularDescuentoItem(item) {
    const cantidad = convertirNumero(item.cantidad)
    const precioLista = convertirNumero(item.precio_lista)
    const precioVendido = convertirNumero(item.precio_vendido)
    const diferencia = precioLista - precioVendido

    return diferencia > 0 ? diferencia * cantidad : 0
  }

  function limpiarFormulario() {
    setClienteId("")
    setBusquedaCliente("")
    setMostrarClientes(false)
    setFecha(obtenerFechaActual())
    setMetodoPago(METODOS_PAGO.EFECTIVO)
    setNotas("")
    setCarrito([])
    setBusquedaProducto("")
    setMostrarProductos(false)
  }

  function validarFormulario() {
    if (!clienteId) {
      return "Seleccioná un cliente de la lista."
    }

    if (!fecha) {
      return "Ingresá la fecha de la venta."
    }

    if (carrito.length === 0) {
      return "Agregá al menos un producto."
    }

    const itemInvalido = carrito.find((item) => {
      const cantidad = convertirNumero(item.cantidad)
      const precio = convertirNumero(item.precio_vendido)

      return cantidad <= 0 || precio <= 0
    })

    if (itemInvalido) {
      return `Revisá la cantidad y el precio de "${itemInvalido.nombre}".`
    }

    return null
  }

  async function crearVenta(evento) {
    evento.preventDefault()

    const errorValidacion = validarFormulario()

    if (errorValidacion) {
      mostrarMensaje(errorValidacion, "error")
      return
    }

    const productosParaEnviar = carrito.map((item) => ({
      producto_id: Number(item.producto_id),
      cantidad: convertirNumero(item.cantidad),
      precio_vendido: convertirNumero(item.precio_vendido),
    }))

    try {
      setGuardando(true)
      setMensaje(null)

      const resultado = await apiPost(
        `/negocios/${negocioId}/ventas/`,
        {
          cliente_id: Number(clienteId),
          fecha,
          metodo_pago: metodoPago,
          notas: notas.trim(),
          productos: productosParaEnviar,
        }
      )

      const mensajeResultado =
        resultado?.mensaje || "Venta registrada correctamente."

      const montoResultado =
        resultado?.monto_total ?? resumenCarrito.total

      mostrarMensaje(
        `${mensajeResultado} Total: ${formatearMonto(montoResultado)}`
      )

      setAvisos(
        Array.isArray(resultado?.avisos) ? resultado.avisos : []
      )

      limpiarFormulario()
      await cargarDatos()
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudo registrar la venta.",
        "error"
      )
    } finally {
      setGuardando(false)
    }
  }

  async function borrarVenta(ventaId) {
    const debeEliminarse = window.confirm(
      "¿Eliminar esta venta? Esta acción no se puede deshacer."
    )

    if (!debeEliminarse) return

    try {
      setEliminandoId(ventaId)

      const resultado = await apiDelete(
        `/negocios/${negocioId}/ventas/${ventaId}/`
      )

      setVentas((ventasActuales) =>
        ventasActuales.filter((venta) => venta.id !== ventaId)
      )

      if (detalleVenta?.id === ventaId) {
        setDetalleVenta(null)
      }

      mostrarMensaje(
        resultado?.mensaje || "Venta eliminada correctamente."
      )
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudo eliminar la venta.",
        "error"
      )
    } finally {
      setEliminandoId(null)
    }
  }

  async function verDetalle(ventaId) {
    try {
      setCargandoDetalleId(ventaId)

      const datos = await apiGet(
        `/negocios/${negocioId}/ventas/${ventaId}/`
      )

      setDetalleVenta(datos)
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudo cargar el detalle de la venta.",
        "error"
      )
    } finally {
      setCargandoDetalleId(null)
    }
  }

  if (cargando) {
    return (
      <div className="pagina-ventas">
        <h1>Ventas</h1>
        <p className="mensaje-cargando">Cargando ventas...</p>
      </div>
    )
  }

  return (
    <div className="pagina-ventas">
      <header className="encabezado-pagina">
        <div>
          <h1>Ventas</h1>
          <p className="subtitulo-pagina">
            Registrá ventas y consultá el historial del negocio.
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

      {avisos.length > 0 && (
        <div className="msg msg-aviso" role="status">
          <div>
            <strong>Avisos de stock</strong>

            {avisos.map((aviso, indice) => (
              <p key={`${aviso.producto}-${indice}`}>
                {aviso.producto}: stock restante {aviso.stock}
              </p>
            ))}
          </div>

          <button
            type="button"
            className="btn-cerrar-msg"
            onClick={() => setAvisos([])}
            aria-label="Cerrar avisos"
          >
            ×
          </button>
        </div>
      )}

      <section className="seccion-formulario">
        <div className="cabecera-seccion">
          <div>
            <h2>Registrar venta</h2>
            <p>Completá los datos y agregá los productos vendidos.</p>
          </div>
        </div>

        <form onSubmit={crearVenta}>
          <div className="grid-form-venta">
            <div className="campo" ref={referenciaClientes}>
              <label htmlFor="cliente-venta">Cliente</label>

              <input
                id="cliente-venta"
                type="search"
                placeholder="Nombre, celular o contacto"
                value={busquedaCliente}
                onChange={(evento) =>
                  cambiarBusquedaCliente(evento.target.value)
                }
                onFocus={() => setMostrarClientes(true)}
                autoComplete="off"
                aria-expanded={mostrarClientes}
                aria-controls="lista-clientes-venta"
              />

              {mostrarClientes && (
                <div
                  id="lista-clientes-venta"
                  className="dropdown-busqueda"
                  role="listbox"
                >
                  {clientesFiltrados.length === 0 ? (
                    <div className="dropdown-vacio">
                      No se encontraron clientes.
                    </div>
                  ) : (
                    clientesFiltrados.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        className="dropdown-item"
                        onClick={() => seleccionarCliente(cliente)}
                        role="option"
                      >
                        <span className="dropdown-nombre">
                          {cliente.nombre}
                        </span>

                        {cliente.celular && (
                          <span className="dropdown-detalle">
                            {cliente.celular}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="campo">
              <label htmlFor="fecha-venta">Fecha</label>

              <input
                id="fecha-venta"
                type="date"
                value={fecha}
                onChange={(evento) => setFecha(evento.target.value)}
                required
              />
            </div>

            <div className="campo">
              <label htmlFor="metodo-pago">Método de pago</label>

              <select
                id="metodo-pago"
                value={metodoPago}
                onChange={(evento) =>
                  setMetodoPago(evento.target.value)
                }
              >
                <option value={METODOS_PAGO.EFECTIVO}>
                  Efectivo
                </option>
                <option value={METODOS_PAGO.TRANSFERENCIA}>
                  Transferencia
                </option>
                <option value={METODOS_PAGO.TARJETA}>
                  Tarjeta
                </option>
                <option value={METODOS_PAGO.FIADO}>
                  Fiado
                </option>
              </select>
            </div>
          </div>

          <div className="seccion-carrito">
            <div className="cabecera-carrito">
              <div>
                <h3>Productos</h3>
                <span className="contador">
                  {resumenCarrito.unidades} unidades
                </span>
              </div>
            </div>

            <div
              className="buscador-producto"
              ref={referenciaProductos}
            >
              <input
                type="search"
                placeholder="Buscar producto por nombre"
                value={busquedaProducto}
                onChange={(evento) => {
                  setBusquedaProducto(evento.target.value)
                  setMostrarProductos(true)
                }}
                onFocus={() => {
                  if (busquedaProducto.trim()) {
                    setMostrarProductos(true)
                  }
                }}
                autoComplete="off"
                aria-label="Buscar producto"
                aria-expanded={mostrarProductos}
                aria-controls="lista-productos-venta"
              />

              {mostrarProductos && busquedaProducto.trim() && (
                <div
                  id="lista-productos-venta"
                  className="dropdown-busqueda"
                  role="listbox"
                >
                  {productosFiltrados.length === 0 ? (
                    <div className="dropdown-vacio">
                      No se encontraron productos.
                    </div>
                  ) : (
                    productosFiltrados.map((producto) => {
                      const estaAgregado = idsProductosCarrito.has(
                        String(producto.id)
                      )

                      return (
                        <button
                          key={producto.id}
                          type="button"
                          className="dropdown-item"
                          onClick={() => agregarProducto(producto)}
                          role="option"
                        >
                          <span>
                            <span className="dropdown-nombre">
                              {producto.nombre}
                            </span>

                            {estaAgregado && (
                              <span className="dropdown-detalle">
                                Ya agregado
                              </span>
                            )}
                          </span>

                          <span className="dropdown-precio">
                            {formatearMonto(producto.precio)}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {carrito.length === 0 ? (
              <div className="carrito-vacio">
                <p>No agregaste productos todavía.</p>
                <span>
                  Usá el buscador para comenzar la venta.
                </span>
              </div>
            ) : (
              <div className="contenedor-tabla">
                <table className="tabla tabla-carrito">
                  <thead>
                    <tr>
                      <th scope="col">Producto</th>
                      <th scope="col">Cantidad</th>
                      <th scope="col">Precio lista</th>
                      <th scope="col">Precio vendido</th>
                      <th scope="col">Descuento</th>
                      <th scope="col">Subtotal</th>
                      <th scope="col">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {carrito.map((item) => {
                      const descuento = calcularDescuentoItem(item)

                      return (
                        <tr key={item.producto_id}>
                          <td>
                            <strong>{item.nombre}</strong>
                          </td>

                          <td>
                            <input
                              type="number"
                              className="input-cantidad"
                              value={item.cantidad}
                              min="1"
                              step="1"
                              onChange={(evento) =>
                                actualizarItem(
                                  item.producto_id,
                                  "cantidad",
                                  evento.target.value
                                )
                              }
                              aria-label={`Cantidad de ${item.nombre}`}
                            />
                          </td>

                          <td className="monto-lista">
                            {formatearMonto(item.precio_lista)}
                          </td>

                          <td>
                            <input
                              type="number"
                              className="input-precio"
                              value={item.precio_vendido}
                              min="0.01"
                              step="any"
                              onChange={(evento) =>
                                actualizarItem(
                                  item.producto_id,
                                  "precio_vendido",
                                  evento.target.value
                                )
                              }
                              aria-label={`Precio vendido de ${item.nombre}`}
                            />
                          </td>

                          <td
                            className={
                              descuento > 0
                                ? "monto-descuento"
                                : ""
                            }
                          >
                            {descuento > 0
                              ? `-${formatearMonto(descuento)}`
                              : "Sin descuento"}
                          </td>

                          <td className="monto-subtotal">
                            {formatearMonto(calcularSubtotal(item))}
                          </td>

                          <td>
                            <button
                              type="button"
                              className="btn-quitar"
                              onClick={() =>
                                quitarProducto(item.producto_id)
                              }
                              aria-label={`Quitar ${item.nombre}`}
                              title="Quitar producto"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td colSpan={4}>
                        <span className="resumen-unidades">
                          {resumenCarrito.unidades} unidades
                        </span>
                      </td>

                      <td className="monto-descuento">
                        {resumenCarrito.descuento > 0
                          ? `-${formatearMonto(
                              resumenCarrito.descuento
                            )}`
                          : ""}
                      </td>

                      <td className="monto-total-carrito">
                        {formatearMonto(resumenCarrito.total)}
                      </td>

                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="campo campo-notas">
            <label htmlFor="notas-venta">Notas opcionales</label>

            <textarea
              id="notas-venta"
              placeholder="Información adicional sobre la venta"
              value={notas}
              onChange={(evento) => setNotas(evento.target.value)}
              rows={3}
              maxLength={500}
            />

            <span className="contador contador-notas">
              {notas.length}/500
            </span>
          </div>

          <div className="fila-acciones-form">
            <div className="total-preview">
              <span>Total de la venta</span>
              <strong>{formatearMonto(resumenCarrito.total)}</strong>
            </div>

            <div className="acciones-formulario">
              <button
                type="button"
                className="btn-secundario"
                onClick={limpiarFormulario}
                disabled={guardando}
              >
                Limpiar
              </button>

              <button
                type="submit"
                className="btn-principal"
                disabled={!formularioValido || guardando}
              >
                {guardando ? "Registrando..." : "Registrar venta"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="seccion-listado">
        <div className="barra-filtro">
          <div>
            <h2>Historial</h2>
            <p>Ventas registradas en el período seleccionado.</p>
          </div>

          <div
            className="filtros-periodo"
            aria-label="Filtrar ventas por período"
          >
            {[
              [FILTROS_VENTA.HOY, "Hoy"],
              [FILTROS_VENTA.SEMANA, "7 días"],
              [FILTROS_VENTA.MES, "Mes"],
              [FILTROS_VENTA.TODO, "Todo"],
            ].map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                className={
                  filtroVentas === valor
                    ? "btn-filtro activo"
                    : "btn-filtro"
                }
                onClick={() => setFiltroVentas(valor)}
                aria-pressed={filtroVentas === valor}
              >
                {etiqueta}
              </button>
            ))}
          </div>

          <div className="total-filtro">
            <span>
              {ventasFiltradas.length}{" "}
              {ventasFiltradas.length === 1 ? "venta" : "ventas"}
            </span>

            <strong>
              {formatearMonto(totalVentasFiltradas)}
            </strong>
          </div>
        </div>

        <div className="contenedor-tabla">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Cliente</th>
                <th scope="col">Pago</th>
                <th scope="col">Total</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {ventasFiltradas.map((venta) => (
                <tr key={venta.id}>
                  <td>{formatearFecha(venta.fecha)}</td>
                  <td>{nombreCliente(venta.cliente_id)}</td>
                  <td>
                    <span
                      className={`badge badge-pago badge-${venta.metodo_pago}`}
                    >
                      {etiquetaMetodoPago(venta.metodo_pago)}
                    </span>
                  </td>
                  <td className="monto">
                    {formatearMonto(venta.monto_total)}
                  </td>
                  <td>
                    <div className="acciones-celda">
                      <button
                        type="button"
                        className="btn-accion"
                        onClick={() => verDetalle(venta.id)}
                        disabled={cargandoDetalleId === venta.id}
                      >
                        {cargandoDetalleId === venta.id
                          ? "Cargando..."
                          : "Detalle"}
                      </button>

                      <button
                        type="button"
                        className="btn-borrar"
                        onClick={() => borrarVenta(venta.id)}
                        disabled={eliminandoId === venta.id}
                      >
                        {eliminandoId === venta.id
                          ? "Eliminando..."
                          : "Eliminar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {ventasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="celda-vacia">
                    No hay ventas en este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {detalleVenta && (
        <div
          className="modal-overlay"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              setDetalleVenta(null)
            }
          }}
          role="presentation"
        >
          <div
            className="modal-contenido"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-detalle-venta"
          >
            <div className="modal-cabecera">
              <div>
                <span className="modal-etiqueta">Detalle de venta</span>

                <h3 id="titulo-detalle-venta">
                  {formatearFecha(detalleVenta.fecha)}
                </h3>
              </div>

              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={() => setDetalleVenta(null)}
                aria-label="Cerrar detalle"
              >
                ×
              </button>
            </div>

            <div className="datos-detalle-venta">
              <div className="dato">
                <span className="etiqueta">Cliente</span>
                <span className="valor">
                  {nombreCliente(detalleVenta.cliente_id)}
                </span>
              </div>

              <div className="dato">
                <span className="etiqueta">Método de pago</span>
                <span className="valor">
                  {etiquetaMetodoPago(detalleVenta.metodo_pago)}
                </span>
              </div>
            </div>

            {detalleVenta.notas && (
              <div className="nota-detalle">
                <span>Notas</span>
                <p>{detalleVenta.notas}</p>
              </div>
            )}

            <div className="contenedor-tabla">
              <table className="tabla">
                <thead>
                  <tr>
                    <th scope="col">Producto</th>
                    <th scope="col">Cantidad</th>
                    <th scope="col">Precio</th>
                    <th scope="col">Subtotal</th>
                  </tr>
                </thead>

                <tbody>
                  {(detalleVenta.productos || []).map(
                    (detalle, indice) => (
                      <tr
                        key={
                          detalle.id ||
                          `${detalle.producto_id}-${indice}`
                        }
                      >
                        <td>
                          {nombreProducto(detalle.producto_id)}
                        </td>
                        <td>{detalle.cantidad}</td>
                        <td className="monto">
                          {formatearMonto(
                            detalle.precio_unitario ??
                              detalle.precio_vendido
                          )}
                        </td>
                        <td className="monto">
                          {formatearMonto(detalle.subtotal)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="total-detalle">
              <span>Total</span>
              <strong>
                {formatearMonto(detalleVenta.monto_total)}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Ventas