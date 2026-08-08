import { useState, useEffect } from "react"
import { apiGet } from "../api/client"

function TablaTopProductos({ negocioId }) {
  const [productos, setProductos] = useState([])

  useEffect(() => {
    async function traerDatos() {
      const datos = await apiGet(`/negocios/${negocioId}/dashboard/productos-mas-vendidos/`)
      setProductos(datos)
    }
    traerDatos()
  }, [negocioId])

  return (
    <table className="tabla">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Unidades vendidas</th>
          <th>Total vendido</th>
        </tr>
      </thead>
      <tbody>
        {productos.map((p) => (
          <tr key={p.producto_id}>
            <td>{p.producto_nombre}</td>
            <td>{p.unidades_vendidas}</td>
            <td>{p.total_vendido}</td>
          </tr>
        ))}
        {productos.length === 0 && (
          <tr><td colSpan="3">Todavía no hay ventas registradas</td></tr>
        )}
      </tbody>
    </table>
  )
}

export default TablaTopProductos