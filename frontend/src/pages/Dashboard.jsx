import GraficoGastos from "../components/GraficoGastos"
import GraficoEvolucion from "../components/GraficoEvolucion"

function Dashboard({ negocioId }) {
  return (
    <div>
      <h1>Dashboard</h1>
      <h2>Gastos por categoría</h2>
      <div style={{ maxWidth: "600px", height: "300px" }}>
        <GraficoGastos negocioId={negocioId} />
      </div>
      <h2>Evolución mensual de gastos</h2>
      <div style={{ maxWidth: "600px", height: "300px" }}>
        <GraficoEvolucion negocioId={negocioId} />
      </div>
    </div>
  )
}

export default Dashboard