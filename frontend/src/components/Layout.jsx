import { useEffect, useState } from "react"
import { NavLink, Outlet } from "react-router-dom"

const ENLACES = [
  {
    grupo: "Resumen",
    items: [
      {
        ruta: "/",
        texto: "Dashboard",
        icono: DashboardIcon,
        exacto: true,
      },
    ],
  },
  {
    grupo: "Operaciones",
    items: [
      {
        ruta: "/ventas",
        texto: "Ventas",
      },
      {
        ruta: "/catalogo",
        texto: "Catálogo",
      },
      {
        ruta: "/stock",
        texto: "Stock",
      },
      {
        ruta: "/clientes",
        texto: "Clientes",
      },
      {
        ruta: "/gastos",
        texto: "Gastos",
      },
    ],
  },
  {
    grupo: "Sistema",
    items: [
      {
        ruta: "/configuracion",
        texto: "Configuración",
      },
    ],
  },
]

function Layout({
  negocioId,
  negocios = [],
  onCambioNegocio,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false)

  const negocioSeleccionado = negocios.find(
    (negocio) => Number(negocio.id) === Number(negocioId)
  )

  const hayNegocios = negocios.length > 0

  useEffect(() => {
    function cerrarConEscape(evento) {
      if (evento.key === "Escape") {
        setMenuAbierto(false)
      }
    }

    document.addEventListener("keydown", cerrarConEscape)

    return () => {
      document.removeEventListener("keydown", cerrarConEscape)
    }
  }, [])

  useEffect(() => {
    if (!menuAbierto) return

    function bloquearScroll() {
      if (window.innerWidth <= 760) {
        document.body.classList.add("menu-lateral-abierto")
      }
    }

    bloquearScroll()

    return () => {
      document.body.classList.remove("menu-lateral-abierto")
    }
  }, [menuAbierto])

  function cambiarNegocio(evento) {
    const valor = evento.target.value

    if (!valor) return

    onCambioNegocio?.(Number(valor))
  }

  function cerrarMenu() {
    setMenuAbierto(false)
  }

  return (
    <div className="layout">
      <header className="cabecera-movil">
        <button
          type="button"
          className="btn-menu-movil"
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          aria-expanded={menuAbierto}
          aria-controls="sidebar-principal"
        >
          <MenuIcon />
        </button>

        <IdentidadAplicacion compacta />

        <span className="cabecera-negocio">
          {negocioSeleccionado?.nombre || "Sin negocio"}
        </span>
      </header>

      {menuAbierto && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={cerrarMenu}
          aria-label="Cerrar menú"
        />
      )}

      <aside
        id="sidebar-principal"
        className={`sidebar ${menuAbierto ? "sidebar-abierto" : ""}`}
      >
        <div className="sidebar-cabecera">
          <IdentidadAplicacion />

          <button
            type="button"
            className="btn-cerrar-sidebar"
            onClick={cerrarMenu}
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>

        <div className="selector-negocio">
          <label htmlFor="selector-negocio">
            Proyecto
          </label>

          <div className="selector-negocio-control">
            <NegocioIcon />

            <select
              id="selector-negocio"
              value={negocioId || ""}
              onChange={cambiarNegocio}
              disabled={!hayNegocios}
              aria-label="Seleccionar negocio"
            >
              {!hayNegocios && (
                <option value="">Sin negocios disponibles</option>
              )}

              {hayNegocios && !negocioId && (
                <option value="">Seleccionar negocio</option>
              )}

              {negocios.map((negocio) => (
                <option key={negocio.id} value={negocio.id}>
                  {negocio.nombre}
                </option>
              ))}
            </select>
          </div>

          {negocioSeleccionado && (
            <div className="estado-negocio">
              <span className="estado-negocio-punto" />
              <span>Activo</span>
            </div>
          )}
        </div>

        <div className="sidebar-linea" />

        <nav
          className="sidebar-navegacion"
          aria-label="Navegación principal"
        >
          {ENLACES.map((seccion) => (
            <div
              className="nav-grupo"
              key={seccion.grupo}
            >
              <span className="nav-grupo-titulo">
                {seccion.grupo}
              </span>

              <div className="nav-grupo-enlaces">
                {seccion.items.map((enlace) => {
                  const Icono = enlace.icono

                  return (
                    <NavLink
                      key={enlace.ruta}
                      to={enlace.ruta}
                      end={enlace.exacto === true}
                      onClick={cerrarMenu}
                      className={({ isActive }) =>
                        `nav-link ${isActive ? "activo" : ""}`
                      }
                    >
                      <Icono />

                      <span>{enlace.texto}</span>

                      <span
                        className="nav-link-indicador"
                        aria-hidden="true"
                      />
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <footer className="sidebar-pie">
          <div className="sidebar-pie-marca">
            <span className="sidebar-pie-icono">
              FM
            </span>

            <div>
              <strong>Finanzas Marue</strong>
              <span>Gestión financiera</span>
            </div>
          </div>

          <span className="sidebar-version">
            v1.0
          </span>
        </footer>
      </aside>

      <main className="contenido-principal">
        {!hayNegocios ? (
          <EstadoSinNegocio />
        ) : (
          <Outlet
            context={{
              negocioId,
              negocio: negocioSeleccionado,
            }}
          />
        )}
      </main>
    </div>
  )
}

function IdentidadAplicacion({ compacta = false }) {
  return (
    <div
      className={`identidad-app ${
        compacta ? "identidad-app-compacta" : ""
      }`}
    >
      <div className="identidad-simbolo" aria-hidden="true">
        M
      </div>

      {!compacta && (
        <div className="identidad-texto">
          <strong>Finanzas</strong>
          <span>Marue</span>
        </div>
      )}
    </div>
  )
}

function EstadoSinNegocio() {
  return (
    <section className="estado-sin-negocio">
      <div className="estado-sin-negocio-icono">
        <NegocioIcon />
      </div>

      <h1>No hay negocios disponibles</h1>

      <p>
        Creá un negocio para comenzar a registrar ventas,
        clientes, productos y gastos.
      </p>
    </section>
  )
}

function BaseIcon({ children, className = "" }) {
  return (
    <svg
      className={`nav-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function MenuIcon() {
  return (
    <BaseIcon>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </BaseIcon>
  )
}

function DashboardIcon() {
  return (
    <BaseIcon>
      <rect x="4" y="4" width="6" height="6" />
      <rect x="14" y="4" width="6" height="6" />
      <rect x="4" y="14" width="6" height="6" />
      <rect x="14" y="14" width="6" height="6" />
    </BaseIcon>
  )
}

function VentasIcon() {
  return (
    <BaseIcon>
      <path d="M4 7h16" />
      <path d="M6 4h12l1 16H5L6 4Z" />
      <path d="M9 10c0 1.5 1.3 2.5 3 2.5s3 1 3 2.5-1.3 2.5-3 2.5-3-1-3-2.5" />
    </BaseIcon>
  )
}

function CatalogoIcon() {
  return (
    <BaseIcon>
      <path d="M4 5h16v14H4z" />
      <path d="M4 10h16" />
      <path d="M9 10v9" />
    </BaseIcon>
  )
}

function StockIcon() {
  return (
    <BaseIcon>
      <path d="m4 8 8-4 8 4-8 4-8-4Z" />
      <path d="m4 8 8 4 8-4" />
      <path d="M4 8v8l8 4 8-4V8" />
      <path d="M12 12v8" />
    </BaseIcon>
  )
}

function ClientesIcon() {
  return (
    <BaseIcon>
      <circle cx="9" cy="8" r="3" />
      <path d="M4 19c0-3 2-5 5-5s5 2 5 5" />
      <path d="M16 5.5a3 3 0 0 1 0 5" />
      <path d="M17 14c2 0 3.5 1.5 3.5 4" />
    </BaseIcon>
  )
}

function GastosIcon() {
  return (
    <BaseIcon>
      <path d="M4 6h16v12H4z" />
      <path d="M8 10h4" />
      <path d="M8 14h8" />
      <path d="M16 6V4" />
      <path d="M8 6V4" />
    </BaseIcon>
  )
}

function ConfiguracionIcon() {
  return (
    <BaseIcon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.8-1L14.4 3h-4.8L9.3 6a7 7 0 0 0-1.8 1L5.1 6 3 9.5 5.1 11a7 7 0 0 0 0 2L3 14.5 5.1 18l2.4-1a7 7 0 0 0 1.8 1l.3 3h4.8l.3-3a7 7 0 0 0 1.8-1l2.4 1 2.1-3.5-2.1-1.5a7 7 0 0 0 .1-1Z" />
    </BaseIcon>
  )
}

function NegocioIcon() {
  return (
    <BaseIcon className="negocio-icon">
      <path d="M4 20V7l8-4 8 4v13" />
      <path d="M8 20v-5h8v5" />
      <path d="M8 9h1" />
      <path d="M15 9h1" />
      <path d="M8 12h1" />
      <path d="M15 12h1" />
    </BaseIcon>
  )
}

export default Layout