import { useState, useEffect } from "react"
import { apiGet, apiPost } from "../api/client"

function Gastos({ negocioId }) {
  const [gastos, setGastos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [categoriaId, setCategoriaId] = useState("")
  const [monto, setMonto] = useState("")
  const [fecha, setFecha] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [mensaje, setMensaje] = useState("")

  useEffect(() => {
    async function cargarDatos() {
      const gastosData = await apiGet(`/negocios/${negocioId}/gastos/`)
      const categoriasData = await apiGet(`/negocios/${negocioId}/categorias/`)
      setGastos(gastosData)
      setCategorias(categoriasData)
    }
    cargarDatos()
  }, [negocioId])

  async function crearGasto(evento) {
    evento.preventDefault()
    const resultado = await apiPost(`/negocios/${negocioId}/gastos/`, {
      categoria_id: categoriaId,
      monto: monto,
      fecha: fecha,
      descripcion: descripcion,
    })
    setMensaje(resultado.mensaje)
    setCategoriaId("")
    setMonto("")
    setFecha("")
    setDescripcion("")

    const gastosActualizados = await apiGet(`/negocios/${negocioId}/gastos/`)
    setGastos(gastosActualizados)
  }

  return (
    <div>
      <h1>Gastos</h1>

      <form onSubmit={crearGasto}>
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
        <button type="submit">Registrar gasto</button>
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
          </tr>
        </thead>
        <tbody>
          {gastos.map((g) => (
            <tr key={g.id}>
              <td>{g.fecha}</td>
              <td>{g.categoria_id}</td>
              <td>{g.monto}</td>
              <td>{g.descripcion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Gastos