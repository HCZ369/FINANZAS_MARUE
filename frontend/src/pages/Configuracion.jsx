import { useState, useEffect } from "react"
import { apiGet, apiPost } from "../api/client"
import FormularioProducto from "../components/FormularioProducto"

function Configuracion({ negocioId }) {
  const [nombreNegocio, setNombreNegocio] = useState("")
  const [nombreCategoria, setNombreCategoria] = useState("")
  const [tipoCategoria, setTipoCategoria] = useState("gasto")
  const [nombreCliente, setNombreCliente] = useState("")
  const [correoCliente, setCorreoCliente] = useState("")
  const [mensaje, setMensaje] = useState("")

  const [montoInyeccion, setMontoInyeccion] = useState("")
  const [fechaInyeccion, setFechaInyeccion] = useState("")
  const [notaInyeccion, setNotaInyeccion] = useState("")

  async function crearNegocio(evento) {
    evento.preventDefault()
    const resultado = await apiPost("/negocios/", { nombre: nombreNegocio })
    setMensaje(resultado.mensaje)
    setNombreNegocio("")
  }

  async function crearCategoria(evento) {
    evento.preventDefault()
    const resultado = await apiPost(`/negocios/${negocioId}/categorias/`, {
      nombre: nombreCategoria,
      tipo: tipoCategoria,
    })
    setMensaje(resultado.mensaje)
    setNombreCategoria("")
  }

  async function crearCliente(evento) {
    evento.preventDefault()
    const resultado = await apiPost(`/negocios/${negocioId}/clientes/`, {
      nombre: nombreCliente,
      correo: correoCliente,
    })
    setMensaje(resultado.mensaje)
    setNombreCliente("")
    setCorreoCliente("")
  }

  async function crearInyeccion(evento) {
    evento.preventDefault()
    const resultado = await apiPost(`/negocios/${negocioId}/inyecciones/`, {
      monto: montoInyeccion,
      fecha: fechaInyeccion,
      nota: notaInyeccion,
    })
    setMensaje(resultado.mensaje)
    setMontoInyeccion("")
    setFechaInyeccion("")
    setNotaInyeccion("")
  }

  return (
    <div>
      <h1>Configuración</h1>
      {mensaje && <p className="mensaje-exito">{mensaje}</p>}

      <section>
        <h2>Nuevo negocio</h2>
        <form onSubmit={crearNegocio}>
          <div>
            <label>Nombre</label>
            <input type="text" value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)} />
          </div>
          <button type="submit">Crear negocio</button>
        </form>
      </section>

      <section>
        <h2>Nueva categoría</h2>
        <form onSubmit={crearCategoria}>
          <div>
            <label>Nombre</label>
            <input type="text" value={nombreCategoria} onChange={(e) => setNombreCategoria(e.target.value)} />
          </div>
          <div>
            <label>Tipo</label>
            <select value={tipoCategoria} onChange={(e) => setTipoCategoria(e.target.value)}>
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso</option>
            </select>
          </div>
          <button type="submit">Crear categoría</button>
        </form>
      </section>

      <section>
        <h2>Nuevo cliente</h2>
        <form onSubmit={crearCliente}>
          <div>
            <label>Nombre</label>
            <input type="text" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} />
          </div>
          <div>
            <label>Correo</label>
            <input type="email" value={correoCliente} onChange={(e) => setCorreoCliente(e.target.value)} />
          </div>
          <button type="submit">Crear cliente</button>
        </form>
      </section>

      <section>
        <h2>Inyección de capital</h2>
        <form onSubmit={crearInyeccion}>
          <div>
            <label>Monto</label>
            <input type="number" value={montoInyeccion} onChange={(e) => setMontoInyeccion(e.target.value)} />
          </div>
          <div>
            <label>Fecha</label>
            <input type="date" value={fechaInyeccion} onChange={(e) => setFechaInyeccion(e.target.value)} />
          </div>
          <div>
            <label>Nota</label>
            <input type="text" value={notaInyeccion} onChange={(e) => setNotaInyeccion(e.target.value)} />
          </div>
          <button type="submit">Registrar inyección</button>
        </form>
      </section>

      <section>
        <h2>Nuevo producto</h2>
        <FormularioProducto negocioId={negocioId} />
      </section>
    </div>
  )
}

export default Configuracion