const FORMATEADOR_MONTO = new Intl.NumberFormat("es-PY", {
  maximumFractionDigits: 0,
})

const FORMATEADOR_DECIMAL = new Intl.NumberFormat("es-PY", {
  maximumFractionDigits: 2,
})

export function normalizarTexto(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export function convertirNumero(valor, predeterminado = 0) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : predeterminado
}

export function convertirFechaLocal(fecha) {
  if (!fecha) return null

  const [anio, mes, dia] = String(fecha)
    .split("T")[0]
    .split("-")
    .map(Number)

  if (!anio || !mes || !dia) return null

  return new Date(anio, mes - 1, dia)
}

export function obtenerFechaActual() {
  const ahora = new Date()
  const desplazamiento = ahora.getTimezoneOffset() * 60_000

  return new Date(ahora.getTime() - desplazamiento)
    .toISOString()
    .split("T")[0]
}

export function formatearFecha(fecha, textoVacio = "Sin fecha") {
  if (!fecha) return textoVacio

  const fechaLocal = convertirFechaLocal(fecha)

  if (!fechaLocal) return String(fecha)

  return fechaLocal.toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatearMonto(valor) {
  return FORMATEADOR_MONTO.format(convertirNumero(valor))
}

export function formatearDecimal(valor) {
  return FORMATEADOR_DECIMAL.format(convertirNumero(valor))
}

export function formatearCantidad(valor) {
  return FORMATEADOR_MONTO.format(convertirNumero(valor))
}

export function formatearMontoDecimal(valor) {
  return FORMATEADOR_DECIMAL.format(convertirNumero(valor))
}

export function obtenerIniciales(nombre = "") {
  const palabras = String(nombre).trim().split(/\s+/).filter(Boolean)

  if (palabras.length === 0) return "?"

  if (palabras.length === 1) {
    return palabras[0].slice(0, 2).toUpperCase()
  }

  return `${palabras[0][0]}${palabras[1][0]}`.toUpperCase()
}

export function valorParaInput(valor) {
  return valor === null || valor === undefined ? "" : String(valor)
}
