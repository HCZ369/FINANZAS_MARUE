import { Bar } from "react-chartjs-2"
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js"
import { useState, useEffect } from "react"
import { apiGet } from "../api/client"

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

function GraficoGastos({ negocioId }) {
  const [gastos, setGastos] = useState([])

  useEffect(() => {
    async function traerGastos() {
      const datos = await apiGet(`/negocios/${negocioId}/dashboard/gastos-por-categoria/`)
      setGastos(datos)
    }
    traerGastos()
  }, [negocioId])

  const datosGrafico = {
    labels: gastos.map((g) => g.categoria_nombre),
    datasets: [
      {
        label: "Gastos por categoría",
        data: gastos.map((g) => g.total),
        backgroundColor: "#6366f1",
      },
    ],
  }

  return (
  <div style={{ maxWidth: "600px", height: "300px" }}>
    <Bar data={datosGrafico} options={{ maintainAspectRatio: false }} />
  </div>
)
}

export default GraficoGastos