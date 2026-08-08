import { useState, useEffect } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client"

function Gastos({ negocioId }) {
  const [gastos, setGastos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [categoriaId, setCategoriaId] = useState("")
  const [monto, setMonto] = useState("")
  const [fecha, setFecha] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [editandoId, setEditandoId] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [negocioId])

  async function cargarDatos() {
    const gastosData = await apiGet(`/negocios/${negocioId}/gastos/`)
    const categoriasData = await apiGet(`/negocios/${negocioId}/categorias/`)
    setGastos(gastosData)
    setCategorias(categoriasData)
  }

  function nombreCategoria(categoriaId) {
    const categoria = categorias.find((c) => c.id === categoriaId)
    return categoria ? categoria.nombre : categoriaId
  }

  function cargarEnFormulario(gasto) {
    setEditandoId(gasto.id)
    setCategoriaId(gasto.categoria_id)
    setMonto(gasto.monto)
    setFecha(gasto.fecha)
    setDescripcion(gasto.descripcion)
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
    const datos = { categoria_id: categoriaId, monto: monto, fecha: fecha, descripcion: descripcion }

    let resultado
    if (editandoId) {
      resultado = await apiPut(`/negocios/${negocioId}/gastos/${editandoId}/`, datos)
    } else {
      resultado = await apiPost(`/negocios/${negocioId}/gastos/`, datos)
    }

    setMensaje(resultado.mensaje)
    limpiarFormulario()
    await cargarDatos()
  }

  async function borrarGasto(gastoId) {
    const resultado = await apiDelete(`/negocios/${negocioId}/gastos/${gastoId}/`)
    setMensaje(resultado.mensaje)
    await cargarDatos()
  }

  return (
    <div>
      <h1>Gastos</h1>

      <form onSubmit={guardarGasto}>
        <div>
          <label>Categoría</label>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Seleccionar</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Monto</label>
          <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </div>
        <div>
          <label>Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div>
          <label>Descripción</label>
          <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>
        <button type="submit">{editandoId ? "Guardar cambios" : "Registrar gasto"}</button>
        {editandoId && <button type="button" onClick={limpiarFormulario}>Cancelar</button>}
        {mensaje && <p>{mensaje}</p>}
      </form>

      <h2>Listado de gastos</h2>
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
          {gastos.map((g) => (
            <tr key={g.id}>
              <td>{g.fecha}</td>
              <td>{nombreCategoria(g.categoria_id)}</td>
              <td>{g.monto}</td>
              <td>{g.descripcion}</td>
              <td>
                <button onClick={() => cargarEnFormulario(g)}>Editar</button>
                <button onClick={() => borrarGasto(g.id)}>Borrar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Gastos