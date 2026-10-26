import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useData } from './DataContext.jsx'
import { PerfilUsuario } from '../data/enums.js'
import { setOnUnauthorized } from '../services/api.js'

const AuthContext = createContext(null)

// Landing route per profile (login redirect requirement)
export const HOME_BY_PERFIL = {
  [PerfilUsuario.Admin]: '/dashboard',
  [PerfilUsuario.Gestor]: '/projetos',
  [PerfilUsuario.Membro]: '/tarefas',
}

export function AuthProvider({ children }) {
  const { autenticar, limpar } = useData()
  const [user, setUser] = useState(null)

  const login = useCallback(async (email, senha) => {
    let u
    try {
      u = await autenticar(email, senha)
    } catch (err) {
      return { ok: false, error: err?.message || 'Não foi possível conectar ao servidor.' }
    }
    if (!u) return { ok: false, error: 'E-mail ou senha inválidos.' }
    setUser(u)
    return { ok: true, user: u, redirect: HOME_BY_PERFIL[u.perfil] || '/dashboard' }
  }, [autenticar])

  const logout = useCallback(() => {
    limpar()
    setUser(null)
  }, [limpar])

  useEffect(() => {
    setOnUnauthorized(logout)
    return () => setOnUnauthorized(null)
  }, [logout])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
