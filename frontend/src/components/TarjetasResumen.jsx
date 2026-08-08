import { useState, useEffect } from "react"
import { apiGet } from "../api/client"

function TarjetasResumen({ negocioId }) {
  const [totales, setTotales] = useState({
    inyecciones: 0, ventas: 0, gastos: 0, saldo: 0,
    cantidad_productos: 0, cantidad_clientes: 0, cantidad_ventas: 0,
  })

  useEffect(() => {
    async function traerTotales() {
      const datos = await apiGet(`/negocios/${negocioId}/dashboard/totales/`)
      setTotales(datos)
    }
    traerTotales()
  }, [negocioId])

  return (
    <div className="tarjetas-resumen">
      <div className="tarjeta">
        <span>Capital inyectado</span>
        <strong>{totales.inyecciones}</strong>
      </div>
      <div className="tarjeta">
        <span>Ventas</span>
        <strong>{totales.ventas}</strong>
      </div>
      <div className="tarjeta">
        <span>Gastos</span>
        <strong>{totales.gastos}</strong>
      </div>
      <div className="tarjeta">
        <span>Saldo</span>
        <strong className={totales.saldo >= 0 ? "positivo" : "negativo"}>{totales.saldo}</strong>
      </div>
      <div className="tarjeta">
        <span>Productos</span>
        <strong>{totales.cantidad_productos}</strong>
      </div>
      <div className="tarjeta">
        <span>Clientes</span>
        <strong>{totales.cantidad_clientes}</strong>
      </div>
      <div className="tarjeta">
        <span>Ventas registradas</span>
        <strong>{totales.cantidad_ventas}</strong>
      </div>
    </div>
  )
}

export default TarjetasResumen