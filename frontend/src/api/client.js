const API_BASE = "http://localhost:8000/api"
const MODO_MOCK = true  // cambiar a false cuando el backend esté disponible

const datosSimulados = {
  "/negocios/": [
    { id: 1, nombre: "Marue Dark", fecha_creacion: "2026-01-15" },
    { id: 2, nombre: "Otro Negocio", fecha_creacion: "2026-03-01" },
  ],
  "/negocios/1/dashboard/gastos-por-categoria/": [
    { categoria_id: 1, categoria_nombre: "Publicidad", total: 45000 },
    { categoria_id: 2, categoria_nombre: "Insumos", total: 78000 },
    { categoria_id: 3, categoria_nombre: "Logística", total: 23000 },
  ],
  "/negocios/2/dashboard/gastos-por-categoria/": [
    { categoria_id: 4, categoria_nombre: "Alquiler", total: 120000 },
    { categoria_id: 5, categoria_nombre: "Sueldos", total: 200000 },
  ],
  "/negocios/1/gastos/": [
    { id: 1, fecha: "2026-07-01", categoria_id: 1, monto: 25000, descripcion: "Facebook Ads" },
    { id: 2, fecha: "2026-07-15", categoria_id: 2, monto: 38000, descripcion: "Materia prima" },
  ],
  "/negocios/1/categorias/": [
    { id: 1, nombre: "Publicidad", tipo: "gasto" },
    { id: 2, nombre: "Insumos", tipo: "gasto" },
    { id: 3, nombre: "Logística", tipo: "gasto" },
  ],
  "/negocios/1/ventas/": [
    { id: 1, fecha: "2026-07-10", cliente_id: 1, monto_total: 150000 },
  ],
  "/negocios/1/clientes/": [
    { id: 1, nombre: "Ana García", correo: "ana@mail.com" },
    { id: 2, nombre: "Pedro López", correo: "pedro@mail.com" },
  ],
  "/negocios/1/productos/": [
    { id: 1, nombre: "Collar gótico", precio: 45000 },
    { id: 2, nombre: "Pulsera cadena", precio: 30000 },
  ],
  "/negocios/1/dashboard/evolucion-mensual/": [
  { anio: 2026, mes: 1, total: 45000 },
  { anio: 2026, mes: 2, total: 62000 },
  { anio: 2026, mes: 3, total: 38000 },
  { anio: 2026, mes: 4, total: 71000 },
  { anio: 2026, mes: 5, total: 55000 },
  { anio: 2026, mes: 6, total: 48000 },
  { anio: 2026, mes: 7, total: 83000 },
],
}

export async function apiGet(ruta) {
  if (MODO_MOCK) {
    return datosSimulados[ruta] || []
  }

  const respuesta = await fetch(`${API_BASE}${ruta}`)
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status}: ${respuesta.statusText}`)
  }
  return await respuesta.json()
}

export async function apiPost(ruta, datos) {
  if (MODO_MOCK) {
    return { mensaje: "Simulado (modo mock activo)" }
  }

  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  })
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status}: ${respuesta.statusText}`)
  }
  return await respuesta.json()
}