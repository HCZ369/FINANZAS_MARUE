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

const FILTROS = {
  HOY: "hoy",
  SEMANA: "semana",
  MES: "mes",
  TODO: "todo",
}

const FORMULARIO_INICIAL = {
  categoriaId: "",
  monto: "",
  fecha: obtenerFechaActual(),
  descripcion: "",
}

const FORMATEADOR_MONTO = new Intl.NumberFormat("es-PY", {
  maximumFractionDigits: 0,
})

function Gastos({ negocioId }) {
  const temporizadorMensaje = useRef(null)

  const [gastos, setGastos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL)
  const [editandoId, setEditandoId] = useState(null)

  const [filtro, setFiltro] = useState(FILTROS.MES)
  const [busqueda, setBusqueda] = useState("")
  const [mensaje, setMensaje] = useState(null)

  const [cargando, setCargando] = useState(true)
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

  const cargarDatos = useCallback(async () => {
    if (!negocioId) {
      setGastos([])
      setCategorias([])
      setCargando(false)
      return
    }

    try {
      setCargando(true)

      const [gastosData, categoriasData] = await Promise.all([
        apiGet(`/negocios/${negocioId}/gastos/`),
        apiGet(`/negocios/${negocioId}/categorias/`),
      ])

      setGastos(Array.isArray(gastosData) ? gastosData : [])
      setCategorias(
        Array.isArray(categoriasData) ? categoriasData : []
      )
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudieron cargar los gastos.",
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
    return () => {
      if (temporizadorMensaje.current) {
        window.clearTimeout(temporizadorMensaje.current)
      }
    }
  }, [])

  const categoriasPorId = useMemo(() => {
    return new Map(
      categorias.map((categoria) => [
        String(categoria.id),
        categoria,
      ])
    )
  }, [categorias])

  const gastosFiltrados = useMemo(() => {
    const ahora = new Date()
    const inicioHoy = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate()
    )

    const inicioSemana = new Date(inicioHoy)
    inicioSemana.setDate(inicioHoy.getDate() - 6)

    const termino = normalizarTexto(busqueda)

    return gastos
      .filter((gasto) => {
        const fechaGasto = convertirFechaLocal(gasto.fecha)

        if (!fechaGasto) return false

        let coincidePeriodo = true

        if (filtro === FILTROS.HOY) {
          coincidePeriodo =
            fechaGasto.getTime() === inicioHoy.getTime()
        }

        if (filtro === FILTROS.SEMANA) {
          coincidePeriodo =
            fechaGasto >= inicioSemana &&
            fechaGasto <= ahora
        }

        if (filtro === FILTROS.MES) {
          coincidePeriodo =
            fechaGasto.getFullYear() === ahora.getFullYear() &&
            fechaGasto.getMonth() === ahora.getMonth()
        }

        if (!coincidePeriodo) return false
        if (!termino) return true

        const categoria = obtenerNombreCategoria(
          gasto.categoria_id,
          categoriasPorId
        )

        return (
          normalizarTexto(categoria).includes(termino) ||
          normalizarTexto(gasto.descripcion).includes(termino)
        )
      })
      .sort((a, b) => {
        const fechaA = convertirFechaLocal(a.fecha)?.getTime() || 0
        const fechaB = convertirFechaLocal(b.fecha)?.getTime() || 0

        return fechaB - fechaA
      })
  }, [gastos, categoriasPorId, filtro, busqueda])

  const resumen = useMemo(() => {
    return gastosFiltrados.reduce(
      (resultado, gasto) => {
        resultado.total += convertirNumero(gasto.monto)
        resultado.cantidad += 1

        return resultado
      },
      {
        total: 0,
        cantidad: 0,
      }
    )
  }, [gastosFiltrados])

  const formularioValido =
    formulario.categoriaId &&
    convertirNumero(formulario.monto) > 0 &&
    formulario.fecha

  function actualizarFormulario(campo, valor) {
    setFormulario((formularioActual) => ({
      ...formularioActual,
      valor,
    }))
  }

  function cargarEnFormulario(gasto) {
    setEditandoId(gasto.id)

    setFormulario({
      categoriaId: String(gasto.categoria_id || ""),
      monto: String(gasto.monto || ""),
      fecha: gasto.fecha || obtenerFechaActual(),
      descripcion: gasto.descripcion || "",
    })

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  function limpiarFormulario() {
    setEditandoId(null)
    setFormulario({
      ...FORMULARIO_INICIAL,
      fecha: obtenerFechaActual(),
    })
  }

  function limpiarFiltros() {
    setBusqueda("")
    setFiltro(FILTROS.MES)
  }

  function validarFormulario() {
    if (!formulario.categoriaId) {
      return "Seleccioná una categoría."
    }

    if (convertirNumero(formulario.monto) <= 0) {
      return "Ingresá un monto mayor que cero."
    }

    if (!formulario.fecha) {
      return "Ingresá la fecha del gasto."
    }

    return null
  }

  async function guardarGasto(evento) {
    evento.preventDefault()

    const errorValidacion = validarFormulario()

    if (errorValidacion) {
      mostrarMensaje(errorValidacion, "error")
      return
    }

    const datos = {
      categoria_id: Number(formulario.categoriaId),
      monto: convertirNumero(formulario.monto),
      fecha: formulario.fecha,
      descripcion: formulario.descripcion.trim() || null,
    }

    try {
      setGuardando(true)

      const resultado = editandoId
        ? await apiPut(
            `/negocios/${negocioId}/gastos/${editandoId}/`,
            datos
          )
        : await apiPost(
            `/negocios/${negocioId}/gastos/`,
            datos
          )

      mostrarMensaje(
        resultado?.mensaje ||
          (editandoId
            ? "Gasto actualizado correctamente."
            : "Gasto registrado correctamente.")
      )

      limpiarFormulario()
      await cargarDatos()
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudo guardar el gasto.",
        "error"
      )
    } finally {
      setGuardando(false)
    }
  }

  async function borrarGasto(gasto) {
    const debeEliminarse = window.confirm(
      `¿Eliminar el gasto de ${formatearMonto(gasto.monto)}?`
    )

    if (!debeEliminarse) return

    try {
      setEliminandoId(gasto.id)

      const resultado = await apiDelete(
        `/negocios/${negocioId}/gastos/${gasto.id}/`
      )

      setGastos((gastosActuales) =>
        gastosActuales.filter(
          (item) => String(item.id) !== String(gasto.id)
        )
      )

      if (String(editandoId) === String(gasto.id)) {
        limpiarFormulario()
      }

      mostrarMensaje(
        resultado?.mensaje || "Gasto eliminado correctamente."
      )
    } catch (error) {
      mostrarMensaje(
        error?.message || "No se pudo eliminar el gasto.",
        "error"
      )
    } finally {
      setEliminandoId(null)
    }
  }

  if (cargando) {
    return (
      <main className="pagina-gastos">
        <h1>Gastos</h1>
        <p className="mensaje-cargando">Cargando gastos...</p>
      </main>
    )
  }

  return (
    <main className="pagina-gastos">
      <header className="encabezado-pagina">
        <div>
          <h1>Gastos</h1>
          <p className="subtitulo-pagina">
            Registrá y controlá los egresos del negocio.
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

      <section className="seccion-formulario">
        <div className="cabecera-seccion">
          <div>
            <h2>
              {editandoId ? "Editar gasto" : "Registrar gasto"}
            </h2>

            <p>
              {editandoId
                ? "Modificá los datos del gasto seleccionado."
                : "Cargá un nuevo egreso del negocio."}
            </p>
          </div>

          {editandoId && (
            <span className="modo-edicion">
              Editando registro
            </span>
          )}
        </div>

        <form
          className="form-gasto"
          onSubmit={guardarGasto}
        >
          <div className="grid-form-gasto">
            <div className="campo">
              <label htmlFor="gasto-categoria">
                Categoría
              </label>

              <select
                id="gasto-categoria"
                value={formulario.categoriaId}
                onChange={(evento) =>
                  actualizarFormulario(
                    "categoriaId",
                    evento.target.value
                  )
                }
                required
              >
                <option value="">Seleccionar categoría</option>

                {categorias.map((categoria) => (
                  <option
                    key={categoria.id}
                    value={categoria.id}
                  >
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="gasto-monto">Monto</label>

              <input
                id="gasto-monto"
                type="number"
                min="1"
                step="any"
                placeholder="0"
                value={formulario.monto}
                onChange={(evento) =>
                  actualizarFormulario(
                    "monto",
                    evento.target.value
                  )
                }
                required
              />
            </div>

            <div className="campo">
              <label htmlFor="gasto-fecha">Fecha</label>

              <input
                id="gasto-fecha"
                type="date"
                value={formulario.fecha}
                onChange={(evento) =>
                  actualizarFormulario(
                    "fecha",
                    evento.target.value
                  )
                }
                required
              />
            </div>
          </div>

          <div className="campo">
            <label htmlFor="gasto-descripcion">
              Descripción opcional
            </label>

            <input
              id="gasto-descripcion"
              type="text"
              placeholder="Envío, packaging, publicidad..."
              value={formulario.descripcion}
              onChange={(evento) =>
                actualizarFormulario(
                  "descripcion",
                  evento.target.value
                )
              }
              maxLength={250}
            />

            <span className="contador contador-descripcion">
              {formulario.descripcion.length}/250
            </span>
          </div>

          <div className="acciones-formulario-gasto">
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
                  : "Registrar gasto"}
            </button>
          </div>
        </form>
      </section>

      <section className="seccion-listado">
        <div className="barra-filtro">
          <div>
            <h2>Historial</h2>
            <p>Gastos registrados en el período seleccionado.</p>
          </div>

          <div
            className="filtros-periodo"
            aria-label="Filtrar gastos por período"
          >
            {[
              [FILTROS.HOY, "Hoy"],
              [FILTROS.SEMANA, "7 días"],
              [FILTROS.MES, "Mes"],
              [FILTROS.TODO, "Todo"],
            ].map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                className={
                  filtro === valor
                    ? "btn-filtro activo"
                    : "btn-filtro"
                }
                onClick={() => setFiltro(valor)}
                aria-pressed={filtro === valor}
              >
                {etiqueta}
              </button>
            ))}
          </div>

          <div className="total-filtro">
            <span>
              {resumen.cantidad}{" "}
              {resumen.cantidad === 1 ? "gasto" : "gastos"}
            </span>

            <strong>{formatearMonto(resumen.total)}</strong>
          </div>
        </div>

        <div className="barra-busqueda-gastos">
          <div className="campo buscador-gastos">
            <label htmlFor="buscar-gasto">
              Buscar gastos
            </label>

            <input
              id="buscar-gasto"
              type="search"
              placeholder="Categoría o descripción"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(evento.target.value)
              }
            />
          </div>

          {(busqueda || filtro !== FILTROS.MES) && (
            <button
              type="button"
              className="btn-limpiar"
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="contenedor-tabla">
          <table className="tabla tabla-gastos">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Categoría</th>
                <th scope="col">Descripción</th>
                <th scope="col" className="columna-numerica">
                  Monto
                </th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {gastosFiltrados.map((gasto) => (
                <tr key={gasto.id}>
                  <td>{formatearFecha(gasto.fecha)}</td>

                  <td>
                    <span className="categoria-gasto">
                      {obtenerNombreCategoria(
                        gasto.categoria_id,
                        categoriasPorId
                      )}
                    </span>
                  </td>

                  <td className="descripcion-gasto">
                    {gasto.descripcion || "Sin descripción"}
                  </td>

                  <td className="monto monto-gasto columna-numerica">
                    {formatearMonto(gasto.monto)}
                  </td>

                  <td>
                    <div className="acciones-celda">
                      <button
                        type="button"
                        className="btn-accion"
                        onClick={() =>
                          cargarEnFormulario(gasto)
                        }
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="btn-borrar"
                        onClick={() => borrarGasto(gasto)}
                        disabled={eliminandoId === gasto.id}
                      >
                        {eliminandoId === gasto.id
                          ? "Eliminando..."
                          : "Eliminar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {gastosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="celda-vacia">
                    <p>
                      {busqueda.trim()
                        ? `No hay resultados para "${busqueda.trim()}".`
                        : "No hay gastos en este período."}
                    </p>

                    {(busqueda || filtro !== FILTROS.MES) && (
                      <button
                        type="button"
                        className="btn-secundario"
                        onClick={limpiarFiltros}
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>

            {gastosFiltrados.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3}>
                    Total de {resumen.cantidad} registros
                  </td>

                  <td className="monto columna-numerica">
                    {formatearMonto(resumen.total)}
                  </td>

                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </main>
  )
}

function obtenerNombreCategoria(id, categoriasPorId) {
  return (
    categoriasPorId.get(String(id))?.nombre ||
    "Sin categoría"
  )
}

function obtenerFechaActual() {
  const ahora = new Date()
  const desplazamiento = ahora.getTimezoneOffset() * 60_000

  return new Date(ahora.getTime() - desplazamiento)
    .toISOString()
    .split("T")[0]
}

function convertirFechaLocal(fecha) {
  if (!fecha) return null

  const [anio, mes, dia] = String(fecha)
    .split("T")[0]
    .split("-")
    .map(Number)

  if (!anio || !mes || !dia) return null

  return new Date(anio, mes - 1, dia)
}

function formatearFecha(fecha) {
  const fechaLocal = convertirFechaLocal(fecha)

  if (!fechaLocal) return "Sin fecha"

  return fechaLocal.toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function normalizarTexto(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function convertirNumero(valor) {
  const numero = Number(valor)

  return Number.isFinite(numero) ? numero : 0
}

function formatearMonto(valor) {
  return FORMATEADOR_MONTO.format(convertirNumero(valor))
}

export default Gastos