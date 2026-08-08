import { useState, useEffect } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client"

function Configuracion({ negocioId }) {
  const [negocios, setNegocios] = useState([])
  const [categorias, setCategorias] = useState([])
  const [clientes, setClientes] = useState([])
  const [inyecciones, setInyecciones] = useState([])

  const [nombreNegocio, setNombreNegocio] = useState("")
  const [editandoNegocioId, setEditandoNegocioId] = useState(null)

  const [nombreCategoria, setNombreCategoria] = useState("")
  const [tipoCategoria, setTipoCategoria] = useState("gasto")
  const [editandoCategoriaId, setEditandoCategoriaId] = useState(null)

  const [nombreCliente, setNombreCliente] = useState("")
  const [correoCliente, setCorreoCliente] = useState("")
  const [editandoClienteId, setEditandoClienteId] = useState(null)

  const [montoInyeccion, setMontoInyeccion] = useState("")
  const [fechaInyeccion, setFechaInyeccion] = useState("")
  const [notaInyeccion, setNotaInyeccion] = useState("")
  const [editandoInyeccionId, setEditandoInyeccionId] = useState(null)

  const [mensaje, setMensaje] = useState("")

  const [productos, setProductos] = useState([])
  const [nombreProducto, setNombreProducto] = useState("")
  const [precioProducto, setPrecioProducto] = useState("")
  const [editandoProductoId, setEditandoProductoId] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [negocioId])

  async function cargarDatos() {
    setNegocios(await apiGet("/negocios/"))
    setCategorias(await apiGet(`/negocios/${negocioId}/categorias/`))
    setClientes(await apiGet(`/negocios/${negocioId}/clientes/`))
    setInyecciones(await apiGet(`/negocios/${negocioId}/inyecciones/`))
    setProductos(await apiGet(`/negocios/${negocioId}/productos/`))
  }

  // --- Negocio ---
  async function guardarNegocio(evento) {
    evento.preventDefault()
    const datos = { nombre: nombreNegocio }
    const resultado = editandoNegocioId
      ? await apiPut(`/negocios/${editandoNegocioId}/`, datos)
      : await apiPost("/negocios/", datos)
    setMensaje(resultado.mensaje)
    setNombreNegocio("")
    setEditandoNegocioId(null)
    await cargarDatos()
  }
  function editarNegocio(n) {
    setEditandoNegocioId(n.id)
    setNombreNegocio(n.nombre)
  }
  async function borrarNegocio(id) {
    const resultado = await apiDelete(`/negocios/${id}/`)
    setMensaje(resultado.mensaje)
    await cargarDatos()
  }

  // --- Categoria ---
  async function guardarCategoria(evento) {
    evento.preventDefault()
    const datos = { nombre: nombreCategoria, tipo: tipoCategoria }
    const resultado = editandoCategoriaId
      ? await apiPut(`/negocios/${negocioId}/categorias/${editandoCategoriaId}/`, datos)
      : await apiPost(`/negocios/${negocioId}/categorias/`, datos)
    setMensaje(resultado.mensaje)
    setNombreCategoria("")
    setEditandoCategoriaId(null)
    await cargarDatos()
  }
  function editarCategoria(c) {
    setEditandoCategoriaId(c.id)
    setNombreCategoria(c.nombre)
    setTipoCategoria(c.tipo)
  }
  async function borrarCategoria(id) {
    const resultado = await apiDelete(`/negocios/${negocioId}/categorias/${id}/`)
    setMensaje(resultado.mensaje)
    await cargarDatos()
  }

  // --- Cliente ---
  async function guardarCliente(evento) {
    evento.preventDefault()
    const datos = { nombre: nombreCliente, correo: correoCliente }
    const resultado = editandoClienteId
      ? await apiPut(`/negocios/${negocioId}/clientes/${editandoClienteId}/`, datos)
      : await apiPost(`/negocios/${negocioId}/clientes/`, datos)
    setMensaje(resultado.mensaje)
    setNombreCliente("")
    setCorreoCliente("")
    setEditandoClienteId(null)
    await cargarDatos()
  }
  function editarCliente(c) {
    setEditandoClienteId(c.id)
    setNombreCliente(c.nombre)
    setCorreoCliente(c.correo)
  }
  async function borrarCliente(id) {
    const resultado = await apiDelete(`/negocios/${negocioId}/clientes/${id}/`)
    setMensaje(resultado.mensaje)
    await cargarDatos()
  }

  // --- Inyeccion ---
  async function guardarInyeccion(evento) {
    evento.preventDefault()
    const datos = { monto: montoInyeccion, fecha: fechaInyeccion, nota: notaInyeccion }
    const resultado = editandoInyeccionId
      ? await apiPut(`/negocios/${negocioId}/inyecciones/${editandoInyeccionId}/`, datos)
      : await apiPost(`/negocios/${negocioId}/inyecciones/`, datos)
    setMensaje(resultado.mensaje)
    setMontoInyeccion("")
    setFechaInyeccion("")
    setNotaInyeccion("")
    setEditandoInyeccionId(null)
    await cargarDatos()
  }
  function editarInyeccion(i) {
    setEditandoInyeccionId(i.id)
    setMontoInyeccion(i.monto)
    setFechaInyeccion(i.fecha)
    setNotaInyeccion(i.nota)
  }
  async function borrarInyeccion(id) {
    const resultado = await apiDelete(`/negocios/${negocioId}/inyecciones/${id}/`)
    setMensaje(resultado.mensaje)
    await cargarDatos()
  }

  // --- Producto ---
  async function guardarProducto(evento) {
    evento.preventDefault()
    const datos = { nombre: nombreProducto, precio: precioProducto }
    const resultado = editandoProductoId
      ? await apiPut(`/negocios/${negocioId}/productos/${editandoProductoId}/`, datos)
      : await apiPost(`/negocios/${negocioId}/productos/`, datos)
    setMensaje(resultado.mensaje)
    setNombreProducto("")
    setPrecioProducto("")
    setEditandoProductoId(null)
    await cargarDatos()
  }
  function editarProducto(p) {
    setEditandoProductoId(p.id)
    setNombreProducto(p.nombre)
    setPrecioProducto(p.precio)
  }
  async function borrarProducto(id) {
    const resultado = await apiDelete(`/negocios/${negocioId}/productos/${id}/`)
    setMensaje(resultado.mensaje)
    await cargarDatos()
  }

  return (
    <div>
      <h1>Configuración</h1>
      {mensaje && <p className="mensaje-exito">{mensaje}</p>}

      <section>
        <h2>Negocios</h2>
        <form onSubmit={guardarNegocio}>
          <input type="text" placeholder="Nombre" value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)} />
          <button type="submit">{editandoNegocioId ? "Guardar" : "Crear negocio"}</button>
        </form>
        <div className="lista-items">
          {negocios.map((n) => (
            <div className="fila-item" key={n.id}>
              <span>{n.nombre}</span>
              <div className="acciones">
                <button onClick={() => editarNegocio(n)}>Editar</button>
                <button className="btn-borrar" onClick={() => borrarNegocio(n.id)}>Borrar</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Categorías</h2>
        <form onSubmit={guardarCategoria}>
          <input type="text" placeholder="Nombre" value={nombreCategoria} onChange={(e) => setNombreCategoria(e.target.value)} />
          <select value={tipoCategoria} onChange={(e) => setTipoCategoria(e.target.value)}>
            <option value="gasto">Gasto</option>
            <option value="ingreso">Ingreso</option>
          </select>
          <button type="submit">{editandoCategoriaId ? "Guardar" : "Crear categoría"}</button>
        </form>
        <div className="lista-items">
          {categorias.map((c) => (
            <div className="fila-item" key={c.id}>
              <span>{c.nombre} ({c.tipo})</span>
              <div className="acciones">
                <button onClick={() => editarCategoria(c)}>Editar</button>
                <button className="btn-borrar" onClick={() => borrarCategoria(c.id)}>Borrar</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Clientes</h2>
        <form onSubmit={guardarCliente}>
          <input type="text" placeholder="Nombre" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} />
          <input type="email" placeholder="Correo" value={correoCliente} onChange={(e) => setCorreoCliente(e.target.value)} />
          <button type="submit">{editandoClienteId ? "Guardar" : "Crear cliente"}</button>
        </form>
        <div className="lista-items">
          {clientes.map((c) => (
            <div className="fila-item" key={c.id}>
              <span>{c.nombre} — {c.correo}</span>
              <div className="acciones">
                <button onClick={() => editarCliente(c)}>Editar</button>
                <button className="btn-borrar" onClick={() => borrarCliente(c.id)}>Borrar</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Inyecciones de capital</h2>
        <form onSubmit={guardarInyeccion}>
          <input type="number" placeholder="Monto" value={montoInyeccion} onChange={(e) => setMontoInyeccion(e.target.value)} />
          <input type="date" value={fechaInyeccion} onChange={(e) => setFechaInyeccion(e.target.value)} />
          <input type="text" placeholder="Nota" value={notaInyeccion} onChange={(e) => setNotaInyeccion(e.target.value)} />
          <button type="submit">{editandoInyeccionId ? "Guardar" : "Registrar inyección"}</button>
        </form>
        <div className="lista-items">
          {inyecciones.map((i) => (
            <div className="fila-item" key={i.id}>
              <span>{i.fecha} — {i.monto} ({i.nota})</span>
              <div className="acciones">
                <button onClick={() => editarInyeccion(i)}>Editar</button>
                <button className="btn-borrar" onClick={() => borrarInyeccion(i.id)}>Borrar</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Productos</h2>
        <form onSubmit={guardarProducto}>
          <input type="text" placeholder="Nombre" value={nombreProducto} onChange={(e) => setNombreProducto(e.target.value)} />
          <input type="number" placeholder="Precio" value={precioProducto} onChange={(e) => setPrecioProducto(e.target.value)} />
          <button type="submit">{editandoProductoId ? "Guardar" : "Crear producto"}</button>
        </form>
        <div className="lista-items">
          {productos.map((p) => (
            <div className="fila-item" key={p.id}>
              <span>{p.nombre} — {p.precio}</span>
              <div className="acciones">
                <button onClick={() => editarProducto(p)}>Editar</button>
                <button className="btn-borrar" onClick={() => borrarProducto(p.id)}>Borrar</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Configuracion