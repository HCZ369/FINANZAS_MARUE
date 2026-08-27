import { useEffect, useMemo, useState } from "react"
import { Bar } from "react-chartjs-2"
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
} from "chart.js"

import { apiGet } from "../api/client"

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip
)

const FORMATEADOR_MONEDA = new Intl.NumberFormat("es-PY", {
  maximumFractionDigits: 0,
})

function GraficoGastos({ negocioId }) {
  const [gastos, setGastos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let componenteActivo = true

    async function cargarGastos() {
      if (!negocioId) {
        setGastos([])
        setCargando(false)
        return
      }

      try {
        setCargando(true)
        setError("")

        const resultado = await apiGet(
          `/negocios/${negocioId}/dashboard/gastos-por-categoria/`
        )

        if (!componenteActivo) return

        const lista = Array.isArray(resultado)
          ? resultado
              .map((gasto) => ({
                categoria:
                  gasto.categoria_nombre?.trim() ||
                  "Sin categoría",
                total: convertirNumero(gasto.total),
              }))
              .filter((gasto) => gasto.total > 0)
              .sort((a, b) => b.total - a.total)
          : []

        setGastos(lista)
      } catch (errorPeticion) {
        if (!componenteActivo) return

        setGastos([])
        setError(
          errorPeticion?.message ||
            "No se pudieron cargar los gastos por categoría."
        )
      } finally {
        if (componenteActivo) {
          setCargando(false)
        }
      }
    }

    cargarGastos()

    return () => {
      componenteActivo = false
    }
  }, [negocioId])

  const totalGeneral = useMemo(() => {
    return gastos.reduce(
      (total, gasto) => total + gasto.total,
      0
    )
  }, [gastos])

  const datosGrafico = useMemo(() => {
    return {
      labels: gastos.map((gasto) => gasto.categoria),

      datasets: [
        {
          label: "Gastos",
          data: gastos.map((gasto) => gasto.total),

          backgroundColor: gastos.map((_, indice) =>
            indice === 0 ? "#a65c71" : "#633746"
          ),

          hoverBackgroundColor: "#c18496",
          borderColor: "transparent",
          borderWidth: 0,
          borderRadius: 2,
          borderSkipped: false,
          barPercentage: 0.7,
          categoryPercentage: 0.72,
          maxBarThickness: 28,
        },
      ],
    }
  }, [gastos])

  const opcionesGrafico = useMemo(() => {
    return {
      indexAxis: "y",

      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        mode: "nearest",
        axis: "y",
        intersect: false,
      },

      animation: {
        duration: 400,
      },

      layout: {
        padding: {
          top: 2,
          right: 10,
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
            label(contexto) {
              const valor = convertirNumero(contexto.parsed.x)

              return [
                `Total: ${formatearMonto(valor)}`,
                `${calcularPorcentaje(valor, totalGeneral)} del gasto`,
              ]
            },
          },
        },
      },

      scales: {
        x: {
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

        y: {
          border: {
            display: false,
          },

          grid: {
            display: false,
          },

          ticks: {
            color: "#999194",
            padding: 7,
            autoSkip: false,

            font: {
              family: "Geist, Inter, sans-serif",
              size: 11,
              weight: "500",
            },

            callback(valor) {
              const etiqueta = this.getLabelForValue(valor)

              return acortarTexto(etiqueta, 22)
            },
          },
        },
      },
    }
  }, [totalGeneral])

  if (cargando) {
    return (
      <EstadoGrafico>
        <div className="grafico-cargando-linea" />
        <span>Cargando categorías...</span>
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

  if (gastos.length === 0) {
    return (
      <EstadoGrafico>
        <span>No hay gastos registrados por categoría.</span>
      </EstadoGrafico>
    )
  }

  return (
    <div className="grafico-gastos">
      <div className="grafico-gastos-resumen">
        <span>Total registrado</span>
        <strong>{formatearMonto(totalGeneral)}</strong>
      </div>

      <div className="grafico-gastos-canvas">
        <Bar
          data={datosGrafico}
          options={opcionesGrafico}
          aria-label="Gráfico de gastos por categoría"
          role="img"
        />
      </div>
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

function convertirNumero(valor) {
  const numero = Number(valor)

  return Number.isFinite(numero) ? numero : 0
}

function formatearMonto(valor) {
  return FORMATEADOR_MONEDA.format(convertirNumero(valor))
}

function calcularPorcentaje(valor, total) {
  if (total <= 0) return "0%"

  return new Intl.NumberFormat("es-PY", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(valor / total)
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

  return formatearMonto(numero)
}

function formatearDecimal(valor) {
  return new Intl.NumberFormat("es-PY", {
    maximumFractionDigits: 1,
  }).format(valor)
}

function acortarTexto(texto, longitudMaxima) {
  const valor = String(texto || "")

  if (valor.length <= longitudMaxima) {
    return valor
  }

  return `${valor.slice(0, longitudMaxima - 1)}…`
}

export default GraficoGastos