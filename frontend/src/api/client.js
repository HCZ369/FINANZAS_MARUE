export const API_BASE = "https://golf-jar-les-judicial.trycloudflare.com/api"

async function manejarRespuesta(respuesta) {
  if (!respuesta.ok) {
    let detalle = respuesta.statusText
    try {
      const cuerpo = await respuesta.json()
      if (cuerpo.error) {
        detalle = cuerpo.error
      }
    } catch (e) {
      // si no es JSON, usar statusText
    }
    throw new Error(detalle)
  }
  return await respuesta.json()
}

export async function apiGet(ruta) {
  const respuesta = await fetch(`${API_BASE}${ruta}`)
  return await manejarRespuesta(respuesta)
}

export async function apiPost(ruta, datos) {
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  })
  return await manejarRespuesta(respuesta)
}

export async function apiPut(ruta, datos) {
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  })
  return await manejarRespuesta(respuesta)
}

export async function apiDelete(ruta) {
  const respuesta = await fetch(`${API_BASE}${ruta}`, { method: "DELETE" })
  return await manejarRespuesta(respuesta)
}
