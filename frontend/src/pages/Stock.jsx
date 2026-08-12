import { useState, useEffect } from "react"
import { apiGet } from "../api/client"

function Stock({ negocioId }) {
  const [stock, setStock] = useState([])

  useEffect(() => {
    async function traerStock() {
      const datos = await apiGet(`/negocios/${negocioId}/stock/`)
      setStock(datos)
    }
    traerStock()
  }, [negocioId])

  function claseFila(cantidad) {
    if (cantidad <= 0) {
      return "stock-agotado"
    }
    if (cantidad <= 10) {
      return "stock-bajo"
    }
    return "stock-ok"
  }

  function etiquetaEstado(cantidad) {
    if (cantidad <= 0) {
      return "Agotado"
    }
    if (cantidad <= 10) {
      return "Bajo"
    }
    return "OK"
  }

  return (
    <div>
      <h1>Stock</h1>
      <table className="tabla">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Comprado</th>
            <th>Vendido</th>
            <th>Stock</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((item) => (
            <tr key={item.producto_id} className={claseFila(item.stock)}>
              <td>{item.producto_nombre}</td>
              <td>{item.comprado}</td>
              <td>{item.vendido}</td>
              <td>{item.stock}</td>
              <td>{etiquetaEstado(item.stock)}</td>
            </tr>
          ))}
          {stock.length === 0 && (
            <tr><td colSpan="5">No hay productos cargados</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default Stock