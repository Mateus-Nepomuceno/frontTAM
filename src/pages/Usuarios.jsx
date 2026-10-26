import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { PerfilUsuario } from '../data/enums.js'
import { formatDate } from '../utils/helpers.js'
import { Modal, ConfirmDialog } from '../components/Modal.jsx'
import './pages.css'

export default function Usuarios() {
  const { usuarios, criarUsuario, atualizarUsuario, excluirUsuario, emailEmUso } = useData()
  const { user } = useAuth()
  const isAdmin = user?.perfil === PerfilUsuario.Admin

  const [q, setQ] = useState('')
  const [fPerfil, setFPerfil] = useState('')
  const [editing, setEditing] = useState(null) // null | {} | usuario
  const [confirmDel, setConfirmDel] = useState(null)

  const filtrados = useMemo(() => {
    return usuarios.filter((u) => {
      if (q && !u.nome.toLowerCase().includes(q.toLowerCase()) && !u.email.toLowerCase().includes(q.toLowerCase())) return false
      if (fPerfil && u.perfil !== fPerfil) return false
      return true
    })
  }, [usuarios, q, fPerfil])

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="kicker">Administração</span>
          <h1>Usuários</h1>
          <p className="sub">Crie e gerencie os usuários da plataforma e seus perfis de acesso.</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="search">
          <input placeholder="Buscar por nome ou e-mail…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="filter-select" value={fPerfil} onChange={(e) => setFPerfil(e.target.value)}>
          <option value="">Todos os perfis</option>
          {Object.values(PerfilUsuario).map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {isAdmin && (
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setEditing({})}>+ Novo usuário</button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <div className="empty"><div className="hex" aria-hidden="true">∅</div><p>Nenhum usuário encontrado.</p></div>
      ) : (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Departamento</th>
                <th>Criado em</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u._id}>
                  <td><strong>{u.nome}</strong>{u._id === user._id && <span className="badge" style={{ marginLeft: '0.5rem', background: 'var(--red)', color: '#fff' }}>você</span>}</td>
                  <td className="muted">{u.email}</td>
                  <td>{u.perfil}</td>
                  <td>{u.departamento || '—'}</td>
                  <td className="muted text-sm">{formatDate(u.criado_em)}</td>
                  <td>
                    <div className="row gap-sm" style={{ justifyContent: 'flex-end' }}>
                      {(() => {
                        const podeEditar = isAdmin || u.perfil !== PerfilUsuario.Admin
                        if (!podeEditar) return null
                        return (
                          <button
                            className="icon-action"
                            onClick={() => setEditing(u)}
                            title="Editar"
                            aria-label={`Editar ${u.nome}`}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                          </button>
                        )
                      })()}
                      <button
                        className="icon-action danger"
                        onClick={() => setConfirmDel(u)}
                        title={u._id === user._id ? 'Não é possível excluir a si mesmo' : 'Excluir'}
                        aria-label={`Excluir ${u.nome}`}
                        disabled={u._id === user._id}
                        style={isAdmin ? undefined : { display: 'none' }}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <UsuarioForm
          usuario={editing._id ? editing : null}
          isAdmin={isAdmin}
          emailEmUso={emailEmUso}
          onCancel={() => setEditing(null)}
          onSave={(data) => {
            // Gestores não podem alterar administradores nem promover a Admin
            if (!isAdmin) {
              const alvoEhAdmin = editing._id && editing.perfil === PerfilUsuario.Admin
              if (alvoEhAdmin || data.perfil === PerfilUsuario.Admin) { setEditing(null); return }
            }
            if (editing._id) atualizarUsuario(editing._id, data)
            else criarUsuario(data)
            setEditing(null)
          }}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Excluir usuário"
          message={`Deseja excluir "${confirmDel.nome}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setConfirmDel(null)}
          onConfirm={() => { excluirUsuario(confirmDel._id); setConfirmDel(null) }}
        />
      )}
    </div>
  )
}

function UsuarioForm({ usuario, isAdmin, emailEmUso, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    nome: usuario?.nome || '',
    email: usuario?.email || '',
    perfil: usuario?.perfil || PerfilUsuario.Membro,
    departamento: usuario?.departamento || '',
    senha: '',
  }))
  const [err, setErr] = useState({})
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e) => {
    e.preventDefault()
    const er = {}
    if (!form.nome.trim()) er.nome = 'Informe o nome.'
    if (!form.email.trim()) er.email = 'Informe o e-mail.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) er.email = 'E-mail inválido.'
    else if (emailEmUso(form.email, usuario?._id)) er.email = 'Este e-mail já está em uso.'
    if (!usuario && !form.senha) er.senha = 'Informe a senha.'
    else if (form.senha && form.senha.length < 6) er.senha = 'A senha deve ter ao menos 6 caracteres.'
    setErr(er)
    if (Object.keys(er).length) return
    onSave({ ...form, email: form.email.trim(), nome: form.nome.trim() })
  }

  return (
    <Modal
      title={usuario ? 'Editar usuário' : 'Novo usuário'}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit}>{usuario ? 'Salvar' : 'Criar usuário'}</button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className={'field' + (err.nome ? ' error' : '')}>
          <label>Nome *</label>
          <input value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Ana Figueiredo" />
          {err.nome && <span className="error-msg">{err.nome}</span>}
        </div>

        <div className={'field' + (err.email ? ' error' : '')}>
          <label>E-mail *</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="usuario@tecnosystem.com" />
          {err.email && <span className="error-msg">{err.email}</span>}
        </div>

        <div className="two-col">
          <div className="field">
            <label>Perfil</label>
            <select value={form.perfil} onChange={(e) => set('perfil', e.target.value)}>
              {Object.values(PerfilUsuario)
                .filter((p) => isAdmin || p !== PerfilUsuario.Admin)
                .map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Departamento</label>
            <input value={form.departamento} onChange={(e) => set('departamento', e.target.value)} placeholder="Ex.: Engenharia" />
          </div>
        </div>

        <div className={'field' + (err.senha ? ' error' : '')}>
          <label>{usuario ? 'Nova senha' : 'Senha *'}</label>
          <input
            type="password"
            value={form.senha}
            onChange={(e) => set('senha', e.target.value)}
            placeholder={usuario ? 'Deixe em branco para manter a atual' : 'Mínimo 6 caracteres'}
            autoComplete="new-password"
          />
          {err.senha && <span className="error-msg">{err.senha}</span>}
        </div>
      </form>
    </Modal>
  )
}
