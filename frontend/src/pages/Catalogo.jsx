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
  formatearMonto,
  formatearDecimal,
  formatearCantidad,
  obtenerIniciales,
} from "../utils"

const CLOUDINARY_CLOUD_NAME = "zolcnxzz"
const CLOUDINARY_UPLOAD_PRESET = "marue_productos"

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
  imagenUrl: "",
  imagenUrl2: "",
  categoriaId: "",
  descripcion: "",
  material: "",
  talla: "",
  loteId: "",
  costoUsd: "",
  cantidadComprada: "",
  enCatalogo: true,
}

function Catalogo({ negocioId }) {
  const navigate = useNavigate()
  const temporizadorMensaje = useRef(null)

  const [productos, setProductos] = useState([])
  const [stock, setStock] = useState([])
  const [categorias, setCategorias] = useState([])
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
  const [generandoCatalogo, setGenerandoCatalogo] = useState(false)

  // --- NUEVO: estado para lotes del producto abierto ---
  const [lotesProducto, setLotesProducto] = useState([])
  const [guardandoLote, setGuardandoLote] = useState(null)

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
      setCategorias([])
      setLotes([])
      setCargando(false)
      return
    }

    try {
      setCargando(true)

      const [productosData, stockData, categoriasData, lotesData] = await Promise.all([
        apiGet(`/negocios/${negocioId}/productos/`),
        apiGet(`/negocios/${negocioId}/stock/`),
        apiGet(`/negocios/${negocioId}/categorias/`),
        apiGet(`/negocios/${negocioId}/lotes/`),
      ])

      setProductos(Array.isArray(productosData) ? productosData : [])
      setStock(Array.isArray(stockData) ? stockData : [])
      setCategorias(Array.isArray(categoriasData) ? categoriasData : [])
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
        imagen_url_2: producto.imagen_url_2 || "",
        material: producto.material || "",
        talla: producto.talla || "",
        descripcion: producto.descripcion || "",
        categoria_id: producto.categoria_id ?? "",
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

  // --- MODIFICADO: abrirDetalle ahora es async y carga los lotes del producto ---
  async function abrirDetalle(producto) {
    setProductoAbiertoId(producto.id)
    setModalFormulario(null)
    setSugerencia(null)
    setLotesProducto([])

    try {
      const detalle = await apiGet(
        `/negocios/${negocioId}/productos/${producto.id}/`
      )

      if (Array.isArray(detalle.lotes)) {
        setLotesProducto(detalle.lotes)
      }
    } catch (error) {
      mostrarMensaje("No se pudieron cargar los lotes del producto.", "error")
    }
  }

  // --- NUEVO: guardar cantidad corregida de un lote_producto ---
  async function guardarCantidadLote(loteProducto, nuevaCantidad) {
    const cantidad = convertirNumero(nuevaCantidad)

    if (cantidad < 0) {
      mostrarMensaje("La cantidad no puede ser negativa.", "error")
      return
    }

    try {
      setGuardandoLote(loteProducto.lote_producto_id)

      await apiPut(
        `/negocios/${negocioId}/lotes/${loteProducto.lote_id}/productos/${loteProducto.lote_producto_id}/`,
        {
          costo_usd: loteProducto.costo_usd,
          cantidad_comprada: cantidad,
          precio_sugerido: loteProducto.precio_sugerido,
        }
      )

      mostrarMensaje("Cantidad actualizada correctamente.")
      await cargarDatos()

      const detalle = await apiGet(
        `/negocios/${negocioId}/productos/${productoAbiertoId}/`
      )

      if (Array.isArray(detalle.lotes)) {
        setLotesProducto(detalle.lotes)
      }
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudo actualizar la cantidad.",
        "error"
      )
    } finally {
      setGuardandoLote(null)
    }
  }

  // --- NUEVO: agregar producto a un lote nuevo ---
  async function agregarALote(productoId, loteId, costoUsd, cantidadComprada) {
    try {
      setGuardandoLote("nuevo")

      await apiPost(
        `/negocios/${negocioId}/lotes/${loteId}/productos/`,
        {
          producto_id: productoId,
          costo_usd: costoUsd !== "" ? convertirNumero(costoUsd) : null,
          cantidad_comprada: convertirNumero(cantidadComprada),
          precio_sugerido: null,
        }
      )

      mostrarMensaje("Producto agregado al lote correctamente.")
      await cargarDatos()

      const detalle = await apiGet(
        `/negocios/${negocioId}/productos/${productoId}/`
      )

      if (Array.isArray(detalle.lotes)) {
        setLotesProducto(detalle.lotes)
      }
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudo agregar el producto al lote.",
        "error"
      )
    } finally {
      setGuardandoLote(null)
    }
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
      imagenUrl: producto.imagen_url || "",
      imagenUrl2: producto.imagen_url_2 || "",
      categoriaId: valorParaInput(producto.categoria_id),
      descripcion: producto.descripcion || "",
      material: producto.material || "",
      talla: producto.talla || "",
      loteId: valorParaInput(producto.lote_id),
      costoUsd: valorParaInput(producto.costo_usd),
      cantidadComprada: valorParaInput(producto.cantidad_comprada),
      enCatalogo: producto.en_catalogo !== 0 && producto.en_catalogo !== false,
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

  async function generarCatalogo() {
    try {
      setGenerandoCatalogo(true)

      const API_BASE = "https://cornflake-exorcist-facsimile.ngrok-free.dev"

      const respuesta = await fetch(
        `${API_BASE}/api/negocios/${negocioId}/generar-catalogo/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: "{}",
        }
      )

      if (!respuesta.ok) {
        let msg = "No se pudo generar el catálogo."
        try {
          const data = await respuesta.json()
          msg = data?.error || msg
        } catch {
          // sin cuerpo JSON
        }
        mostrarMensaje(msg, "error")
        return
      }

      const blob = await respuesta.blob()
      const url = URL.createObjectURL(blob)
      const enlace = document.createElement("a")
      enlace.href = url
      enlace.download = "index.html"
      document.body.appendChild(enlace)
      enlace.click()
      document.body.removeChild(enlace)
      URL.revokeObjectURL(url)

      mostrarMensaje("Catálogo descargado. Arrastralo a Netlify para publicarlo.")
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudo generar el catálogo.",
        "error"
      )
    } finally {
      setGenerandoCatalogo(false)
    }
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
      imagen_url: formulario.imagenUrl.trim() || null,
      imagen_url_2: formulario.imagenUrl2.trim() || null,
      categoria_id: formulario.categoriaId ? Number(formulario.categoriaId) : null,
      descripcion: formulario.descripcion.trim() || null,
      material: formulario.material.trim() || null,
      talla: formulario.talla.trim() || null,
      lote_id: formulario.loteId ? Number(formulario.loteId) : null,
      costo_usd: formulario.costoUsd !== "" ? convertirNumero(formulario.costoUsd) : null,
      cantidad_comprada:
        formulario.cantidadComprada !== ""
          ? convertirNumero(formulario.cantidadComprada)
          : null,
      en_catalogo: formulario.enCatalogo ? 1 : 0,
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

        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-secundario"
            onClick={generarCatalogo}
            disabled={generandoCatalogo}
          >
            {generandoCatalogo ? "Generando..." : "Descargar catálogo"}
          </button>

          <button
            type="button"
            className="btn-principal"
            onClick={abrirCreacion}
          >
            Nuevo producto
          </button>
        </div>
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
              : `No hay coincidencias para los filtros seleccionados${busqueda.trim() ? ` y la búsqueda "${busqueda.trim()}"` : ""
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
          lotesProducto={lotesProducto}
          lotesDisponibles={lotes}
          guardandoLote={guardandoLote}
          onCerrar={cerrarModal}
          onEditar={() => abrirEdicion(productoAbierto)}
          onEliminar={() => borrarProducto(productoAbierto)}
          onGuardarCantidad={guardarCantidadLote}
          onAgregarALote={agregarALote}
          eliminando={eliminando}
        />
      )}

      {modalFormulario && (
        <ModalFormularioProducto
          modo={modalFormulario}
          formulario={formulario}
          categorias={categorias}
          lotes={lotes}
          sugerencia={sugerencia}
          guardando={guardando}
          calculandoSugerencia={calculandoSugerencia}
          formularioValido={formularioValido}
          onCambiar={actualizarFormulario}
          onSugerencia={pedirSugerencia}
          onGuardar={guardarProducto}
          onCerrar={cerrarModal}
          mostrarMensaje={mostrarMensaje}
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
  lotesProducto,
  lotesDisponibles,
  guardandoLote,
  onCerrar,
  onEditar,
  onEliminar,
  onGuardarCantidad,
  onAgregarALote,
  eliminando,
}) {
  const estado = obtenerEstadoStock(producto.stock)
  const [cantidadesEditadas, setCantidadesEditadas] = useState({})
  const [mostrandoFormLote, setMostrandoFormLote] = useState(false)
  const [nuevoLote, setNuevoLote] = useState({ loteId: "", costoUsd: "", cantidad: "" })

  function cambiarCantidad(loteProductoId, valor) {
    setCantidadesEditadas((anterior) => ({
      ...anterior,
      [loteProductoId]: valor,
    }))
  }

  function obtenerCantidadActual(loteProducto) {
    const editada = cantidadesEditadas[loteProducto.lote_producto_id]

    if (editada !== undefined) {
      return editada
    }

    return String(loteProducto.cantidad_comprada ?? "")
  }

  function cantidadCambio(loteProducto) {
    const editada = cantidadesEditadas[loteProducto.lote_producto_id]

    if (editada === undefined) return false

    return String(editada) !== String(loteProducto.cantidad_comprada ?? "")
  }

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

      {producto.imagen_url_2 && (
        <div
          className="cat-detalle-visual"
          style={{ backgroundColor: obtenerColorProducto(producto.nombre) }}
        >
          <ImagenProducto
            src={producto.imagen_url_2}
            alt={`${producto.nombre} - foto secundaria`}
            className="cat-detalle-imagen"
          />
        </div>
      )}

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
        {producto.material && (
          <div className="dato">
            <span className="etiqueta">Material</span>
            <span className="valor">{producto.material}</span>
          </div>
        )}

        {producto.talla && (
          <div className="dato">
            <span className="etiqueta">Talla</span>
            <span className="valor">{producto.talla}</span>
          </div>
        )}

        {producto.descripcion && (
          <div className="dato">
            <span className="etiqueta">Descripción</span>
            <span className="valor">{producto.descripcion}</span>
          </div>
        )}

        <div className="dato">
          <span className="etiqueta">Costo en USD</span>
          <span className="valor">
            {producto.costo_usd !== ""
              ? `USD ${formatearDecimal(producto.costo_usd)}`
              : "No registrado"}
          </span>
        </div>
      </div>

      {lotesProducto.length > 0 && (
        <div className="cat-detalle-lotes">
          <h4 className="cat-lotes-titulo">Lotes asociados</h4>

          {lotesProducto.map((loteProducto) => (
            <div
              key={loteProducto.lote_producto_id}
              className="cat-lote-fila"
            >
              <div className="cat-lote-info">
                <span className="cat-lote-nombre">
                  {loteProducto.lote_descripcion || "Lote " + loteProducto.lote_id}
                </span>
                <span className="cat-lote-fecha">
                  {loteProducto.lote_fecha}
                  {loteProducto.costo_usd != null &&
                    ` · USD ${formatearDecimal(loteProducto.costo_usd)}`}
                </span>
              </div>

              <div className="cat-lote-cantidad">
                <label
                  htmlFor={`cant-lote-${loteProducto.lote_producto_id}`}
                  className="cat-lote-label"
                >
                  Cantidad
                </label>

                <div className="cat-lote-input-grupo">
                  <input
                    id={`cant-lote-${loteProducto.lote_producto_id}`}
                    type="number"
                    min="0"
                    step="1"
                    value={obtenerCantidadActual(loteProducto)}
                    onChange={(evento) =>
                      cambiarCantidad(
                        loteProducto.lote_producto_id,
                        evento.target.value
                      )
                    }
                    className="cat-lote-input"
                    disabled={guardandoLote === loteProducto.lote_producto_id}
                  />

                  {cantidadCambio(loteProducto) && (
                    <button
                      type="button"
                      className="btn-principal cat-lote-btn-guardar"
                      disabled={guardandoLote === loteProducto.lote_producto_id}
                      onClick={() =>
                        onGuardarCantidad(
                          loteProducto,
                          cantidadesEditadas[loteProducto.lote_producto_id]
                        )
                      }
                    >
                      {guardandoLote === loteProducto.lote_producto_id
                        ? "..."
                        : "Guardar"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="cat-detalle-lotes" style={{ borderTop: "1px solid var(--borde, #241d24)" }}>
        {!mostrandoFormLote ? (
          <button
            type="button"
            className="btn-secundario"
            style={{ width: "100%" }}
            onClick={() => setMostrandoFormLote(true)}
          >
            Agregar a otro lote
          </button>
        ) : (
          <div className="cat-form-nuevo-lote">
            <h4 className="cat-lotes-titulo">Agregar a lote</h4>

            <div className="campo" style={{ marginBottom: "0.5rem" }}>
              <label htmlFor="nuevo-lote-select">Lote</label>
              <select
                id="nuevo-lote-select"
                value={nuevoLote.loteId}
                onChange={(e) =>
                  setNuevoLote((prev) => ({ ...prev, loteId: e.target.value }))
                }
              >
                <option value="">Seleccionar lote</option>
                {lotesDisponibles.map((lote) => (
                  <option key={lote.id} value={lote.id}>
                    {lote.descripcion || "Lote " + lote.id} — {lote.fecha}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <div className="campo" style={{ flex: 1 }}>
                <label htmlFor="nuevo-lote-costo">Costo USD</label>
                <input
                  id="nuevo-lote-costo"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={nuevoLote.costoUsd}
                  onChange={(e) =>
                    setNuevoLote((prev) => ({ ...prev, costoUsd: e.target.value }))
                  }
                />
              </div>

              <div className="campo" style={{ flex: 1 }}>
                <label htmlFor="nuevo-lote-cantidad">Cantidad</label>
                <input
                  id="nuevo-lote-cantidad"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={nuevoLote.cantidad}
                  onChange={(e) =>
                    setNuevoLote((prev) => ({ ...prev, cantidad: e.target.value }))
                  }
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn-secundario"
                style={{ flex: 1 }}
                onClick={() => {
                  setMostrandoFormLote(false)
                  setNuevoLote({ loteId: "", costoUsd: "", cantidad: "" })
                }}
                disabled={guardandoLote === "nuevo"}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn-principal"
                style={{ flex: 1 }}
                disabled={
                  !nuevoLote.loteId ||
                  convertirNumero(nuevoLote.cantidad) <= 0 ||
                  guardandoLote === "nuevo"
                }
                onClick={async () => {
                  await onAgregarALote(
                    producto.id,
                    Number(nuevoLote.loteId),
                    nuevoLote.costoUsd,
                    nuevoLote.cantidad
                  )
                  setMostrandoFormLote(false)
                  setNuevoLote({ loteId: "", costoUsd: "", cantidad: "" })
                }}
              >
                {guardandoLote === "nuevo" ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        )}
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
  categorias,
  lotes,
  guardando,
  calculandoSugerencia,
  formularioValido,
  onCambiar,
  onSugerencia,
  onGuardar,
  onCerrar,
  sugerencia,
  mostrarMensaje,
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

        <SubidorImagen
          etiqueta="Foto principal"
          imagenUrl={formulario.imagenUrl}
          onSubida={(url) => onCambiar("imagenUrl", url)}
          onQuitar={() => onCambiar("imagenUrl", "")}
          mostrarMensaje={mostrarMensaje}
        />

        <SubidorImagen
          etiqueta="Foto secundaria (opcional)"
          imagenUrl={formulario.imagenUrl2}
          onSubida={(url) => onCambiar("imagenUrl2", url)}
          onQuitar={() => onCambiar("imagenUrl2", "")}
          mostrarMensaje={mostrarMensaje}
        />

        <div className="campo">
          <label htmlFor="producto-descripcion">Descripción</label>
          <textarea
            id="producto-descripcion"
            value={formulario.descripcion}
            onChange={(evento) => onCambiar("descripcion", evento.target.value)}
            placeholder="Detalle que se muestra en el catálogo"
            maxLength={500}
            rows={3}
          />
        </div>

        <div className="grid-form-config">
          <div className="campo">
            <label htmlFor="producto-material">Material</label>
            <input
              id="producto-material"
              type="text"
              value={formulario.material}
              onChange={(evento) => onCambiar("material", evento.target.value)}
              placeholder="Acero quirúrgico, cuero..."
              maxLength={200}
            />
          </div>

          <div className="campo">
            <label htmlFor="producto-talla">Talla</label>
            <input
              id="producto-talla"
              type="text"
              value={formulario.talla}
              onChange={(evento) => onCambiar("talla", evento.target.value)}
              placeholder="Única, ajustable, 45cm..."
              maxLength={100}
            />
          </div>
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
                  {lote.descripcion || "Lote " + lote.id} — {lote.fecha}
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="producto-costo-usd">Costo USD</label>
            <input
              id="producto-costo-usd"
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
              onChange={(evento) => onCambiar("cantidadComprada", evento.target.value)}
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

        <div className="campo campo-checkbox">
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={formulario.enCatalogo}
              onChange={(e) => onCambiar("enCatalogo", e.target.checked)}
            />
            <span>Mostrar en catálogo público</span>
          </label>
          <p style={{ fontSize: "0.75rem", color: "var(--texto-tenue)", marginTop: "0.3rem" }}>
            Desmarcá esta opción si el producto es un insumo o no querés que aparezca en el catálogo.
          </p>
        </div>

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

function SubidorImagen({ etiqueta = "Foto del producto", imagenUrl, onSubida, onQuitar, mostrarMensaje }) {
  const inputRef = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)

  async function subirArchivo(archivo) {
    if (!archivo) return

    if (!archivo.type.startsWith("image/")) {
      mostrarMensaje?.("El archivo debe ser una imagen.", "error")
      return
    }

    if (archivo.size > 10 * 1024 * 1024) {
      mostrarMensaje?.("La imagen es muy grande (máximo 10 MB).", "error")
      return
    }

    try {
      setSubiendo(true)

      const datos = new FormData()
      datos.append("file", archivo)
      datos.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)

      const respuesta = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: datos }
      )

      if (!respuesta.ok) {
        throw new Error("No se pudo subir la imagen")
      }

      const resultado = await respuesta.json()
      onSubida(resultado.secure_url)
    } catch (error) {
      mostrarMensaje?.("Error al subir la foto. Intentá de nuevo.", "error")
    } finally {
      setSubiendo(false)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  function manejarInput(evento) {
    const archivo = evento.target.files?.[0]
    subirArchivo(archivo)
  }

  function manejarSoltar(evento) {
    evento.preventDefault()
    evento.stopPropagation()
    setArrastrando(false)

    if (subiendo) return

    const archivo = evento.dataTransfer?.files?.[0]
    subirArchivo(archivo)
  }

  function manejarArrastreEncima(evento) {
    evento.preventDefault()
    evento.stopPropagation()
    if (!arrastrando) setArrastrando(true)
  }

  function manejarArrastreSale(evento) {
    evento.preventDefault()
    evento.stopPropagation()
    setArrastrando(false)
  }

  const estiloZona = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.4rem",
    padding: "1.4rem 1rem",
    border: `1px dashed ${arrastrando ? "var(--acento-hover)" : "var(--borde)"}`,
    borderRadius: "var(--radio)",
    background: arrastrando ? "var(--superficie-alta)" : "var(--superficie)",
    color: "var(--texto-tenue)",
    textAlign: "center",
    cursor: subiendo ? "default" : "pointer",
    transition: "border-color 130ms ease, background-color 130ms ease",
  }

  return (
    <div className="campo">
      <label>{etiqueta}</label>

      {imagenUrl && (
        <div className="cat-preview-img" style={{ marginBottom: "0.6rem" }}>
          <ImagenProducto src={imagenUrl} alt="Vista previa" />
        </div>
      )}

      <div
        style={estiloZona}
        onClick={() => {
          if (!subiendo) inputRef.current?.click()
        }}
        onDrop={manejarSoltar}
        onDragOver={manejarArrastreEncima}
        onDragEnter={manejarArrastreEncima}
        onDragLeave={manejarArrastreSale}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !subiendo) {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        {subiendo ? (
          <span style={{ fontSize: "0.85rem" }}>Subiendo foto...</span>
        ) : (
          <>
            <span style={{ fontSize: "0.85rem", color: "var(--texto)" }}>
              {arrastrando
                ? "Soltá la imagen acá"
                : imagenUrl
                  ? "Arrastrá otra imagen o hacé clic para cambiarla"
                  : "Arrastrá una imagen acá o hacé clic para elegirla"}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--texto-debil)" }}>
              JPG o PNG · hasta 10 MB
            </span>
          </>
        )}
      </div>

      {imagenUrl && !subiendo && (
        <button
          type="button"
          className="btn-borrar"
          style={{ marginTop: "0.5rem" }}
          onClick={onQuitar}
        >
          Quitar foto
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={manejarInput}
        style={{ display: "none" }}
      />
    </div>
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

export default Catalogo