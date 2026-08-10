import TarjetasResumen from "../components/TarjetasResumen"
import GraficoGastos from "../components/GraficoGastos"
import GraficoEvolucion from "../components/GraficoEvolucion"
import TablaTopProductos from "../components/TablaTopProductos"
import GraficoProyeccion from "../components/GraficoProyeccion"

function Dashboard({ negocioId }) {
  return (
    <div>
      <h1>Dashboard</h1>
      <TarjetasResumen negocioId={negocioId} />

      <div className="grid-dashboard">
        <section>
          <h2>Gastos por categoría</h2>
          <GraficoGastos negocioId={negocioId} />
        </section>
        <section>
          <h2>Evolución mensual de gastos</h2>
          <GraficoEvolucion negocioId={negocioId} />
        </section>
      </div>
      <section>
        <h2>Proyección vs Realidad</h2>
        <GraficoProyeccion negocioId={negocioId} />
      </section>

      <section>
        <h2>Productos más vendidos</h2>
        <TablaTopProductos negocioId={negocioId} />
      </section>

    </div>
  )
}

export default Dashboard