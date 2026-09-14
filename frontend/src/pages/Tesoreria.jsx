import { useCallback, useEffect, useMemo, useState } from "react"
import { apiGet, apiPost } from "../api/client"
import { convertirNumero, formatearMonto } from "../utils"

const TIPO_MOV = {
  ENTRADA: "entrada",
  SALIDA: "salida",
  TRANSFERENCIA: "transferencia",
}

const FORM_INICIAL = {
  cuentaId: "",
  tipo: TIPO_MOV.ENTRADA,
  monto: "",
  fecha: new Date().toISOString().split("T")[0],
  concepto: "",
  cuentaDestinoId: "",
}

function Tesoreria({ negocioId }) {
  const [cuentas, setCuentas] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState(FORM_INICIAL)
  const [cuentaFiltro, setCuentaFiltro] = useState("")

  const cargar = useCallback(async () => {
    if (!negocioId) return
    try {
      setCargando(true)
      const [cuentasData, movsData] = await Promise.all([
        apiGet(`/negocios/${negocioId}/cuentas/`),
        apiGet(`/negocios/${negocioId}/movimientos/`),
      ])
      setCuentas(Array.isArray(cuentasData) ? cuentasData : [])
      setMovimientos(Array.isArray(movsData) ? movsData : [])
    } catch (e) {
      mostrarMensaje(e?.message || "No se pudo cargar la tesorería.", "error")
    } finally {
      setCargando(false)
    }
  }, [negocioId])

  useEffect(() => {
    cargar()
  }, [cargar])

  function mostrarMensaje(texto, tipo = "exito") {
    setMensaje({ texto, tipo })
    if (tipo !== "error") {
      setTimeout(() => setMensaje(null), 4000)
    }
  }

  const saldoTotal = useMemo(() => {
    return cuentas.reduce((acc, c) => acc + convertirNumero(c.saldo_actual), 0)
  }, [cuentas])

  const movimientosFiltrados = useMemo(() => {
    if (!cuentaFiltro) return movimientos
    return movimientos.filter(
      (m) =>
        String(m.cuenta_id) === String(cuentaFiltro) ||
        String(m.cuenta_destino_id) === String(cuentaFiltro)
    )
  }, [movimientos, cuentaFiltro])

  function abrirModal() {
    setForm({ ...FORM_INICIAL, cuentaId: cuentas[0]?.id || "" })
    setModalAbierto(true)
  }

  function cerrarModal() {
    if (guardando) return
    setModalAbierto(false)
  }

  function cambiarForm(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  async function guardarMovimiento(e) {
    e.preventDefault()

    if (!form.cuentaId) {
      mostrarMensaje("Elegí una cuenta.", "error")
      return
    }
    if (convertirNumero(form.monto) <= 0) {
      mostrarMensaje("El monto debe ser mayor que cero.", "error")
      return
    }
    if (!form.concepto.trim()) {
      mostrarMensaje("Ingresá un concepto.", "error")
      return
    }
    if (form.tipo === TIPO_MOV.TRANSFERENCIA && !form.cuentaDestinoId) {
      mostrarMensaje("Para transferencia elegí la cuenta destino.", "error")
      return
    }
    if (
      form.tipo === TIPO_MOV.TRANSFERENCIA &&
      String(form.cuentaId) === String(form.cuentaDestinoId)
    ) {
      mostrarMensaje("La cuenta origen y destino no pueden ser la misma.", "error")
      return
    }

    try {
      setGuardando(true)
      await apiPost(`/negocios/${negocioId}/movimientos/`, {
        cuenta_id: Number(form.cuentaId),
        tipo: form.tipo,
        monto: convertirNumero(form.monto),
        fecha: form.fecha,
        concepto: form.concepto.trim(),
        cuenta_destino_id:
          form.tipo === TIPO_MOV.TRANSFERENCIA
            ? Number(form.cuentaDestinoId)
            : null,
      })

      mostrarMensaje("Movimiento registrado.")
      setModalAbierto(false)
      await cargar()
    } catch (e) {
      mostrarMensaje(e?.message || "No se pudo registrar el movimiento.", "error")
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <main className="pagina-tesoreria">
        <div className="tes-header">
          <h1>Tesorería</h1>
        </div>
        <p style={{ color: "var(--texto-tenue)" }}>Cargando...</p>
      </main>
    )
  }

  return (
    <main className="pagina-tesoreria">
      <header className="tes-header">
        <div>
          <h1>Tesorería</h1>
          <p className="tes-subtitulo">Cuentas, saldos y movimientos.</p>
        </div>
        <button className="btn-principal" onClick={abrirModal}>
          Nuevo movimiento
        </button>
      </header>

      {mensaje && (
        <div className={mensaje.tipo === "error" ? "msg msg-error" : "msg msg-exito"}>
          <span>{mensaje.texto}</span>
          <button className="btn-cerrar-msg" onClick={() => setMensaje(null)}>
            ×
          </button>
        </div>
      )}

      <section className="tes-saldo-total">
        <span className="tes-etiqueta">Saldo total</span>
        <span className="tes-valor-grande">{formatearMonto(saldoTotal)}</span>
      </section>

      <section className="tes-cuentas-grid">
        {cuentas.map((c) => (
          <div
            key={c.id}
            className={`tes-cuenta ${String(cuentaFiltro) === String(c.id) ? "activa" : ""}`}
            onClick={() =>
              setCuentaFiltro(
                String(cuentaFiltro) === String(c.id) ? "" : String(c.id)
              )
            }
          >
            <div className="tes-cuenta-nombre">{c.nombre}</div>
            <div className="tes-cuenta-tipo">{c.tipo}</div>
            <div className="tes-cuenta-saldo">
              {formatearMonto(c.saldo_actual)}
            </div>
          </div>
        ))}
      </section>

      <section className="tes-movimientos">
        <header className="tes-mov-header">
          <h2>
            Movimientos {cuentaFiltro && "(filtrados)"}
          </h2>
          {cuentaFiltro && (
            <button
              className="btn-secundario"
              onClick={() => setCuentaFiltro("")}
            >
              Ver todos
            </button>
          )}
        </header>

        {movimientosFiltrados.length === 0 ? (
          <p style={{ color: "var(--texto-tenue)", padding: "1rem 0" }}>
            No hay movimientos registrados.
          </p>
        ) : (
          <table className="tes-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Cuenta</th>
                <th>Concepto</th>
                <th style={{ textAlign: "right" }}>Monto</th>
              </tr>
            </thead>
            <tbody>
              {movimientosFiltrados.map((m) => (
                <tr key={m.id}>
                  <td>{m.fecha}</td>
                  <td>
                    <span className={`tes-tipo tes-tipo-${m.tipo}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td>
                    {m.cuenta_nombre}
                    {m.tipo === "transferencia" && m.cuenta_destino_nombre && (
                      <span style={{ color: "var(--texto-tenue)" }}>
                        {" → "}
                        {m.cuenta_destino_nombre}
                      </span>
                    )}
                  </td>
                  <td>{m.concepto}</td>
                  <td
                    style={{
                      textAlign: "right",
                      color:
                        m.tipo === "entrada"
                          ? "var(--positivo, #78947f)"
                          : m.tipo === "salida"
                            ? "var(--negativo, #b0605f)"
                            : "var(--texto)",
                    }}
                  >
                    {m.tipo === "salida" ? "-" : ""}
                    {formatearMonto(m.monto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {modalAbierto && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && cerrarModal()}
        >
          <div className="modal-contenido">
            <div className="modal-cabecera">
              <div>
                <span className="modal-etiqueta">Registrar</span>
                <h3>Nuevo movimiento</h3>
              </div>
              <button className="btn-cerrar-modal" onClick={cerrarModal}>
                ×
              </button>
            </div>

            <form onSubmit={guardarMovimiento} className="tes-form">
              <div className="campo">
                <label>Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => cambiarForm("tipo", e.target.value)}
                >
                  <option value={TIPO_MOV.ENTRADA}>Entrada</option>
                  <option value={TIPO_MOV.SALIDA}>Salida</option>
                  <option value={TIPO_MOV.TRANSFERENCIA}>Transferencia</option>
                </select>
              </div>

              <div className="campo">
                <label>
                  {form.tipo === TIPO_MOV.TRANSFERENCIA ? "Cuenta origen" : "Cuenta"}
                </label>
                <select
                  value={form.cuentaId}
                  onChange={(e) => cambiarForm("cuentaId", e.target.value)}
                  required
                >
                  <option value="">Seleccioná una cuenta</option>
                  {cuentas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {form.tipo === TIPO_MOV.TRANSFERENCIA && (
                <div className="campo">
                  <label>Cuenta destino</label>
                  <select
                    value={form.cuentaDestinoId}
                    onChange={(e) => cambiarForm("cuentaDestinoId", e.target.value)}
                    required
                  >
                    <option value="">Seleccioná cuenta destino</option>
                    {cuentas
                      .filter((c) => String(c.id) !== String(form.cuentaId))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="campo">
                <label>Monto (Gs)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.monto}
                  onChange={(e) => cambiarForm("monto", e.target.value)}
                  required
                />
              </div>

              <div className="campo">
                <label>Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => cambiarForm("fecha", e.target.value)}
                  required
                />
              </div>

              <div className="campo">
                <label>Concepto</label>
                <input
                  type="text"
                  value={form.concepto}
                  onChange={(e) => cambiarForm("concepto", e.target.value)}
                  placeholder="Ej: Pago importación lote 2"
                  maxLength={300}
                  required
                />
              </div>

              <div className="tes-form-acciones">
                <button
                  type="button"
                  className="btn-secundario"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-principal"
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

export default Tesoreria
