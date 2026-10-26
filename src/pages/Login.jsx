import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import './login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [errors, setErrors] = useState({})
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!email.trim()) e.email = 'Informe o e-mail.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'E-mail inválido.'
    if (!senha) e.senha = 'Informe a senha.'
    else if (senha.length < 6) e.senha = 'A senha deve ter ao menos 6 caracteres.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = (ev) => {
    ev.preventDefault()
    setAuthError('')
    if (!validate()) return
    setLoading(true)
    setTimeout(async () => {
      const res = await login(email, senha)
      setLoading(false)
      if (!res.ok) {
        setAuthError(res.error)
        return
      }
      navigate(res.redirect, { replace: true }) // redireciona conforme o perfil
    }, 350)
  }

  return (
    <div className="login-wrap">
      {/* Left: branded panel */}
      <section className="login-hero">
        <div className="hero-inner">
          <div className="hero-logo">
            <img src={`${import.meta.env.BASE_URL}logo-ts.png`} alt="Tecno System — Training and Management" />
          </div>
          <h1>Gerencie projetos e capacite sua equipe em um só lugar.</h1>
          <p>Acompanhe a saúde dos projetos, organize tarefas em quadros interativos e conduza trilhas de treinamento com certificação.</p>
          <ul className="hero-points">
            <li><span className="hex" aria-hidden="true">✓</span> Dashboards de saúde e progresso</li>
            <li><span className="hex" aria-hidden="true">✓</span> Quadro de tarefas estilo Kanban</li>
            <li><span className="hex" aria-hidden="true">✓</span> Catálogo e trilhas de treinamento</li>
          </ul>
        </div>
      </section>

      {/* Right: form */}
      <section className="login-form-col">
        <img className="login-mobile-logo" src={`${import.meta.env.BASE_URL}logo-ts.png`} alt="Tecno System — Training and Management" />
        <form className="login-card animate-rise" onSubmit={onSubmit} noValidate>
          <h2>Acesse sua conta</h2>
          <p className="muted text-sm" style={{ marginBottom: '1.5rem' }}>
            Entre com suas credenciais corporativas.
          </p>

          {authError && <div className="auth-error" role="alert">{authError}</div>}

          <div className={'field' + (errors.email ? ' error' : '')}>
            <label htmlFor="email">E-mail</label>
            <input
              id="email" type="email" autoComplete="username"
              placeholder="voce@tecnosystem.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
            />
            {errors.email && <span className="error-msg">{errors.email}</span>}
          </div>

          <div className={'field' + (errors.senha ? ' error' : '')}>
            <label htmlFor="senha">Senha</label>
            <input
              id="senha" type="password" autoComplete="current-password"
              placeholder="••••••••"
              value={senha} onChange={(e) => setSenha(e.target.value)}
              aria-invalid={!!errors.senha}
            />
            {errors.senha && <span className="error-msg">{errors.senha}</span>}
          </div>

          <button className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </div>
  )
}
