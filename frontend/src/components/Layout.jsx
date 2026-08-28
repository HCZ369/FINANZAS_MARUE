import { NavLink, Outlet } from "react-router-dom"

function Layout({ negocioId, negocios, onCambioNegocio }) {
  const enlaces = [
    { ruta: "/", texto: "Dashboard", exacto: true },
    { ruta: "/ventas", texto: "Ventas" },
    { ruta: "/catalogo", texto: "Catálogo" },
    { ruta: "/stock", texto: "Stock" },
    { ruta: "/clientes", texto: "Clientes" },
    { ruta: "/gastos", texto: "Gastos" },
    { ruta: "/configuracion", texto: "Configuración" },
  ]

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>Finanzas Marue</h2>

        <div className="selector-negocio">
          <label>Negocio</label>
          <select
            value={negocioId || ""}
            onChange={(e) => onCambioNegocio(Number(e.target.value))}
          >
            {negocios.length === 0 && <option value="">Sin negocios</option>}
            {negocios.map((n) => (
              <option key={n.id} value={n.id}>{n.nombre}</option>
            ))}
          </select>
        </div>

        <nav>
          {enlaces.map((enlace) => (
            <NavLink
              key={enlace.ruta}
              to={enlace.ruta}
              end={enlace.exacto === true}
              className={({ isActive }) => isActive ? "nav-link activo" : "nav-link"}
            >
              {enlace.texto}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="contenido-principal">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
