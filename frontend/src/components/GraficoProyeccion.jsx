import { useState, useEffect, useRef } from "react"
import { apiGet } from "../api/client"
import Chart from "chart.js/auto"

function GraficoProyeccion({ negocioId }) {
  const [datos, setDatos] = useState([])
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    async function traerDatos() {
      const respuesta = await apiGet(`/negocios/${negocioId}/dashboard/proyeccion-vs-realidad/`)
      setDatos(respuesta)
    }
    traerDatos()
  }, [negocioId])

  useEffect(() => {
    if (canvasRef.current === null) {
      return
    }

    if (chartRef.current !== null) {
      chartRef.current.destroy()
    }

    const meses = []
    const proyeccion = []
    const real = []
    const capital = []

    for (let indice = 0; indice < datos.length; indice++) {
      const fila = datos[indice]
      meses.push(fila.mes)
      proyeccion.push(fila.proyeccion_venta)
      real.push(fila.venta_real)
      capital.push(fila.capital_operativo)
    }

    chartRef.current = new Chart(canvasRef.current, {
      data: {
        labels: meses,
        datasets: [
          {
            type: "bar",
            label: "Proyección",
            data: proyeccion,
            backgroundColor: "#3b82f6",
          },
          {
            type: "bar",
            label: "Venta real",
            data: real,
            backgroundColor: "#34d399",
          },
          {
            type: "line",
            label: "Capital operativo",
            data: capital,
            borderColor: "#f59e0b",
            backgroundColor: "#f59e0b",
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: "#e5e7eb" } },
        },
        scales: {
          x: { ticks: { color: "#9ca3af" }, grid: { color: "#2d3139" } },
          y: { ticks: { color: "#9ca3af" }, grid: { color: "#2d3139" } },
        },
      },
    })

    return function limpiar() {
      if (chartRef.current !== null) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [datos])

  return (
    <div style={{ height: "360px" }}>
      <canvas ref={canvasRef}></canvas>
    </div>
  )
}

export default GraficoProyeccion