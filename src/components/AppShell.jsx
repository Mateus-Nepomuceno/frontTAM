import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { PerfilUsuario } from '../data/enums.js'
import './shell.css'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '◆' },
  { to: '/projetos', label: 'Projetos', icon: '▤' },
  { to: '/tarefas', label: 'Quadro de Tarefas', icon: '▦' },
  { to: '/treinamentos', label: 'Treinamentos', icon: '★' },
  { to: '/usuarios', label: 'Usuários', icon: '◉', gestaoOnly: true },
]

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the mobile menu whenever the route changes
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = NAV.filter((item) =>
    !item.gestaoOnly || user?.perfil === PerfilUsuario.Admin || user?.perfil === PerfilUsuario.Gestor,
  )

  return (
    <div className="shell">
      {/* Mobile top bar with hamburger */}
      <div className="mobile-bar">
        <img className="mobile-logo" src={`${import.meta.env.BASE_URL}logo-ts.png`} alt="Tecno System" />
        <button
          className="hamburger"
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Backdrop when menu open on mobile */}
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={'sidebar' + (menuOpen ? ' open' : '')}>
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}logo-ts.png`} alt="Tecno System — Training and Management" />
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="sidebar-user">
            <div className="user-meta">
              <strong>{user.nome}</strong>
              <span className="user-role">{user.perfil}</span>
            </div>
            <button className="sidebar-logout" onClick={handleLogout} title="Sair">Sair</button>
          </div>
        )}
      </aside>

      <div className="main">
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
