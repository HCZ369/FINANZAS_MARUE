import { useState, useEffect } from "react"
import { apiGet } from "../api/client"

function TarjetasResumen({ negocioId }) {
  const [totales, setTotales] = useState({ inyecciones: 0, ventas: 0, gastos: 0, saldo: 0 })

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
        <strong>{totales.saldo}</strong>
      </div>
    </div>
  )
}

export default TarjetasResumen