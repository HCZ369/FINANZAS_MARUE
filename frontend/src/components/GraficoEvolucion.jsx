import { Line } from "react-chartjs-2"
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Tooltip } from "chart.js"
import { useState, useEffect } from "react"
import { apiGet } from "../api/client"

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip)

function GraficoEvolucion({ negocioId }) {
  const [datos, setDatos] = useState([])

  useEffect(() => {
    async function traerDatos() {
      const resultado = await apiGet(`/negocios/${negocioId}/dashboard/evolucion-mensual/`)
      setDatos(resultado)
    }
    traerDatos()
  }, [negocioId])

  const datosGrafico = {
    labels: datos.map((d) => `${d.mes}/${d.anio}`),
    datasets: [
      {
        label: "Gastos mensuales",
        data: datos.map((d) => d.total),
        borderColor: "#6366f1",
        backgroundColor: "#6366f180",
        tension: 0.3,
      },
    ],
  }

  return <Line data={datosGrafico} />
}

export default GraficoEvolucion