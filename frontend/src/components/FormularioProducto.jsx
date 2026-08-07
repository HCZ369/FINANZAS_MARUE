import { useState } from "react"
import { apiPost } from "../api/client"

function FormularioProducto({ negocioId }) {
  const [nombre, setNombre] = useState("")
  const [precio, setPrecio] = useState("")
  const [mensaje, setMensaje] = useState("")

  async function manejarEnvio(evento) {
    evento.preventDefault()

    const resultado = await apiPost(`/negocios/${negocioId}/productos/`, {
      nombre: nombre,
      precio: precio,
    })

    setMensaje(resultado.mensaje)
    setNombre("")
    setPrecio("")
  }

  return (
    <form onSubmit={manejarEnvio}>
      <div>
        <label>Nombre del producto</label>
        <input
          type="text"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
        />
      </div>
      <div>
        <label>Precio</label>
        <input
          type="number"
          value={precio}
          onChange={(evento) => setPrecio(evento.target.value)}
        />
      </div>
      <button type="submit">Crear producto</button>
      {mensaje && <p>{mensaje}</p>}
    </form>
  )
}

export default FormularioProducto