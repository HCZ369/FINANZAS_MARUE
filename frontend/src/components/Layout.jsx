import { NavLink, Outlet } from "react-router-dom"

function Layout({ negocioId, negocios, onCambioNegocio }) {
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
            {negocios.map((n) => (
              <option key={n.id} value={n.id}>{n.nombre}</option>
            ))}
          </select>
        </div>

        <nav>
          <NavLink to="/" className={({ isActive }) => isActive ? "nav-link activo" : "nav-link"}>
            Dashboard
          </NavLink>
          <NavLink to="/gastos" className={({ isActive }) => isActive ? "nav-link activo" : "nav-link"}>
            Gastos
          </NavLink>
          <NavLink to="/ventas" className={({ isActive }) => isActive ? "nav-link activo" : "nav-link"}>
            Ventas
          </NavLink>
          <NavLink to="/configuracion" className={({ isActive }) => isActive ? "nav-link activo" : "nav-link"}>
            Configuración
          </NavLink>
        </nav>
      </aside>

      <main className="contenido-principal">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout