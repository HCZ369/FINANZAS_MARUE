import { useEffect, useState } from "react"
import { apiGet } from "../api/client"
import { formatearMonto } from "../utils"

function InversionLotes({ negocioId }) {
  const [lotes, setLotes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [abierto, setAbierto] = useState(null)

  useEffect(() => {
    let activo = true
    setCargando(true)
    setError(null)

    apiGet(`/negocios/${negocioId}/inversion-lotes/`)
      .then((data) => {
        if (activo) setLotes(Array.isArray(data) ? data : [])
      })
      .catch((e) => {
        if (activo) setError(e?.message || "No se pudo cargar la inversión.")
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [negocioId])

  if (cargando) {
    return <p className="inv-cargando">Cargando inversión...</p>
  }

  if (error) {
    return <p className="inv-error">{error}</p>
  }

  if (lotes.length === 0) {
    return <p className="inv-vacio">No hay lotes registrados.</p>
  }

  return (
    <div className="inv-lista">
      {lotes.map((lote) => {
        const estaAbierto = abierto === lote.lote_id
        return (
          <div key={lote.lote_id} className="inv-lote">
            <button
              type="button"
              className="inv-lote-header"
              onClick={() => setAbierto(estaAbierto ? null : lote.lote_id)}
            >
              <div className="inv-lote-titulo">
                <span className="inv-lote-nombre">
                  {lote.descripcion || `Lote ${lote.lote_id}`}
                </span>
                <span className="inv-lote-fecha">{lote.fecha}</span>
              </div>

              <div className="inv-lote-numeros">
                <span className="inv-lote-inversion">
                  {formatearMonto(lote.inversion_gs)}
                </span>
                <span className="inv-lote-detalle">
                  {lote.productos_distintos} productos · {lote.unidades} unidades
                </span>
              </div>
            </button>

            {estaAbierto && (
              <div className="inv-lote-tabla">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cant.</th>
                      <th>Costo USD</th>
                      <th>Costo Gs</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lote.productos.map((p, i) => (
                      <tr key={i}>
                        <td>{p.producto}</td>
                        <td>{p.cantidad}</td>
                        <td>{p.costo_usd != null ? `USD ${p.costo_usd}` : "-"}</td>
                        <td>{formatearMonto(p.costo_gs)}</td>
                        <td>{formatearMonto(p.subtotal_gs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default InversionLotes