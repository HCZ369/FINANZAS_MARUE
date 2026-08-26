import { useState, useEffect } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client"

function Gastos({ negocioId }) {
  const [gastos, setGastos] = useState([])
  const [categorias, setCategorias] = useState([])

  // Formulario
  const [categoriaId, setCategoriaId] = useState("")
  const [monto, setMonto] = useState("")
  const [fecha, setFecha] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [editandoId, setEditandoId] = useState(null)

  // UI
  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState("exito")
  const [filtro, setFiltro] = useState("mes") // "hoy" | "semana" | "mes" | "todo"
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => {
    cargarDatos()
  }, [negocioId])

  async function cargarDatos() {
    try {
      const gastosData = await apiGet(`/negocios/${negocioId}/gastos/`)
      const categoriasData = await apiGet(`/negocios/${negocioId}/categorias/`)
      setGastos(gastosData)
      setCategorias(categoriasData)
    } catch (error) {
      mostrarMsg("Error cargando datos: " + error.message, "error")
    }
  }

  function mostrarMsg(texto, tipo) {
    setMensaje(texto)
    setTipoMensaje(tipo || "exito")
    if (tipo !== "error") {
      setTimeout(() => setMensaje(""), 4000)
    }
  }

  function nombreCategoria(id) {
    const categoria = categorias.find((c) => c.id === id)
    return categoria ? categoria.nombre : "—"
  }

  function formatearMonto(valor) {
    return Number(valor).toLocaleString("es-PY")
  }

  // --- Filtros ---
  function gastosFiltrados() {
    const ahora = new Date()
    let resultado = []

    for (let i = 0; i < gastos.length; i++) {
      const gasto = gastos[i]
      const fechaGasto = new Date(gasto.fecha)

      // Filtro por período
      let pasaFiltro = false
      if (filtro === "todo") {
        pasaFiltro = true
      } else if (filtro === "hoy") {
        pasaFiltro =
          fechaGasto.getFullYear() === ahora.getFullYear() &&
          fechaGasto.getMonth() === ahora.getMonth() &&
          fechaGasto.getDate() === ahora.getDate()
      } else if (filtro === "semana") {
        const haceUnaSemana = new Date(ahora)
        haceUnaSemana.setDate(haceUnaSemana.getDate() - 7)
        pasaFiltro = fechaGasto >= haceUnaSemana
      } else if (filtro === "mes") {
        pasaFiltro =
          fechaGasto.getFullYear() === ahora.getFullYear() &&
          fechaGasto.getMonth() === ahora.getMonth()
      }

      if (!pasaFiltro) {
        continue
      }

      // Filtro por búsqueda
      if (busqueda.trim()) {
        const termino = busqueda.toLowerCase()
        const coincideCategoria = nombreCategoria(gasto.categoria_id).toLowerCase().includes(termino)
        const coincideDescripcion = gasto.descripcion && gasto.descripcion.toLowerCase().includes(termino)
        if (!coincideCategoria && !coincideDescripcion) {
          continue
        }
      }

      resultado.push(gasto)
    }

    return resultado
  }

  function totalFiltrado() {
    const lista = gastosFiltrados()
    let total = 0
    for (let i = 0; i < lista.length; i++) {
      total = total + Number(lista[i].monto)
    }
    return total
  }

  // --- CRUD ---
  function cargarEnFormulario(gasto) {
    setEditandoId(gasto.id)
    setCategoriaId(gasto.categoria_id)
    setMonto(gasto.monto)
    setFecha(gasto.fecha)
    setDescripcion(gasto.descripcion || "")
  }

  function limpiarFormulario() {
    setEditandoId(null)
    setCategoriaId("")
    setMonto("")
    setFecha("")
    setDescripcion("")
  }

  async function guardarGasto(evento) {
    evento.preventDefault()

    if (!categoriaId) {
      mostrarMsg("Seleccioná una categoría", "error")
      return
    }
    if (!monto || Number(monto) <= 0) {
      mostrarMsg("Ingresá un monto válido", "error")
      return
    }
    if (!fecha) {
      mostrarMsg("Ingresá la fecha", "error")
      return
    }

    const datos = {
      categoria_id: categoriaId,
      monto: monto,
      fecha: fecha,
      descripcion: descripcion,
    }

    try {
      let resultado
      if (editandoId) {
        resultado = await apiPut(`/negocios/${negocioId}/gastos/${editandoId}/`, datos)
      } else {
        resultado = await apiPost(`/negocios/${negocioId}/gastos/`, datos)
      }
      mostrarMsg(resultado.mensaje)
      limpiarFormulario()
      await cargarDatos()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  async function borrarGasto(gastoId) {
    if (!confirm("¿Eliminar este gasto?")) {
      return
    }
    try {
      const resultado = await apiDelete(`/negocios/${negocioId}/gastos/${gastoId}/`)
      mostrarMsg(resultado.mensaje)
      await cargarDatos()
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    }
  }

  const listaFiltrada = gastosFiltrados()

  return (
    <div>
      <h1>Gastos</h1>

      {mensaje && (
        <div className={tipoMensaje === "error" ? "msg msg-error" : "msg msg-exito"}>
          {mensaje}
          <button className="btn-cerrar-msg" onClick={() => setMensaje("")}>×</button>
        </div>
      )}

      {/* Formulario */}
      <section>
        <h2>{editandoId ? "Editar gasto" : "Registrar gasto"}</h2>
        <form onSubmit={guardarGasto}>
          <div className="grid-form-gasto">
            <div className="campo">
              <label>Categoría</label>
              <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                <option value="">Seleccionar</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label>Monto</label>
              <input
                type="number"
                placeholder="0"
                value={monto}
                min="0"
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
            <div className="campo">
              <label>Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>
          <div className="campo">
            <label>Descripción (opcional)</label>
            <input
              type="text"
              placeholder="Ej: envío, packaging, publicidad..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
          <div className="fila-form">
            <button type="submit" className="btn-principal">
              {editandoId ? "Guardar cambios" : "Registrar gasto"}
            </button>
            {editandoId && (
              <button type="button" className="btn-secundario" onClick={limpiarFormulario}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Listado */}
      <div className="barra-filtro">
        <h2>Historial</h2>
        <div className="filtros-periodo">
          <button
            className={filtro === "hoy" ? "btn-filtro activo" : "btn-filtro"}
            onClick={() => setFiltro("hoy")}
          >Hoy</button>
          <button
            className={filtro === "semana" ? "btn-filtro activo" : "btn-filtro"}
            onClick={() => setFiltro("semana")}
          >Semana</button>
          <button
            className={filtro === "mes" ? "btn-filtro activo" : "btn-filtro"}
            onClick={() => setFiltro("mes")}
          >Mes</button>
          <button
            className={filtro === "todo" ? "btn-filtro activo" : "btn-filtro"}
            onClick={() => setFiltro("todo")}
          >Todo</button>
        </div>
        <span className="total-filtro">
          {listaFiltrada.length} gastos — Total: {formatearMonto(totalFiltrado())}
        </span>
      </div>

      <div className="barra-busqueda-gastos">
        <input
          type="text"
          placeholder="Buscar por categoría o descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <table className="tabla">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Categoría</th>
            <th>Monto</th>
            <th>Descripción</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {listaFiltrada.map((g) => (
            <tr key={g.id}>
              <td>{g.fecha}</td>
              <td>{nombreCategoria(g.categoria_id)}</td>
              <td className="monto">{formatearMonto(g.monto)}</td>
              <td>{g.descripcion || "—"}</td>
              <td className="acciones-celda">
                <button className="btn-accion" onClick={() => cargarEnFormulario(g)}>Editar</button>
                <button className="btn-borrar" onClick={() => borrarGasto(g.id)}>Borrar</button>
              </td>
            </tr>
          ))}
          {listaFiltrada.length === 0 && (
            <tr><td colSpan="5" className="celda-vacia">Sin gastos en este período</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default Gastos
