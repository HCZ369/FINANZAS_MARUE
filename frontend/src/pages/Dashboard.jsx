import TarjetasResumen from "../components/TarjetasResumen"
import GraficoGastos from "../components/GraficoGastos"
import GraficoEvolucion from "../components/GraficoEvolucion"
import TablaTopProductos from "../components/TablaTopProductos"
import GraficoProyeccion from "../components/GraficoProyeccion"

function Dashboard({ negocioId }) {
  if (!negocioId) {
    return (
      <main className="pagina-dashboard">
        <EstadoVacio
          titulo="Seleccioná un negocio"
          descripcion="Necesitás seleccionar un negocio para consultar sus métricas."
        />
      </main>
    )
  }

  return (
    <main className="pagina-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
        </div>
      </header>

      <section
        className="dashboard-resumen"
        aria-label="Resumen financiero"
      >
        <TarjetasResumen negocioId={negocioId} />
      </section>

      <div className="dashboard-grid">
        <PanelDashboard
          titulo="Gastos por categoría"
          descripcion="Distribución de los gastos registrados."
          className="dashboard-panel-medio"
        >
          <GraficoGastos negocioId={negocioId} />
        </PanelDashboard>

        <PanelDashboard
          titulo="Evolución de gastos"
          descripcion="Comportamiento mensual de los gastos."
          className="dashboard-panel-medio"
        >
          <GraficoEvolucion negocioId={negocioId} />
        </PanelDashboard>

        <PanelDashboard
          titulo="Proyección y realidad"
          descripcion="Comparación entre los valores proyectados y reales."
          className="dashboard-panel-completo"
        >
          <GraficoProyeccion negocioId={negocioId} />
        </PanelDashboard>

        <PanelDashboard
          titulo="Productos más vendidos"
          descripcion="Productos con mayor volumen de ventas."
          className="dashboard-panel-completo"
          sinPadding
        >
          <TablaTopProductos negocioId={negocioId} />
        </PanelDashboard>
      </div>
    </main>
  )
}

function PanelDashboard({
  titulo,
  descripcion,
  children,
  className = "",
  sinPadding = false,
}) {
  return (
    <section
      className={`dashboard-panel ${className} ${
        sinPadding ? "dashboard-panel-sin-padding" : ""
      }`}
    >
      <header className="dashboard-panel-header">
        <div>
          <h2>{titulo}</h2>
          {descripcion && <p>{descripcion}</p>}
        </div>
      </header>

      <div className="dashboard-panel-contenido">
        {children}
      </div>
    </section>
  )
}

function EstadoVacio({ titulo, descripcion }) {
  return (
    <section className="dashboard-vacio">
      <div className="dashboard-vacio-icono" aria-hidden="true">
        ·
      </div>

      <h1>{titulo}</h1>
      <p>{descripcion}</p>
    </section>
  )
}

export default Dashboard