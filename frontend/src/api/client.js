const API_BASE = "https://finanzas-marue-api.onrender.com/api"
const MODO_MOCK = false

export async function apiGet(ruta) {
  const respuesta = await fetch(`${API_BASE}${ruta}`)
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status}: ${respuesta.statusText}`)
  }
  return await respuesta.json()
}

export async function apiPost(ruta, datos) {
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

export async function apiPut(ruta, datos) {
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  })
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status}: ${respuesta.statusText}`)
  }
  return await respuesta.json()
}

export async function apiDelete(ruta) {
  const respuesta = await fetch(`${API_BASE}${ruta}`, { method: "DELETE" })
  if (!respuesta.ok) {
    throw new Error(`Error ${respuesta.status}: ${respuesta.statusText}`)
  }
  return await respuesta.json()
}