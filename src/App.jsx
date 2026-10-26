import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, HOME_BY_PERFIL } from './context/AuthContext.jsx'
import { PerfilUsuario } from './data/enums.js'
import AppShell from './components/AppShell.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Projetos from './pages/Projetos.jsx'
import Tarefas from './pages/Tarefas.jsx'
import Treinamentos from './pages/Treinamentos.jsx'
import Usuarios from './pages/Usuarios.jsx'

function Protected({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function GestaoUsuarios({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const permitido = user.perfil === PerfilUsuario.Admin || user.perfil === PerfilUsuario.Gestor
  if (!permitido) return <Navigate to={HOME_BY_PERFIL[user.perfil] || '/dashboard'} replace />
  return children
}

export default function App() {
  const { user } = useAuth()
  const home = user ? HOME_BY_PERFIL[user.perfil] || '/dashboard' : '/login'

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <Login />} />

      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projetos" element={<Projetos />} />
        <Route path="/tarefas" element={<Tarefas />} />
        <Route path="/treinamentos" element={<Treinamentos />} />
        <Route path="/usuarios" element={<GestaoUsuarios><Usuarios /></GestaoUsuarios>} />
      </Route>

      <Route path="/" element={<Navigate to={home} replace />} />
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  )
}
