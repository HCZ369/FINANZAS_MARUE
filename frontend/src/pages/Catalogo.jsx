import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useNavigate } from "react-router-dom"

import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from "../api/client"
import {
  normalizarTexto,
  convertirNumero,
  valorParaInput,
  formatearFecha,
  formatearMonto,
  formatearDecimal,
  formatearCantidad,
  obtenerIniciales,
} from "../utils"

const LIMITE_STOCK_BAJO = 10

const FILTROS_STOCK = {
  TODOS: "todos",
  DISPONIBLE: "disponible",
  BAJO: "bajo",
  AGOTADO: "agotado",
}

const ORDENES = {
  NOMBRE: "nombre",
  PRECIO_ASC: "precio_asc",
  PRECIO_DESC: "precio_desc",
  STOCK_ASC: "stock_asc",
  STOCK_DESC: "stock_desc",
}

const FORMULARIO_INICIAL = {
  nombre: "",
  precio: "",
  loteId: "",
  costoUsd: "",
  cantidadComprada: "",
  imagenUrl: "",
}

function Catalogo({ negocioId }) {
  const navigate = useNavigate()
  const temporizadorMensaje = useRef(null)

  const [productos, setProductos] = useState([])
  const [stock, setStock] = useState([])
  const [lotes, setLotes] = useState([])

  const [busqueda, setBusqueda] = useState("")
  const [filtroStock, setFiltroStock] = useState(FILTROS_STOCK.TODOS)
  const [ordenar, setOrdenar] = useState(ORDENES.NOMBRE)

  const [seleccionados, setSeleccionados] = useState({})

  const [productoAbiertoId, setProductoAbiertoId] = useState(null)
  const [modalFormulario, setModalFormulario] = useState(null)
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [sugerencia, setSugerencia] = useState(null)

  const [mensaje, setMensaje] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [calculandoSugerencia, setCalculandoSugerencia] = useState(false)

  const mostrarMensaje = useCallback((texto, tipo = "exito") => {
    if (temporizadorMensaje.current) {
      window.clearTimeout(temporizadorMensaje.current)
    }

    setMensaje({ texto, tipo })

    if (tipo !== "error") {
      temporizadorMensaje.current = window.setTimeout(() => {
        setMensaje(null)
      }, 4500)
    }
  }, [])

  const cargarDatos = useCallback(async () => {
    if (!negocioId) {
      setProductos([])
      setStock([])
      setLotes([])
      setCargando(false)
      return
    }

    try {
      setCargando(true)

      const [productosData, stockData, lotesData] = await Promise.all([
        apiGet(`/negocios/${negocioId}/productos/`),
        apiGet(`/negocios/${negocioId}/stock/`),
        apiGet(`/negocios/${negocioId}/lotes/`),
      ])

      setProductos(Array.isArray(productosData) ? productosData : [])
      setStock(Array.isArray(stockData) ? stockData : [])
      setLotes(Array.isArray(lotesData) ? lotesData : [])
    } catch (error) {
      mostrarMensaje(error?.message || "No se pudo cargar el catálogo.", "error")
    } finally {
      setCargando(false)
    }
  }, [negocioId, mostrarMensaje])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  useEffect(() => {
    function cerrarConEscape(evento) {
      if (evento.key === "Escape") {
        cerrarModal()
      }
    }

    document.addEventListener("keydown", cerrarConEscape)

    return () => {
      document.removeEventListener("keydown", cerrarConEscape)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (temporizadorMensaje.current) {
        window.clearTimeout(temporizadorMensaje.current)
      }
    }
  }, [])

  const stockPorProducto = useMemo(() => {
    return new Map(
      stock.map((registro) => [
        String(registro.producto_id),
        {
          stock: convertirNumero(registro.stock),
          comprado: convertirNumero(registro.comprado),
          vendido: convertirNumero(registro.vendido),
        },
      ])
    )
  }, [stock])

  const productosCompletos = useMemo(() => {
    return productos.map((producto) => {
      const informacionStock = stockPorProducto.get(String(producto.id)) || {
        stock: 0,
        comprado: 0,
        vendido: 0,
      }

      return {
        id: producto.id,
        nombre: producto.nombre?.trim() || "Producto sin nombre",
        precio: convertirNumero(producto.precio),
        imagen_url: producto.imagen_url || "",
        costo_usd: producto.costo_usd ?? "",
        lote_id: producto.lote_id ?? "",
        cantidad_comprada: producto.cantidad_comprada ?? "",
        ...informacionStock,
      }
    })
  }, [productos, stockPorProducto])

  const productoAbierto = useMemo(() => {
    if (!productoAbiertoId) return null

    return (
      productosCompletos.find(
        (producto) => String(producto.id) === String(productoAbiertoId)
      ) || null
    )
  }, [productoAbiertoId, productosCompletos])

  const conteos = useMemo(() => {
    return productosCompletos.reduce(
      (resultado, producto) => {
        const estado = obtenerEstadoStock(producto.stock)

        resultado.total += 1
        resultado[estado] += 1

        return resultado
      },
      { total: 0, disponible: 0, bajo: 0, agotado: 0 }
    )
  }, [productosCompletos])

  const productosFiltrados = useMemo(() => {
    const termino = normalizarTexto(busqueda)

    return productosCompletos
      .filter((producto) => {
        const coincideBusqueda =
          !termino || normalizarTexto(producto.nombre).includes(termino)

        const estado = obtenerEstadoStock(producto.stock)

        const coincideEstado =
          filtroStock === FILTROS_STOCK.TODOS || estado === filtroStock

        return coincideBusqueda && coincideEstado
      })
      .sort((a, b) => ordenarProductos(a, b, ordenar))
  }, [productosCompletos, busqueda, filtroStock, ordenar])

  const resumenSeleccion = useMemo(() => {
    const items = Object.values(seleccionados)

    return {
      items,
      productos: items.length,
      unidades: items.reduce(
        (total, item) => total + Math.max(1, convertirNumero(item.cantidad, 1)),
        0
      ),
      total: items.reduce(
        (total, item) =>
          total +
          convertirNumero(item.precio_vendido) *
            Math.max(1, convertirNumero(item.cantidad, 1)),
        0
      ),
    }
  }, [seleccionados])

  const formularioValido = useMemo(() => {
    return (
      formulario.nombre.trim().length > 0 &&
      convertirNumero(formulario.precio) > 0
    )
  }, [formulario])

  function actualizarFormulario(campo, valor) {
    setFormulario((formularioActual) => ({
      ...formularioActual,
      [campo]: valor,
    }))

    if (
      campo === "loteId" ||
      campo === "costoUsd" ||
      campo === "cantidadComprada"
    ) {
      setSugerencia(null)
    }
  }

  function abrirDetalle(producto) {
    setProductoAbiertoId(producto.id)
    setModalFormulario(null)
    setSugerencia(null)
  }

  function abrirCreacion() {
    setProductoAbiertoId(null)
    setFormulario(FORMULARIO_INICIAL)
    setSugerencia(null)
    setModalFormulario("crear")
  }

  function abrirEdicion(producto) {
    setFormulario({
      nombre: producto.nombre || "",
      precio: valorParaInput(producto.precio),
      loteId: valorParaInput(producto.lote_id),
      costoUsd: valorParaInput(producto.costo_usd),
      cantidadComprada: valorParaInput(producto.cantidad_comprada),
      imagenUrl: producto.imagen_url || "",
    })

    setProductoAbiertoId(producto.id)
    setSugerencia(null)
    setModalFormulario("editar")
  }

  function cerrarModal() {
    if (guardando || eliminando || calculandoSugerencia) {
      return
    }

    setProductoAbiertoId(null)
    setModalFormulario(null)
    setFormulario(FORMULARIO_INICIAL)
    setSugerencia(null)
  }

  function alternarSeleccion(producto, evento) {
    evento.stopPropagation()

    if (producto.stock <= 0) {
      mostrarMensaje(`"${producto.nombre}" no tiene stock disponible.`, "error")
      return
    }

    setSeleccionados((seleccionActual) => {
      const productoId = String(producto.id)
      const nuevaSeleccion = { ...seleccionActual }

      if (nuevaSeleccion[productoId]) {
        delete nuevaSeleccion[productoId]
      } else {
        nuevaSeleccion[productoId] = {
          producto_id: productoId,
          nombre: producto.nombre,
          cantidad: 1,
          precio_lista: producto.precio,
          precio_vendido: producto.precio,
        }
      }

      return nuevaSeleccion
    })
  }

  function limpiarSeleccion() {
    setSeleccionados({})
  }

  function irAVenta() {
    if (resumenSeleccion.items.length === 0) return

    navigate("/ventas", {
      state: { carritoInicial: resumenSeleccion.items },
    })
  }

  function limpiarFiltros() {
    setBusqueda("")
    setFiltroStock(FILTROS_STOCK.TODOS)
    setOrdenar(ORDENES.NOMBRE)
  }

  function validarFormulario() {
    if (!formulario.nombre.trim()) {
      return "El nombre del producto es obligatorio."
    }

    if (convertirNumero(formulario.precio) <= 0) {
      return "Ingresá un precio mayor que cero."
    }

    if (
      formulario.costoUsd !== "" &&
      convertirNumero(formulario.costoUsd) < 0
    ) {
      return "El costo en USD no puede ser negativo."
    }

    if (
      formulario.cantidadComprada !== "" &&
      convertirNumero(formulario.cantidadComprada) < 0
    ) {
      return "La cantidad comprada no puede ser negativa."
    }

    if (
      formulario.imagenUrl.trim() &&
      !esUrlValida(formulario.imagenUrl)
    ) {
      return "La dirección de la imagen no es válida."
    }

    return null
  }

  async function guardarProducto(evento) {
    evento.preventDefault()

    const errorValidacion = validarFormulario()

    if (errorValidacion) {
      mostrarMensaje(errorValidacion, "error")
      return
    }

    const datos = {
      nombre: formulario.nombre.trim(),
      precio: convertirNumero(formulario.precio),
      costo:
        sugerencia?.costo_unitario != null
          ? convertirNumero(sugerencia.costo_unitario)
          : null,
      lote_id: formulario.loteId ? Number(formulario.loteId) : null,
      costo_usd:
        formulario.costoUsd !== ""
          ? convertirNumero(formulario.costoUsd)
          : null,
      cantidad_comprada:
        formulario.cantidadComprada !== ""
          ? convertirNumero(formulario.cantidadComprada)
          : null,
      imagen_url: formulario.imagenUrl.trim() || null,
    }

    try {
      setGuardando(true)

      const resultado =
        modalFormulario === "crear"
          ? await apiPost(`/negocios/${negocioId}/productos/`, datos)
          : await apiPut(
              `/negocios/${negocioId}/productos/${productoAbiertoId}/`,
              datos
            )

      mostrarMensaje(
        resultado?.mensaje ||
          (modalFormulario === "crear"
            ? "Producto creado correctamente."
            : "Producto actualizado correctamente.")
      )

      cerrarModalForzado()
      await cargarDatos()
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudo guardar el producto.",
        "error"
      )
    } finally {
      setGuardando(false)
    }
  }

  async function borrarProducto(producto) {
    const debeEliminarse = window.confirm(
      `¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`
    )

    if (!debeEliminarse) return

    try {
      setEliminando(true)

      const resultado = await apiDelete(
        `/negocios/${negocioId}/productos/${producto.id}/`
      )

      setProductos((productosActuales) =>
        productosActuales.filter(
          (item) => String(item.id) !== String(producto.id)
        )
      )

      setStock((stockActual) =>
        stockActual.filter(
          (item) => String(item.producto_id) !== String(producto.id)
        )
      )

      setSeleccionados((seleccionActual) => {
        const nuevaSeleccion = { ...seleccionActual }
        delete nuevaSeleccion[String(producto.id)]
        return nuevaSeleccion
      })

      cerrarModalForzado()

      mostrarMensaje(
        resultado?.mensaje || "Producto eliminado correctamente."
      )
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudo eliminar el producto.",
        "error"
      )
    } finally {
      setEliminando(false)
    }
  }

  async function pedirSugerencia() {
    if (!formulario.loteId) {
      mostrarMensaje("Seleccioná un lote.", "error")
      return
    }

    if (convertirNumero(formulario.costoUsd) <= 0) {
      mostrarMensaje("Ingresá un costo en USD mayor que cero.", "error")
      return
    }

    try {
      setCalculandoSugerencia(true)

      const resultado = await apiPost(
        `/negocios/${negocioId}/sugerencia-precio/`,
        {
          lote_id: Number(formulario.loteId),
          costo_usd: convertirNumero(formulario.costoUsd),
        }
      )

      setSugerencia(resultado)

      if (resultado?.precio_sugerido != null) {
        actualizarFormulario("precio", String(resultado.precio_sugerido))
      }
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudo calcular la sugerencia de precio.",
        "error"
      )
    } finally {
      setCalculandoSugerencia(false)
    }
  }

  function cerrarModalForzado() {
    setProductoAbiertoId(null)
    setModalFormulario(null)
    setFormulario(FORMULARIO_INICIAL)
    setSugerencia(null)
  }

  if (cargando) {
    return (
      <main className="pagina-catalogo">
        <div className="cat-header">
          <div>
            <h1>Catálogo</h1>
            <p className="cat-subtitulo">
              Productos, precios y disponibilidad.
            </p>
          </div>
        </div>

        <div className="catalogo-cargando">
          <div className="grafico-cargando-linea" />
          <span>Cargando productos...</span>
        </div>
      </main>
    )
  }

  return (
    <main className="pagina-catalogo">
      <header className="cat-header">
        <div>
          <h1>Catálogo</h1>
          <p className="cat-subtitulo">
            Administrá productos, precios y disponibilidad.
          </p>
        </div>

        <button
          type="button"
          className="btn-principal"
          onClick={abrirCreacion}
        >
          Nuevo producto
        </button>
      </header>

      {mensaje && (
        <div
          className={
            mensaje.tipo === "error" ? "msg msg-error" : "msg msg-exito"
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

      <section
        className="cat-controles"
        aria-label="Controles del catálogo"
      >
        <div className="cat-toolbar">
          <div className="cat-buscador">
            <label htmlFor="buscar-catalogo">Buscar producto</label>

            <input
              id="buscar-catalogo"
              type="search"
              placeholder="Nombre del producto"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              className="cat-input-busqueda"
            />
          </div>

          <div className="cat-filtros">
            <span className="cat-control-etiqueta">Disponibilidad</span>

            <div
              className="filtros-stock"
              aria-label="Filtrar por disponibilidad"
            >
              <BotonFiltro
                activo={filtroStock === FILTROS_STOCK.TODOS}
                onClick={() => setFiltroStock(FILTROS_STOCK.TODOS)}
              >
                Todos {conteos.total}
              </BotonFiltro>

              <BotonFiltro
                activo={filtroStock === FILTROS_STOCK.DISPONIBLE}
                onClick={() => setFiltroStock(FILTROS_STOCK.DISPONIBLE)}
              >
                Disponible {conteos.disponible}
              </BotonFiltro>

              <BotonFiltro
                activo={filtroStock === FILTROS_STOCK.BAJO}
                onClick={() => setFiltroStock(FILTROS_STOCK.BAJO)}
              >
                Bajo {conteos.bajo}
              </BotonFiltro>

              <BotonFiltro
                activo={filtroStock === FILTROS_STOCK.AGOTADO}
                onClick={() => setFiltroStock(FILTROS_STOCK.AGOTADO)}
              >
                Agotado {conteos.agotado}
              </BotonFiltro>
            </div>
          </div>

          <div className="cat-orden">
            <label htmlFor="orden-catalogo">Ordenar</label>

            <select
              id="orden-catalogo"
              className="cat-select-orden"
              value={ordenar}
              onChange={(evento) => setOrdenar(evento.target.value)}
            >
              <option value={ORDENES.NOMBRE}>Nombre A-Z</option>
              <option value={ORDENES.PRECIO_ASC}>Menor precio</option>
              <option value={ORDENES.PRECIO_DESC}>Mayor precio</option>
              <option value={ORDENES.STOCK_ASC}>Menor stock</option>
              <option value={ORDENES.STOCK_DESC}>Mayor stock</option>
            </select>
          </div>
        </div>

        <div className="cat-resultados">
          <span>
            Mostrando {productosFiltrados.length} de{" "}
            {productosCompletos.length} productos
          </span>

          {(busqueda ||
            filtroStock !== FILTROS_STOCK.TODOS ||
            ordenar !== ORDENES.NOMBRE) && (
            <button
              type="button"
              className="cat-limpiar-filtros"
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </section>

      {productosFiltrados.length > 0 ? (
        <div className="cat-grid">
          {productosFiltrados.map((producto) => (
            <TarjetaProducto
              key={producto.id}
              producto={producto}
              seleccionado={seleccionados[String(producto.id)] != null}
              onAbrir={() => abrirDetalle(producto)}
              onSeleccionar={(evento) => alternarSeleccion(producto, evento)}
            />
          ))}
        </div>
      ) : (
        <EstadoCatalogo
          titulo={
            productosCompletos.length === 0
              ? "No hay productos cargados"
              : "No se encontraron productos"
          }
          descripcion={
            productosCompletos.length === 0
              ? "Creá el primer producto para comenzar a utilizar el catálogo."
              : `No hay coincidencias para los filtros seleccionados${
                  busqueda.trim() ? ` y la búsqueda "${busqueda.trim()}"` : ""
                }.`
          }
          mostrarBoton={productosCompletos.length === 0}
          onCrear={abrirCreacion}
          onLimpiar={limpiarFiltros}
        />
      )}

      {resumenSeleccion.productos > 0 && (
        <div className="cat-barra-venta">
          <div className="cat-seleccion-resumen">
            <span className="cat-seleccion-cantidad">
              {resumenSeleccion.productos}{" "}
              {resumenSeleccion.productos === 1 ? "producto" : "productos"}
            </span>

            <span className="cat-seleccion-total">
              Total estimado: {formatearMonto(resumenSeleccion.total)}
            </span>
          </div>

          <div className="cat-barra-acciones">
            <button
              type="button"
              className="btn-secundario"
              onClick={limpiarSeleccion}
            >
              Limpiar
            </button>

            <button
              type="button"
              className="btn-principal"
              onClick={irAVenta}
            >
              Continuar a venta
            </button>
          </div>
        </div>
      )}

      {productoAbierto && !modalFormulario && (
        <ModalProducto
          producto={productoAbierto}
          onCerrar={cerrarModal}
          onEditar={() => abrirEdicion(productoAbierto)}
          onEliminar={() => borrarProducto(productoAbierto)}
          eliminando={eliminando}
        />
      )}

      {modalFormulario && (
        <ModalFormularioProducto
          modo={modalFormulario}
          formulario={formulario}
          lotes={lotes}
          sugerencia={sugerencia}
          guardando={guardando}
          calculandoSugerencia={calculandoSugerencia}
          formularioValido={formularioValido}
          onCambiar={actualizarFormulario}
          onSugerencia={pedirSugerencia}
          onGuardar={guardarProducto}
          onCerrar={cerrarModal}
        />
      )}
    </main>
  )
}

function TarjetaProducto({ producto, seleccionado, onAbrir, onSeleccionar }) {
  const estaAgotado = producto.stock <= 0
  const estado = obtenerEstadoStock(producto.stock)

  function manejarTeclado(evento) {
    if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault()
      onAbrir()
    }
  }

  return (
    <article
      className={[
        "cat-card",
        estaAgotado ? "cat-card-agotado" : "",
        seleccionado ? "cat-card-seleccionado" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onAbrir}
      onKeyDown={manejarTeclado}
      role="button"
      tabIndex={0}
      aria-label={`Ver detalle de ${producto.nombre}`}
    >
      <div
        className="cat-card-visual"
        style={{ backgroundColor: obtenerColorProducto(producto.nombre) }}
      >
        <ImagenProducto
          src={producto.imagen_url}
          alt={producto.nombre}
          className="cat-card-imagen"
        />

        <span className="cat-card-inicial" aria-hidden="true">
          {obtenerIniciales(producto.nombre)}
        </span>

        <span className={`cat-estado cat-${estado}`}>
          {obtenerTextoEstado(producto.stock)}
        </span>

        <button
          type="button"
          className={[
            "cat-btn-seleccionar",
            seleccionado ? "seleccionado" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={onSeleccionar}
          disabled={estaAgotado}
          aria-label={
            estaAgotado
              ? `${producto.nombre} está agotado`
              : seleccionado
                ? `Quitar ${producto.nombre} de la venta`
                : `Agregar ${producto.nombre} a la venta`
          }
          title={
            estaAgotado
              ? "Producto agotado"
              : seleccionado
                ? "Quitar de la venta"
                : "Agregar a la venta"
          }
        >
          {seleccionado ? "✓" : "+"}
        </button>
      </div>

      <div className="cat-card-info">
        <span className="cat-card-nombre" title={producto.nombre}>
          {producto.nombre}
        </span>

        <div className="cat-card-pie">
          <span className="cat-card-precio">
            {formatearMonto(producto.precio)}
          </span>

          <span className="cat-card-vendidos">
            {producto.vendido > 0
              ? `${formatearCantidad(producto.vendido)} vendidos`
              : "Sin ventas"}
          </span>
        </div>
      </div>
    </article>
  )
}

function ModalProducto({
  producto,
  onCerrar,
  onEditar,
  onEliminar,
  eliminando,
}) {
  const estado = obtenerEstadoStock(producto.stock)

  return (
    <Modal
      titulo={producto.nombre}
      etiqueta="Detalle del producto"
      onCerrar={onCerrar}
    >
      <div
        className="cat-detalle-visual"
        style={{ backgroundColor: obtenerColorProducto(producto.nombre) }}
      >
        <ImagenProducto
          src={producto.imagen_url}
          alt={producto.nombre}
          className="cat-detalle-imagen"
        />

        <span className="cat-detalle-inicial" aria-hidden="true">
          {obtenerIniciales(producto.nombre)}
        </span>

        <span className={`cat-estado cat-${estado}`}>
          {obtenerTextoEstado(producto.stock)}
        </span>
      </div>

      <div className="cat-detalle-stats">
        <MetricaProducto
          valor={formatearMonto(producto.precio)}
          etiqueta="Precio"
          destacada
        />

        <MetricaProducto
          valor={formatearCantidad(producto.stock)}
          etiqueta="Stock"
          estado={estado}
        />

        <MetricaProducto
          valor={formatearCantidad(producto.vendido)}
          etiqueta="Vendidos"
        />

        <MetricaProducto
          valor={formatearCantidad(producto.comprado)}
          etiqueta="Comprados"
        />
      </div>

      <div className="cat-detalle-informacion">
        <div className="dato">
          <span className="etiqueta">Costo en USD</span>
          <span className="valor">
            {producto.costo_usd !== ""
              ? `USD ${formatearDecimal(producto.costo_usd)}`
              : "No registrado"}
          </span>
        </div>

        <div className="dato">
          <span className="etiqueta">Lote</span>
          <span className="valor">
            {producto.lote_id ? `Lote ${producto.lote_id}` : "Sin lote"}
          </span>
        </div>
      </div>

      <div className="cat-detalle-acciones">
        <button type="button" className="btn-principal" onClick={onEditar}>
          Editar producto
        </button>

        <button
          type="button"
          className="btn-borrar"
          onClick={onEliminar}
          disabled={eliminando}
        >
          {eliminando ? "Eliminando..." : "Eliminar"}
        </button>
      </div>
    </Modal>
  )
}

function ModalFormularioProducto({
  modo,
  formulario,
  lotes,
  sugerencia,
  guardando,
  calculandoSugerencia,
  formularioValido,
  onCambiar,
  onSugerencia,
  onGuardar,
  onCerrar,
}) {
  const esCreacion = modo === "crear"

  return (
    <Modal
      titulo={esCreacion ? "Nuevo producto" : "Editar producto"}
      etiqueta={esCreacion ? "Crear registro" : "Modificar registro"}
      onCerrar={onCerrar}
    >
      <form className="cat-form-edicion" onSubmit={onGuardar}>
        <div className="campo">
          <label htmlFor="producto-nombre">Nombre</label>

          <input
            id="producto-nombre"
            type="text"
            value={formulario.nombre}
            onChange={(evento) => onCambiar("nombre", evento.target.value)}
            placeholder="Nombre del producto"
            maxLength={150}
            autoFocus
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="producto-imagen">URL de imagen</label>

          <input
            id="producto-imagen"
            type="url"
            value={formulario.imagenUrl}
            onChange={(evento) => onCambiar("imagenUrl", evento.target.value)}
            placeholder="https://ejemplo.com/producto.jpg"
          />

          {formulario.imagenUrl.trim() && (
            <div className="cat-preview-img">
              <ImagenProducto
                src={formulario.imagenUrl}
                alt="Vista previa"
              />
            </div>
          )}
        </div>

        <div className="grid-form-config">
          <div className="campo">
            <label htmlFor="producto-lote">Lote</label>

            <select
              id="producto-lote"
              value={formulario.loteId}
              onChange={(evento) => onCambiar("loteId", evento.target.value)}
            >
              <option value="">Sin lote</option>

              {lotes.map((lote) => (
                <option key={lote.id} value={lote.id}>
                  {formatearFecha(lote.fecha)} ·{" "}
                  {lote.descripcion || `Lote ${lote.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="producto-costo">Costo en USD</label>

            <input
              id="producto-costo"
              type="number"
              min="0"
              step="any"
              value={formulario.costoUsd}
              onChange={(evento) => onCambiar("costoUsd", evento.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid-form-config">
          <div className="campo">
            <label htmlFor="producto-cantidad">Cantidad comprada</label>

            <input
              id="producto-cantidad"
              type="number"
              min="0"
              step="1"
              value={formulario.cantidadComprada}
              onChange={(evento) =>
                onCambiar("cantidadComprada", evento.target.value)
              }
              placeholder="0"
            />
          </div>

          <div className="campo campo-accion">
            <span className="label-control">Sugerencia de precio</span>

            <button
              type="button"
              className="btn-secundario btn-ancho-completo"
              onClick={onSugerencia}
              disabled={
                calculandoSugerencia ||
                !formulario.loteId ||
                convertirNumero(formulario.costoUsd) <= 0
              }
            >
              {calculandoSugerencia ? "Calculando..." : "Calcular sugerencia"}
            </button>
          </div>
        </div>

        {sugerencia && (
          <div className="caja-sugerencia">
            <div>
              <span>Costo unitario</span>
              <strong>{formatearMonto(sugerencia.costo_unitario)}</strong>
            </div>

            <div>
              <span>Multiplicador</span>
              <strong>{sugerencia.multiplicador}</strong>
            </div>

            <div>
              <span>Precio sugerido</span>
              <strong>{formatearMonto(sugerencia.precio_sugerido)}</strong>
            </div>
          </div>
        )}

        <div className="campo cat-campo-precio">
          <label htmlFor="producto-precio">Precio final</label>

          <input
            id="producto-precio"
            type="number"
            min="0.01"
            step="any"
            value={formulario.precio}
            onChange={(evento) => onCambiar("precio", evento.target.value)}
            placeholder="0"
            required
          />
        </div>

        <div className="cat-form-acciones">
          <button
            type="button"
            className="btn-secundario"
            onClick={onCerrar}
            disabled={guardando}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="btn-principal"
            disabled={!formularioValido || guardando}
          >
            {guardando
              ? "Guardando..."
              : esCreacion
                ? "Crear producto"
                : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Modal({ titulo, etiqueta, children, onCerrar }) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) {
          onCerrar()
        }
      }}
      role="presentation"
    >
      <div
        className="modal-contenido cat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-producto"
      >
        <div className="modal-cabecera">
          <div>
            {etiqueta && (
              <span className="modal-etiqueta">{etiqueta}</span>
            )}

            <h3 id="titulo-modal-producto">{titulo}</h3>
          </div>

          <button
            type="button"
            className="btn-cerrar-modal"
            onClick={onCerrar}
            aria-label="Cerrar ventana"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}

function MetricaProducto({ valor, etiqueta, destacada = false, estado = "" }) {
  return (
    <div
      className={[
        "stat",
        destacada ? "stat-destacada" : "",
        estado ? `stat-${estado}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="stat-valor">{valor}</span>
      <span className="stat-etiqueta">{etiqueta}</span>
    </div>
  )
}

function EstadoCatalogo({
  titulo,
  descripcion,
  mostrarBoton,
  onCrear,
  onLimpiar,
}) {
  return (
    <section className="cat-vacio">
      <span className="cat-vacio-simbolo" aria-hidden="true">+</span>

      <h2>{titulo}</h2>
      <p>{descripcion}</p>

      <button
        type="button"
        className={mostrarBoton ? "btn-principal" : "btn-secundario"}
        onClick={mostrarBoton ? onCrear : onLimpiar}
      >
        {mostrarBoton ? "Crear producto" : "Limpiar filtros"}
      </button>
    </section>
  )
}

function BotonFiltro({ activo, children, onClick }) {
  return (
    <button
      type="button"
      className={`btn-filtro ${activo ? "activo" : ""}`}
      onClick={onClick}
      aria-pressed={activo}
    >
      {children}
    </button>
  )
}

function ImagenProducto({ src, alt, className = "" }) {
  const [imagenFallida, setImagenFallida] = useState(false)

  useEffect(() => {
    setImagenFallida(false)
  }, [src])

  if (!src || imagenFallida) {
    return null
  }

  return (
    <img
      src={src}
      alt={alt || ""}
      className={className}
      loading="lazy"
      onError={() => setImagenFallida(true)}
    />
  )
}

function obtenerEstadoStock(cantidad) {
  const stock = convertirNumero(cantidad)

  if (stock <= 0) return FILTROS_STOCK.AGOTADO
  if (stock <= LIMITE_STOCK_BAJO) return FILTROS_STOCK.BAJO

  return FILTROS_STOCK.DISPONIBLE
}

function obtenerTextoEstado(cantidad) {
  const stock = convertirNumero(cantidad)

  if (stock <= 0) return "Agotado"
  if (stock <= LIMITE_STOCK_BAJO) return `${stock} · Bajo`

  return `${stock} unidades`
}

function ordenarProductos(a, b, orden) {
  if (orden === ORDENES.PRECIO_ASC) return a.precio - b.precio
  if (orden === ORDENES.PRECIO_DESC) return b.precio - a.precio
  if (orden === ORDENES.STOCK_ASC) return a.stock - b.stock
  if (orden === ORDENES.STOCK_DESC) return b.stock - a.stock

  return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
}

function obtenerColorProducto(nombre) {
  const colores = [
    "#171316",
    "#181317",
    "#151419",
    "#191515",
    "#141718",
    "#191318",
  ]

  let hash = 0

  for (let indice = 0; indice < nombre.length; indice += 1) {
    hash = nombre.charCodeAt(indice) + ((hash << 5) - hash)
  }

  return colores[Math.abs(hash) % colores.length]
}

function esUrlValida(valor) {
  try {
    const url = new URL(valor)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export default Catalogo