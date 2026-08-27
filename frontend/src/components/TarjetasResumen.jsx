import { useEffect, useMemo, useState } from "react"
import { apiGet } from "../api/client"

const VALORES_INICIALES = {
  inyecciones: 0,
  ventas: 0,
  gastos: 0,
  saldo: 0,
  cantidad_productos: 0,
  cantidad_clientes: 0,
  cantidad_ventas: 0,
}

const FORMATEADOR_MONTO = new Intl.NumberFormat("es-PY", {
  maximumFractionDigits: 0,
})

const FORMATEADOR_CANTIDAD = new Intl.NumberFormat("es-PY", {
  maximumFractionDigits: 0,
})

function TarjetasResumen({ negocioId }) {
  const [totales, setTotales] = useState(VALORES_INICIALES)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let componenteActivo = true

    async function cargarTotales() {
      if (!negocioId) {
        setTotales(VALORES_INICIALES)
        setCargando(false)
        return
      }

      try {
        setCargando(true)
        setError("")

        const respuesta = await apiGet(
          `/negocios/${negocioId}/dashboard/totales/`
        )

        if (!componenteActivo) return

        setTotales(normalizarTotales(respuesta))
      } catch (errorPeticion) {
        if (!componenteActivo) return

        setTotales(VALORES_INICIALES)
        setError(
          errorPeticion?.message ||
            "No se pudo cargar el resumen financiero."
        )
      } finally {
        if (componenteActivo) {
          setCargando(false)
        }
      }
    }

    cargarTotales()

    return () => {
      componenteActivo = false
    }
  }, [negocioId])

  const metricas = useMemo(() => {
    const resultadoOperativo = totales.ventas - totales.gastos

    const promedioVenta =
      totales.cantidad_ventas > 0
        ? totales.ventas / totales.cantidad_ventas
        : 0

    return [
      {
        id: "saldo",
        etiqueta: "Saldo disponible",
        valor: formatearMonto(totales.saldo),
        detalle:
          totales.saldo >= 0
            ? "Balance positivo"
            : "Balance negativo",
        estado: totales.saldo >= 0 ? "positivo" : "negativo",
        destacada: true,
      },
      {
        id: "ventas",
        etiqueta: "Ventas",
        valor: formatearMonto(totales.ventas),
        detalle: `${formatearCantidad(
          totales.cantidad_ventas
        )} ventas registradas`,
        estado: "acento",
      },
      {
        id: "gastos",
        etiqueta: "Gastos",
        valor: formatearMonto(totales.gastos),
        detalle: "Total acumulado",
        estado: totales.gastos > 0 ? "advertencia" : "",
      },
      {
        id: "resultado",
        etiqueta: "Resultado operativo",
        valor: formatearMonto(resultadoOperativo),
        detalle: "Ventas menos gastos",
        estado:
          resultadoOperativo >= 0 ? "positivo" : "negativo",
      },
      {
        id: "capital",
        etiqueta: "Capital inyectado",
        valor: formatearMonto(totales.inyecciones),
        detalle: "Aporte acumulado",
      },
      {
        id: "promedio",
        etiqueta: "Promedio por venta",
        valor: formatearMonto(promedioVenta),
        detalle: "Ticket promedio",
      },
      {
        id: "productos",
        etiqueta: "Productos",
        valor: formatearCantidad(totales.cantidad_productos),
        detalle: "En el catálogo",
        formato: "cantidad",
      },
      {
        id: "clientes",
        etiqueta: "Clientes",
        valor: formatearCantidad(totales.cantidad_clientes),
        detalle: "Registrados",
        formato: "cantidad",
      },
    ]
  }, [totales])

  if (cargando) {
    return (
      <div
        className="tarjetas-resumen tarjetas-resumen-cargando"
        aria-label="Cargando resumen financiero"
      >
        {Array.from({ length: 8 }, (_, indice) => (
          <TarjetaSkeleton key={indice} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="resumen-error" role="alert">
        <span>{error}</span>
      </div>
    )
  }

  return (
    <div
      className="tarjetas-resumen"
      aria-label="Resumen financiero"
    >
      {metricas.map((metrica) => (
        <TarjetaMetrica key={metrica.id} {...metrica} />
      ))}
    </div>
  )
}

function TarjetaMetrica({
  etiqueta,
  valor,
  detalle,
  estado = "",
  destacada = false,
  formato = "monto",
}) {
  const clases = [
    "tarjeta",
    estado ? `tarjeta-${estado}` : "",
    destacada ? "tarjeta-destacada" : "",
    formato === "cantidad" ? "tarjeta-cantidad" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <article className={clases}>
      <div className="tarjeta-cabecera">
        <span className="tarjeta-etiqueta">{etiqueta}</span>

        {estado && (
          <span
            className="tarjeta-indicador"
            aria-hidden="true"
          />
        )}
      </div>

      <strong className="tarjeta-valor">{valor}</strong>

      <span className="tarjeta-detalle">{detalle}</span>
    </article>
  )
}

function TarjetaSkeleton() {
  return (
    <div className="tarjeta tarjeta-skeleton" aria-hidden="true">
      <span className="skeleton-linea skeleton-etiqueta" />
      <span className="skeleton-linea skeleton-valor" />
      <span className="skeleton-linea skeleton-detalle" />
    </div>
  )
}

function normalizarTotales(datos) {
  return {
    inyecciones: convertirNumero(datos?.inyecciones),
    ventas: convertirNumero(datos?.ventas),
    gastos: convertirNumero(datos?.gastos),
    saldo: convertirNumero(datos?.saldo),

    cantidad_productos: Math.max(
      0,
      convertirNumero(datos?.cantidad_productos)
    ),

    cantidad_clientes: Math.max(
      0,
      convertirNumero(datos?.cantidad_clientes)
    ),

    cantidad_ventas: Math.max(
      0,
      convertirNumero(datos?.cantidad_ventas)
    ),
  }
}

function convertirNumero(valor) {
  const numero = Number(valor)

  return Number.isFinite(numero) ? numero : 0
}

function formatearMonto(valor) {
  return FORMATEADOR_MONTO.format(convertirNumero(valor))
}

function formatearCantidad(valor) {
  return FORMATEADOR_CANTIDAD.format(convertirNumero(valor))
}

export default TarjetasResumen