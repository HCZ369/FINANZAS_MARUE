import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "../api/client"
import { formatearMonto } from "../utils"

const FORM_INICIAL = {
  negocio: { nombre: "" },
  categoria: { nombre: "", tipo: "gasto" },
  inyeccion: { monto: "", fecha: "", nota: "" },
  lote: { fecha: "", tasa_cambio: "", descripcion: "" },
  producto: {
    nombre: "",
    precio: "",
    lote_id: "",
    costo_usd: "",
    cantidad_comprada: "",
  },
}

function Configuracion({ negocioId }) {
  const [datos, setDatos] = useState({
    negocios: [],
    categorias: [],
    inyecciones: [],
    productos: [],
    lotes: [],
  })

  const [forms, setForms] = useState(FORM_INICIAL)

  const [editandoId, setEditandoId] = useState({
    negocio: null,
    categoria: null,
    inyeccion: null,
    lote: null,
    producto: null,
  })

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(null)
  const [eliminando, setEliminando] = useState(null)
  const [sugerencia, setSugerencia] = useState(null)
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "exito" })

  const [abiertas, setAbiertas] = useState({
    negocios: true,
    categorias: true,
    inyecciones: true,
    lotes: true,
    productos: true,
  })

  const mostrarMsg = useCallback((texto, tipo = "exito") => {
    setMensaje({ texto, tipo })
    if (tipo !== "error") {
      setTimeout(() => setMensaje({ texto: "", tipo: "exito" }), 4000)
    }
  }, [])

  function actualizarForm(seccion, campos) {
    setForms((prev) => ({ ...prev, [seccion]: { ...prev[seccion], ...campos } }))
  }

  function resetForm(seccion) {
    setForms((prev) => ({ ...prev, [seccion]: FORM_INICIAL[seccion] }))
    setEditandoId((prev) => ({ ...prev, [seccion]: null }))
    if (seccion === "producto") setSugerencia(null)
  }

  function toggleSeccion(seccion) {
    setAbiertas((prev) => ({ ...prev, [seccion]: !prev[seccion] }))
  }

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    try {
      const [negocios, categorias, inyecciones, productos, lotes] = await Promise.all([
        apiGet("/negocios/"),
        apiGet(`/negocios/${negocioId}/categorias/`),
        apiGet(`/negocios/${negocioId}/inyecciones/`),
        apiGet(`/negocios/${negocioId}/productos/`),
        apiGet(`/negocios/${negocioId}/lotes/`),
      ])
      setDatos({ negocios, categorias, inyecciones, productos, lotes })
    } catch (error) {
      mostrarMsg("Error cargando datos: " + error.message, "error")
    } finally {
      setCargando(false)
    }
  }, [negocioId, mostrarMsg])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  async function guardar({ seccion, coleccion, urlBase, validar, datosPayload }) {
    const form = forms[seccion]
    const id = editandoId[seccion]

    const error = validar ? validar(form) : null
    if (error) {
      mostrarMsg(error, "error")
      return
    }

    setGuardando(seccion)
    try {
      const payload = datosPayload ? datosPayload(form) : form
      const resultado = id
        ? await apiPut(`${urlBase}${id}/`, payload)
        : await apiPost(urlBase, payload)

      setDatos((prev) => {
        const lista = prev[coleccion]
        if (id) {
          const item = resultado.item ?? resultado.data ?? { ...form, id }
          return {
            ...prev,
            [coleccion]: lista.map((x) => (x.id === id ? { ...x, ...item } : x)),
          }
        }
        const nuevo = resultado.item ?? resultado.data
        if (nuevo && nuevo.id) {
          return { ...prev, [coleccion]: [...lista, nuevo] }
        }
        return prev
      })

      mostrarMsg(resultado.mensaje || "Guardado correctamente")
      resetForm(seccion)

      if (!id && !(resultado.item || resultado.data)) {
        await cargarDatos()
      }
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    } finally {
      setGuardando(null)
    }
  }

  async function borrar({ coleccion, urlBase, id, nombre }) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    setEliminando(id)
    try {
      const resultado = await apiDelete(`${urlBase}${id}/`)
      setDatos((prev) => ({
        ...prev,
        [coleccion]: prev[coleccion].filter((x) => x.id !== id),
      }))
      mostrarMsg(resultado.mensaje || `"${nombre}" eliminado`)
    } catch (error) {
      mostrarMsg("Error: " + error.message, "error")
    } finally {
      setEliminando(null)
    }
  }

  // NEGOCIOS
  function guardarNegocio(e) {
    e.preventDefault()
    guardar({
      seccion: "negocio",
      coleccion: "negocios",
      urlBase: "/negocios/",
      validar: (f) => (!f.nombre.trim() ? "El nombre del negocio es obligatorio" : null),
    })
  }

  function editarNegocio(n) {
    actualizarForm("negocio", { nombre: n.nombre })
    setEditandoId((p) => ({ ...p, negocio: n.id }))
  }

  function borrarNegocio(n) {
    borrar({
      coleccion: "negocios",
      urlBase: "/negocios/",
      id: n.id,
      nombre: `${n.nombre} (se perderán todos sus datos)`,
    })
  }

  // CATEGORÍAS
  function guardarCategoria(e) {
    e.preventDefault()
    guardar({
      seccion: "categoria",
      coleccion: "categorias",
      urlBase: `/negocios/${negocioId}/categorias/`,
      validar: (f) => {
        if (!f.nombre.trim()) return "El nombre de la categoría es obligatorio"
        if (!["gasto", "ingreso"].includes(f.tipo)) return "Tipo de categoría inválido"
        return null
      },
    })
  }

  function editarCategoria(c) {
    actualizarForm("categoria", { nombre: c.nombre, tipo: c.tipo })
    setEditandoId((p) => ({ ...p, categoria: c.id }))
  }

  function borrarCategoria(c) {
    borrar({
      coleccion: "categorias",
      urlBase: `/negocios/${negocioId}/categorias/`,
      id: c.id,
      nombre: c.nombre,
    })
  }

  // INYECCIONES
  function guardarInyeccion(e) {
    e.preventDefault()
    guardar({
      seccion: "inyeccion",
      coleccion: "inyecciones",
      urlBase: `/negocios/${negocioId}/inyecciones/`,
      validar: (f) => {
        if (!f.monto || Number(f.monto) <= 0) return "El monto debe ser mayor a 0"
        if (!f.fecha) return "La fecha es obligatoria"
        return null
      },
    })
  }

  function editarInyeccion(i) {
    actualizarForm("inyeccion", { monto: i.monto, fecha: i.fecha, nota: i.nota || "" })
    setEditandoId((p) => ({ ...p, inyeccion: i.id }))
  }

  function borrarInyeccion(i) {
    borrar({
      coleccion: "inyecciones",
      urlBase: `/negocios/${negocioId}/inyecciones/`,
      id: i.id,
      nombre: `inyección de ${formatearMonto(i.monto)} del ${i.fecha}`,
    })
  }

  // LOTES
  function guardarLote(e) {
    e.preventDefault()
    guardar({
      seccion: "lote",
      coleccion: "lotes",
      urlBase: `/negocios/${negocioId}/lotes/`,
      validar: (f) => {
        if (!f.fecha) return "La fecha del lote es obligatoria"
        if (!f.tasa_cambio || Number(f.tasa_cambio) <= 0) return "La tasa de cambio debe ser mayor a 0"
        return null
      },
    })
  }

  function editarLote(l) {
    actualizarForm("lote", {
      fecha: l.fecha,
      tasa_cambio: l.tasa_cambio,
      descripcion: l.descripcion || "",
    })
    setEditandoId((p) => ({ ...p, lote: l.id }))
  }

  function borrarLote(l) {
    borrar({
      coleccion: "lotes",
      urlBase: `/negocios/${negocioId}/lotes/`,
      id: l.id,
      nombre: l.descripcion || `Lote del ${l.fecha}`,
    })
  }

  // PRODUCTOS
  function guardarProducto(e) {
    e.preventDefault()
    guardar({
      seccion: "producto",
      coleccion: "productos",
      urlBase: `/negocios/${negocioId}/productos/`,
      validar: (f) => {
        if (!f.nombre.trim()) return "El nombre del producto es obligatorio"
        if (!f.precio || Number(f.precio) <= 0) return "El precio debe ser mayor a 0"
        if (!f.lote_id) return "Elegí un lote"
        if (!f.costo_usd || Number(f.costo_usd) <= 0) return "El costo USD debe ser mayor a 0"
        if (!f.cantidad_comprada || Number(f.cantidad_comprada) <= 0)
          return "La cantidad comprada debe ser mayor a 0"
        return null
      },
      datosPayload: (f) => ({
        nombre: f.nombre,
        precio: f.precio,
        costo: sugerencia?.costo_unitario ?? null,
        lote_id: f.lote_id,
        costo_usd: f.costo_usd,
        cantidad_comprada: f.cantidad_comprada,
      }),
    })
  }

  function editarProducto(p) {
    actualizarForm("producto", {
      nombre: p.nombre,
      precio: p.precio,
      lote_id: p.lote_id || "",
      costo_usd: p.costo_usd || "",
      cantidad_comprada: p.cantidad_comprada || "",
    })
    setEditandoId((prev) => ({ ...prev, producto: p.id }))
    setSugerencia(null)
  }

  function borrarProducto(p) {
    borrar({
      coleccion: "productos",
      urlBase: `/negocios/${negocioId}/productos/`,
      id: p.id,
      nombre: p.nombre,
    })
  }

  async function pedirSugerencia() {
    const f = forms.producto
    if (!f.lote_id || !f.costo_usd) {
      mostrarMsg("Elegí un lote y cargá el costo USD para calcular la sugerencia", "error")
      return
    }
    try {
      const resultado = await apiPost(`/negocios/${negocioId}/sugerencia-precio/`, {
        lote_id: f.lote_id,
        costo_usd: f.costo_usd,
      })
      setSugerencia(resultado)
      actualizarForm("producto", { precio: resultado.precio_sugerido })
    } catch (error) {
      mostrarMsg("Error calculando sugerencia: " + error.message, "error")
    }
  }

  // Render
  const formN = forms.negocio
  const formC = forms.categoria
  const formI = forms.inyeccion
  const formL = forms.lote
  const formP = forms.producto

  if (cargando) {
    return (
      <div>
        <h1>Configuración</h1>
        <p className="lista-vacia">Cargando datos...</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Configuración</h1>

      {mensaje.texto && (
        <div className={mensaje.tipo === "error" ? "msg msg-error" : "msg msg-exito"}>
          {mensaje.texto}
          <button
            className="btn-cerrar-msg"
            onClick={() => setMensaje({ texto: "", tipo: "exito" })}
          >
            ×
          </button>
        </div>
      )}

      {/* NEGOCIOS */}
      <Tarjeta
        titulo="Negocios"
        abierta={abiertas.negocios}
        onToggle={() => toggleSeccion("negocios")}
      >
        <form onSubmit={guardarNegocio}>
          <input
            type="text"
            placeholder="Nombre del negocio"
            value={formN.nombre}
            onChange={(e) => actualizarForm("negocio", { nombre: e.target.value })}
          />
          <div className="fila-form">
            <button
              type="submit"
              className="btn-principal"
              disabled={guardando === "negocio"}
            >
              {guardando === "negocio"
                ? "Guardando..."
                : editandoId.negocio ? "Guardar" : "Crear negocio"}
            </button>
            {editandoId.negocio && (
              <button
                type="button"
                className="btn-secundario"
                onClick={() => resetForm("negocio")}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
        <div className="lista-items">
          {datos.negocios.map((n) => (
            <div className="fila-item" key={n.id}>
              <span>{n.nombre}</span>
              <div className="acciones">
                <button className="btn-accion" onClick={() => editarNegocio(n)}>
                  Editar
                </button>
                <button
                  className="btn-borrar"
                  onClick={() => borrarNegocio(n)}
                  disabled={eliminando === n.id}
                >
                  {eliminando === n.id ? "Borrando..." : "Borrar"}
                </button>
              </div>
            </div>
          ))}
          {datos.negocios.length === 0 && <p className="lista-vacia">Sin negocios</p>}
        </div>
      </Tarjeta>

      {/* CATEGORÍAS */}
      <Tarjeta
        titulo="Categorías"
        abierta={abiertas.categorias}
        onToggle={() => toggleSeccion("categorias")}
      >
        <form onSubmit={guardarCategoria}>
          <input
            type="text"
            placeholder="Nombre de la categoría"
            value={formC.nombre}
            onChange={(e) => actualizarForm("categoria", { nombre: e.target.value })}
          />
          <select
            value={formC.tipo}
            onChange={(e) => actualizarForm("categoria", { tipo: e.target.value })}
          >
            <option value="gasto">Gasto</option>
            <option value="ingreso">Ingreso</option>
          </select>
          <div className="fila-form">
            <button
              type="submit"
              className="btn-principal"
              disabled={guardando === "categoria"}
            >
              {guardando === "categoria"
                ? "Guardando..."
                : editandoId.categoria ? "Guardar" : "Crear categoría"}
            </button>
            {editandoId.categoria && (
              <button
                type="button"
                className="btn-secundario"
                onClick={() => resetForm("categoria")}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
        <div className="lista-items">
          {datos.categorias.map((c) => (
            <div className="fila-item" key={c.id}>
              <span>
                {c.nombre} <span className="etiqueta-tipo">({c.tipo})</span>
              </span>
              <div className="acciones">
                <button className="btn-accion" onClick={() => editarCategoria(c)}>
                  Editar
                </button>
                <button
                  className="btn-borrar"
                  onClick={() => borrarCategoria(c)}
                  disabled={eliminando === c.id}
                >
                  {eliminando === c.id ? "Borrando..." : "Borrar"}
                </button>
              </div>
            </div>
          ))}
          {datos.categorias.length === 0 && (
            <p className="lista-vacia">Sin categorías</p>
          )}
        </div>
      </Tarjeta>

      {/* INYECCIONES */}
      <Tarjeta
        titulo="Inyecciones de capital"
        abierta={abiertas.inyecciones}
        onToggle={() => toggleSeccion("inyecciones")}
      >
        <form onSubmit={guardarInyeccion}>
          <div className="grid-form-config">
            <div className="campo">
              <label>Monto</label>
              <input
                type="number"
                placeholder="0"
                value={formI.monto}
                onChange={(e) => actualizarForm("inyeccion", { monto: e.target.value })}
              />
            </div>
            <div className="campo">
              <label>Fecha</label>
              <input
                type="date"
                value={formI.fecha}
                onChange={(e) => actualizarForm("inyeccion", { fecha: e.target.value })}
              />
            </div>
          </div>
          <div className="campo">
            <label>Nota (opcional)</label>
            <input
              type="text"
              placeholder="Ej: compra de lote mayo"
              value={formI.nota}
              onChange={(e) => actualizarForm("inyeccion", { nota: e.target.value })}
            />
          </div>
          <div className="fila-form">
            <button
              type="submit"
              className="btn-principal"
              disabled={guardando === "inyeccion"}
            >
              {guardando === "inyeccion"
                ? "Guardando..."
                : editandoId.inyeccion ? "Guardar" : "Registrar inyección"}
            </button>
            {editandoId.inyeccion && (
              <button
                type="button"
                className="btn-secundario"
                onClick={() => resetForm("inyeccion")}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
        <div className="lista-items">
          {datos.inyecciones.map((i) => (
            <div className="fila-item" key={i.id}>
              <span>
                <strong>{formatearMonto(i.monto)}</strong> — {i.fecha}
                {i.nota ? ` (${i.nota})` : ""}
              </span>
              <div className="acciones">
                <button className="btn-accion" onClick={() => editarInyeccion(i)}>
                  Editar
                </button>
                <button
                  className="btn-borrar"
                  onClick={() => borrarInyeccion(i)}
                  disabled={eliminando === i.id}
                >
                  {eliminando === i.id ? "Borrando..." : "Borrar"}
                </button>
              </div>
            </div>
          ))}
          {datos.inyecciones.length === 0 && (
            <p className="lista-vacia">Sin inyecciones</p>
          )}
        </div>
      </Tarjeta>

      {/* LOTES */}
      <Tarjeta
        titulo="Lotes de compra"
        abierta={abiertas.lotes}
        onToggle={() => toggleSeccion("lotes")}
      >
        <form onSubmit={guardarLote}>
          <div className="grid-form-config">
            <div className="campo">
              <label>Fecha</label>
              <input
                type="date"
                value={formL.fecha}
                onChange={(e) => actualizarForm("lote", { fecha: e.target.value })}
              />
            </div>
            <div className="campo">
              <label>Tasa de cambio</label>
              <input
                type="number"
                placeholder="Ej: 7350"
                value={formL.tasa_cambio}
                onChange={(e) => actualizarForm("lote", { tasa_cambio: e.target.value })}
              />
            </div>
          </div>
          <div className="campo">
            <label>Descripción (opcional)</label>
            <input
              type="text"
              placeholder="Ej: Lote AliExpress mayo"
              value={formL.descripcion}
              onChange={(e) => actualizarForm("lote", { descripcion: e.target.value })}
            />
          </div>
          <div className="fila-form">
            <button
              type="submit"
              className="btn-principal"
              disabled={guardando === "lote"}
            >
              {guardando === "lote"
                ? "Guardando..."
                : editandoId.lote ? "Guardar" : "Crear lote"}
            </button>
            {editandoId.lote && (
              <button
                type="button"
                className="btn-secundario"
                onClick={() => resetForm("lote")}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
        <div className="lista-items">
          {datos.lotes.map((l) => (
            <div className="fila-item" key={l.id}>
              <span>
                {l.fecha} — Tasa <strong>{formatearMonto(l.tasa_cambio)}</strong>
                {l.descripcion ? ` (${l.descripcion})` : ""}
              </span>
              <div className="acciones">
                <button className="btn-accion" onClick={() => editarLote(l)}>
                  Editar
                </button>
                <button
                  className="btn-borrar"
                  onClick={() => borrarLote(l)}
                  disabled={eliminando === l.id}
                >
                  {eliminando === l.id ? "Borrando..." : "Borrar"}
                </button>
              </div>
            </div>
          ))}
          {datos.lotes.length === 0 && <p className="lista-vacia">Sin lotes</p>}
        </div>
      </Tarjeta>

      {/* PRODUCTOS */}
      <Tarjeta
        titulo="Productos"
        abierta={abiertas.productos}
        onToggle={() => toggleSeccion("productos")}
      >
        <form onSubmit={guardarProducto}>
          <div className="campo">
            <label>Nombre</label>
            <input
              type="text"
              placeholder="Nombre del producto"
              value={formP.nombre}
              onChange={(e) => actualizarForm("producto", { nombre: e.target.value })}
            />
          </div>
          <div className="grid-form-config">
            <div className="campo">
              <label>Lote</label>
              <select
                value={formP.lote_id}
                onChange={(e) => actualizarForm("producto", { lote_id: e.target.value })}
              >
                <option value="">Seleccionar lote</option>
                {datos.lotes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.fecha} — {l.descripcion || `Lote ${l.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label>Costo USD</label>
              <input
                type="number"
                placeholder="0.00"
                step="any"
                value={formP.costo_usd}
                onChange={(e) => actualizarForm("producto", { costo_usd: e.target.value })}
              />
            </div>
          </div>
          <div className="grid-form-config">
            <div className="campo">
              <label>Cantidad comprada</label>
              <input
                type="number"
                placeholder="0"
                value={formP.cantidad_comprada}
                onChange={(e) =>
                  actualizarForm("producto", { cantidad_comprada: e.target.value })
                }
              />
            </div>
            <div className="campo">
              <label>&nbsp;</label>
              <button
                type="button"
                className="btn-secundario"
                onClick={pedirSugerencia}
                style={{ width: "100%" }}
              >
                Calcular sugerencia
              </button>
            </div>
          </div>
          {sugerencia !== null && (
            <div className="caja-sugerencia">
              <p>Costo unitario: <strong>{sugerencia.costo_unitario}</strong></p>
              <p>Multiplicador: <strong>{sugerencia.multiplicador}</strong></p>
              <p>Precio sugerido: <strong>{sugerencia.precio_sugerido}</strong></p>
            </div>
          )}
          <div className="campo">
            <label>Precio final</label>
            <input
              type="number"
              placeholder="0"
              value={formP.precio}
              onChange={(e) => actualizarForm("producto", { precio: e.target.value })}
            />
          </div>
          <div className="fila-form">
            <button
              type="submit"
              className="btn-principal"
              disabled={guardando === "producto"}
            >
              {guardando === "producto"
                ? "Guardando..."
                : editandoId.producto ? "Guardar" : "Crear producto"}
            </button>
            {editandoId.producto && (
              <button
                type="button"
                className="btn-secundario"
                onClick={() => resetForm("producto")}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
        <div className="lista-items">
          {datos.productos.map((p) => (
            <div className="fila-item" key={p.id}>
              <span>
                {p.nombre} — <strong>{formatearMonto(p.precio)}</strong>
              </span>
              <div className="acciones">
                <button className="btn-accion" onClick={() => editarProducto(p)}>
                  Editar
                </button>
                <button
                  className="btn-borrar"
                  onClick={() => borrarProducto(p)}
                  disabled={eliminando === p.id}
                >
                  {eliminando === p.id ? "Borrando..." : "Borrar"}
                </button>
              </div>
            </div>
          ))}
          {datos.productos.length === 0 && (
            <p className="lista-vacia">Sin productos</p>
          )}
        </div>
      </Tarjeta>
    </div>
  )
}


// Subcomponente: tarjeta colapsable (FUERA del componente principal)

function Tarjeta({ titulo, abierta, onToggle, children }) {
  return (
    <section className={`tarjeta-config ${abierta ? "abierta" : "cerrada"}`}>
      <header className="tarjeta-header" onClick={onToggle}>
        <h2>{titulo}</h2>
        <button
          type="button"
          className="btn-toggle"
          aria-label={abierta ? "Colapsar" : "Expandir"}
        >
          {abierta ? "▲" : "▼"}
        </button>
      </header>
      {abierta && <div className="tarjeta-body">{children}</div>}
    </section>
  )
}

export default Configuracion