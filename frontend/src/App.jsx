import { useState, useEffect } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { apiGet } from "./api/client"
import Layout from "./components/Layout"
import Dashboard from "./pages/Dashboard"
import Gastos from "./pages/Gastos"
import Ventas from "./pages/Ventas"
import Configuracion from "./pages/Configuracion"

function App() {
  const [negocios, setNegocios] = useState([])
  const [negocioId, setNegocioId] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function traerNegocios() {
      const datos = await apiGet("/negocios/")
      setNegocios(datos)
      if (datos.length > 0) {
        setNegocioId(datos[0].id)
      }
      setCargando(false)
    }
    traerNegocios()
  }, [])

  if (cargando) {
    return <p>Cargando...</p>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout negocioId={negocioId} negocios={negocios} onCambioNegocio={setNegocioId} />}>
          <Route path="/" element={<Dashboard negocioId={negocioId} />} />
          <Route path="/gastos" element={<Gastos negocioId={negocioId} />} />
          <Route path="/ventas" element={<Ventas negocioId={negocioId} />} />
          <Route path="/configuracion" element={<Configuracion negocioId={negocioId} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App