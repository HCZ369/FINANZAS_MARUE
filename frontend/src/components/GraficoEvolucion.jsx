import { useEffect, useMemo, useState } from "react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js"

import { apiGet } from "../api/client"

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
)

const FORMATEADOR_MONEDA = new Intl.NumberFormat("es-PY", {
  maximumFractionDigits: 0,
})

const NOMBRES_MESES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
]

function GraficoEvolucion({ negocioId }) {
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const controlador = new AbortController()
    let componenteActivo = true

    async function cargarEvolucion() {
      if (!negocioId) {
        setDatos([])
        setCargando(false)
        return
      }

      try {
        setCargando(true)
        setError("")

        const resultado = await apiGet(
          `/negocios/${negocioId}/dashboard/evolucion-mensual/`,
          {
            signal: controlador.signal,
          }
        )

        if (!componenteActivo) return

        setDatos(
          Array.isArray(resultado)
            ? ordenarDatosCronologicamente(resultado)
            : []
        )
      } catch (errorPeticion) {
        if (
          !componenteActivo ||
          errorPeticion?.name === "AbortError"
        ) {
          return
        }

        setDatos([])
        setError(
          errorPeticion?.message ||
            "No se pudo cargar la evolución mensual."
        )
      } finally {
        if (componenteActivo) {
          setCargando(false)
        }
      }
    }

    cargarEvolucion()

    return () => {
      componenteActivo = false
      controlador.abort()
    }
  }, [negocioId])

  const datosGrafico = useMemo(() => {
    return {
      labels: datos.map((registro) =>
        crearEtiquetaMes(registro.mes, registro.anio)
      ),

      datasets: [
        {
          label: "Gastos",
          data: datos.map((registro) =>
            convertirNumero(registro.total)
          ),

          borderColor: "#c18496",
          backgroundColor: crearDegradado,

          borderWidth: 2,
          tension: 0.32,
          fill: true,

          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 14,
          pointBorderWidth: 2,
          pointBorderColor: "#c18496",
          pointBackgroundColor: "#100f10",
          pointHoverBorderColor: "#d6a2b1",
          pointHoverBackgroundColor: "#100f10",
        },
      ],
    }
  }, [datos])

  const opcionesGrafico = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        mode: "index",
        intersect: false,
      },

      animation: {
        duration: 450,
      },

      layout: {
        padding: {
          top: 4,
          right: 8,
          bottom: 0,
          left: 0,
        },
      },

      plugins: {
        legend: {
          display: false,
        },

        tooltip: {
          displayColors: false,
          backgroundColor: "#100f10",
          borderColor: "#493a40",
          borderWidth: 1,
          titleColor: "#f2eef0",
          bodyColor: "#c8c1c4",
          padding: 10,
          cornerRadius: 2,
          caretSize: 5,

          titleFont: {
            family: "Geist, Inter, sans-serif",
            size: 12,
            weight: "600",
          },

          bodyFont: {
            family: "Geist, Inter, sans-serif",
            size: 12,
          },

          callbacks: {
            title(contexto) {
              return contexto[0]?.label || ""
            },

            label(contexto) {
              return `Gastos: ${formatearMonto(contexto.parsed.y)}`
            },
          },
        },
      },

      scales: {
        x: {
          border: {
            display: false,
          },

          grid: {
            display: false,
          },

          ticks: {
            color: "#686164",
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,

            font: {
              family: "Geist, Inter, sans-serif",
              size: 10,
              weight: "500",
            },
          },
        },

        y: {
          beginAtZero: true,

          border: {
            display: false,
          },

          grid: {
            color: "rgba(255, 255, 255, 0.055)",
            drawTicks: false,
          },

          ticks: {
            color: "#686164",
            padding: 8,
            maxTicksLimit: 5,

            font: {
              family: "Geist, Inter, sans-serif",
              size: 10,
            },

            callback(valor) {
              return abreviarMonto(valor)
            },
          },
        },
      },
    }
  }, [])

  if (cargando) {
    return (
      <EstadoGrafico>
        <div className="grafico-cargando-linea" />
        <span>Cargando evolución...</span>
      </EstadoGrafico>
    )
  }

  if (error) {
    return (
      <EstadoGrafico tipo="error">
        <span>{error}</span>
      </EstadoGrafico>
    )
  }

  if (datos.length === 0) {
    return (
      <EstadoGrafico>
        <span>No hay información mensual disponible.</span>
      </EstadoGrafico>
    )
  }

  return (
    <div className="grafico-evolucion">
      <Line
        data={datosGrafico}
        options={opcionesGrafico}
        aria-label="Gráfico de evolución mensual de gastos"
        role="img"
      />
    </div>
  )
}

function EstadoGrafico({ children, tipo = "" }) {
  return (
    <div
      className={`grafico-estado ${
        tipo ? `grafico-estado-${tipo}` : ""
      }`}
    >
      {children}
    </div>
  )
}

function ordenarDatosCronologicamente(datos) {
  return [...datos].sort((a, b) => {
    const fechaA =
      convertirNumero(a.anio) * 12 + convertirNumero(a.mes)

    const fechaB =
      convertirNumero(b.anio) * 12 + convertirNumero(b.mes)

    return fechaA - fechaB
  })
}

function crearEtiquetaMes(mes, anio) {
  const numeroMes = convertirNumero(mes)
  const nombreMes = NOMBRES_MESES[numeroMes - 1] || String(mes)

  return `${nombreMes} ${anio}`
}

function convertirNumero(valor) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : 0
}

function formatearMonto(valor) {
  return FORMATEADOR_MONEDA.format(convertirNumero(valor))
}

function abreviarMonto(valor) {
  const numero = convertirNumero(valor)
  const absoluto = Math.abs(numero)

  if (absoluto >= 1_000_000_000) {
    return `${formatearDecimal(numero / 1_000_000_000)} mil M`
  }

  if (absoluto >= 1_000_000) {
    return `${formatearDecimal(numero / 1_000_000)} M`
  }

  if (absoluto >= 1_000) {
    return `${formatearDecimal(numero / 1_000)} mil`
  }

  return FORMATEADOR_MONEDA.format(numero)
}

function formatearDecimal(valor) {
  return new Intl.NumberFormat("es-PY", {
    maximumFractionDigits: 1,
  }).format(valor)
}

function crearDegradado(contexto) {
  const chart = contexto.chart
  const { ctx, chartArea } = chart

  if (!chartArea) {
    return "rgba(116, 57, 75, 0.12)"
  }

  const degradado = ctx.createLinearGradient(
    0,
    chartArea.top,
    0,
    chartArea.bottom
  )

  degradado.addColorStop(0, "rgba(193, 132, 150, 0.22)")
  degradado.addColorStop(0.55, "rgba(116, 57, 75, 0.08)")
  degradado.addColorStop(1, "rgba(116, 57, 75, 0)")

  return degradado
}

export default GraficoEvolucion