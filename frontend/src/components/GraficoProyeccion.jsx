import { useEffect, useMemo, useState } from "react"
import { Chart } from "react-chartjs-2"
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js"

import { apiGet } from "../api/client"

ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend
)

const FORMATEADOR_MONEDA = new Intl.NumberFormat("es-PY", {
  maximumFractionDigits: 0,
})

const MESES = [
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

function GraficoProyeccion({ negocioId }) {
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let componenteActivo = true

    async function cargarDatos() {
      if (!negocioId) {
        setDatos([])
        setCargando(false)
        return
      }

      try {
        setCargando(true)
        setError("")

        const respuesta = await apiGet(
          `/negocios/${negocioId}/dashboard/proyeccion-vs-realidad/`
        )

        if (!componenteActivo) return

        const datosNormalizados = Array.isArray(respuesta)
          ? respuesta
              .map(normalizarRegistro)
              .sort(ordenarCronologicamente)
          : []

        setDatos(datosNormalizados)
      } catch (errorPeticion) {
        if (!componenteActivo) return

        setDatos([])
        setError(
          errorPeticion?.message ||
            "No se pudo cargar la proyección de ventas."
        )
      } finally {
        if (componenteActivo) {
          setCargando(false)
        }
      }
    }

    cargarDatos()

    return () => {
      componenteActivo = false
    }
  }, [negocioId])

  const resumen = useMemo(() => {
    return datos.reduce(
      (resultado, registro) => {
        resultado.proyectado += registro.proyeccion
        resultado.real += registro.real
        resultado.capital += registro.capital

        return resultado
      },
      {
        proyectado: 0,
        real: 0,
        capital: 0,
      }
    )
  }, [datos])

  const cumplimiento = useMemo(() => {
    if (resumen.proyectado <= 0) return 0

    return (resumen.real / resumen.proyectado) * 100
  }, [resumen])

  const diferencia = resumen.real - resumen.proyectado

  const datosGrafico = useMemo(() => {
    return {
      labels: datos.map((registro) =>
        crearEtiquetaPeriodo(registro.mes, registro.anio)
      ),

      datasets: [
        {
          type: "bar",
          label: "Proyección",
          data: datos.map((registro) => registro.proyeccion),

          backgroundColor: "rgba(104, 97, 100, 0.5)",
          hoverBackgroundColor: "rgba(153, 145, 148, 0.75)",

          borderColor: "#686164",
          borderWidth: 1,
          borderRadius: 2,
          borderSkipped: false,
          barPercentage: 0.72,
          categoryPercentage: 0.68,
          maxBarThickness: 34,

          order: 2,
        },
        {
          type: "bar",
          label: "Venta real",
          data: datos.map((registro) => registro.real),

          backgroundColor: "rgba(116, 57, 75, 0.72)",
          hoverBackgroundColor: "#a65c71",

          borderColor: "#8d465c",
          borderWidth: 1,
          borderRadius: 2,
          borderSkipped: false,
          barPercentage: 0.72,
          categoryPercentage: 0.68,
          maxBarThickness: 34,

          order: 2,
        },
        {
          type: "line",
          label: "Capital operativo",
          data: datos.map((registro) => registro.capital),

          borderColor: "#b69261",
          backgroundColor: "#b69261",

          borderWidth: 2,
          tension: 0.3,
          fill: false,

          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 14,
          pointBorderWidth: 2,
          pointBorderColor: "#b69261",
          pointBackgroundColor: "#100f10",
          pointHoverBackgroundColor: "#100f10",

          order: 1,
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
          top: 5,
          right: 8,
          bottom: 0,
          left: 0,
        },
      },

      plugins: {
        legend: {
          position: "top",
          align: "end",

          labels: {
            color: "#999194",
            usePointStyle: true,
            pointStyle: "rect",
            boxWidth: 7,
            boxHeight: 7,
            padding: 16,

            font: {
              family: "Geist, Inter, sans-serif",
              size: 10,
              weight: "500",
            },
          },
        },

        tooltip: {
          displayColors: true,
          boxWidth: 7,
          boxHeight: 7,
          boxPadding: 4,

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
              const etiqueta = contexto.dataset.label || "Valor"
              const valor = convertirNumero(contexto.parsed.y)

              return `${etiqueta}: ${formatearMonto(valor)}`
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
            maxTicksLimit: 12,

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
            maxTicksLimit: 6,

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
        <span>Cargando proyección...</span>
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
        <span>No hay información de proyección disponible.</span>
      </EstadoGrafico>
    )
  }

  return (
    <div className="grafico-proyeccion">
      <div className="proyeccion-resumen">
        <MetricaResumen
          etiqueta="Proyectado"
          valor={formatearMonto(resumen.proyectado)}
        />

        <MetricaResumen
          etiqueta="Venta real"
          valor={formatearMonto(resumen.real)}
          destacado
        />

        <MetricaResumen
          etiqueta="Diferencia"
          valor={`${diferencia >= 0 ? "+" : ""}${formatearMonto(
            diferencia
          )}`}
          estado={diferencia >= 0 ? "positivo" : "negativo"}
        />

        <MetricaResumen
          etiqueta="Cumplimiento"
          valor={formatearPorcentaje(cumplimiento)}
          estado={cumplimiento >= 100 ? "positivo" : ""}
        />
      </div>

      <div className="grafico-proyeccion-canvas">
        <Chart
          type="bar"
          data={datosGrafico}
          options={opcionesGrafico}
          aria-label="Gráfico de proyección de ventas, ventas reales y capital operativo"
          role="img"
        />
      </div>
    </div>
  )
}

function MetricaResumen({
  etiqueta,
  valor,
  estado = "",
  destacado = false,
}) {
  const clases = [
    "proyeccion-metrica",
    estado ? `proyeccion-metrica-${estado}` : "",
    destacado ? "proyeccion-metrica-destacada" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={clases}>
      <span>{etiqueta}</span>
      <strong>{valor}</strong>
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

function normalizarRegistro(registro) {
  return {
    mes: registro?.mes,
    anio: convertirNumero(registro?.anio),
    proyeccion: convertirNumero(registro?.proyeccion_venta),
    real: convertirNumero(registro?.venta_real),
    capital: convertirNumero(registro?.capital_operativo),
  }
}

function ordenarCronologicamente(a, b) {
  const periodoA =
    a.anio * 12 + obtenerNumeroMes(a.mes)

  const periodoB =
    b.anio * 12 + obtenerNumeroMes(b.mes)

  return periodoA - periodoB
}

function crearEtiquetaPeriodo(mes, anio) {
  const numeroMes = obtenerNumeroMes(mes)
  const nombreMes = MESES[numeroMes - 1] || String(mes || "")

  return anio ? `${nombreMes} ${anio}` : nombreMes
}

function obtenerNumeroMes(mes) {
  const numero = Number(mes)

  if (Number.isInteger(numero) && numero >= 1 && numero <= 12) {
    return numero
  }

  const texto = normalizarTexto(mes)

  const indice = MESES.findIndex(
    (nombreMes) =>
      normalizarTexto(nombreMes) === texto.slice(0, 3)
  )

  return indice >= 0 ? indice + 1 : 0
}

function normalizarTexto(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function convertirNumero(valor) {
  const numero = Number(valor)

  return Number.isFinite(numero) ? numero : 0
}

function formatearMonto(valor) {
  return FORMATEADOR_MONEDA.format(convertirNumero(valor))
}

function formatearPorcentaje(valor) {
  return new Intl.NumberFormat("es-PY", {
    maximumFractionDigits: 1,
  }).format(convertirNumero(valor)) + "%"
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

export default GraficoProyeccion