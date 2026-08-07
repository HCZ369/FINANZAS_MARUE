import GraficoGastos from "../components/GraficoGastos"

function Dashboard({ negocioId }) {
  return (
    <div>
      <h1>Dashboard</h1>
      <h2>Gastos por categoría</h2>
      <div style={{ maxWidth: "600px", height: "300px" }}>
        <GraficoGastos negocioId={negocioId} />
      </div>
    </div>
  )
}

export default Dashboard