import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  CategoriaTreinamento, CATEGORIA_LABEL,
  STATUS_MATRICULA_LABEL, PerfilUsuario,
} from '../data/enums.js'
import { formatDate, uid } from '../utils/helpers.js'
import { Modal, ConfirmDialog } from '../components/Modal.jsx'
import './pages.css'

export default function Treinamentos() {
  const {
    treinamentos, matriculas, getUsuario,
    criarTreinamento, atualizarTreinamento, excluirTreinamento,
    matricular, toggleModuloConcluido,
  } = useData()
  const { user } = useAuth()
  const podeGerenciar = user?.perfil === PerfilUsuario.Admin || user?.perfil === PerfilUsuario.Gestor
  const isAdmin = user?.perfil === PerfilUsuario.Admin

  const [aba, setAba] = useState('catalogo') // catalogo | aluno
  const [q, setQ] = useState('')
  const [fCat, setFCat] = useState('')
  const [editing, setEditing] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const filtrados = useMemo(() => {
    return treinamentos.filter((t) => {
      if (q && !t.titulo.toLowerCase().includes(q.toLowerCase())) return false
      if (fCat && t.categoria !== fCat) return false
      return true
    })
  }, [treinamentos, q, fCat])

  // enrollments of current user
  const minhasMatriculas = matriculas.filter((m) => m.aluno_id === user?._id)

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="kicker">Capacitação</span>
          <h1>Treinamentos</h1>
          <p className="sub">Explore o catálogo de cursos e acompanhe sua trilha de aprendizado.</p>
        </div>
      </div>

      <div className="tabs">
        <button className={'tab' + (aba === 'catalogo' ? ' active' : '')} onClick={() => setAba('catalogo')}>Catálogo</button>
        <button className={'tab' + (aba === 'aluno' ? ' active' : '')} onClick={() => setAba('aluno')}>Minha trilha</button>
      </div>

      {aba === 'catalogo' ? (
        <>
          <div className="toolbar">
            <div className="search">
              <input placeholder="Buscar curso…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="filter-select" value={fCat} onChange={(e) => setFCat(e.target.value)}>
              <option value="">Todas as categorias</option>
              {Object.values(CategoriaTreinamento).map((c) => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
            </select>
            {podeGerenciar && (
              <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setEditing({})}>+ Novo treinamento</button>
            )}
          </div>

          {filtrados.length === 0 ? (
            <div className="empty"><div className="hex" aria-hidden="true">∅</div><p>Nenhum curso encontrado.</p></div>
          ) : (
            <div className="course-grid stagger">
              {filtrados.map((t) => {
                const instrutor = getUsuario(t.instrutor_id)
                const matriculado = minhasMatriculas.some((m) => m.treinamento_id === t._id)
                return (
                  <article key={t._id} className="card course-card">
                    <span className="cc-cat cc-cat-text">{CATEGORIA_LABEL[t.categoria]}</span>
                    <h4>{t.titulo}</h4>
                    <p className="cc-desc">{t.descricao}</p>
                    <div className="row gap-lg text-xs wrap" style={{ color: 'var(--red)', fontWeight: 600 }}>
                      <span className="row gap-sm" style={{ alignItems: 'center' }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="9" />
                          <polyline points="12 7 12 12 15.5 14" />
                        </svg>
                        {t.carga_horaria}h
                      </span>
                      <span className="row gap-sm" style={{ alignItems: 'center' }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 22 8.5 12 15 2 8.5 12 2" />
                          <polyline points="2 15.5 12 22 22 15.5" />
                        </svg>
                        {t.modulos.length} módulos
                      </span>
                    </div>
                    <div className="row gap-sm text-xs muted">
                      <span>Instrutor: {instrutor?.nome}</span>
                    </div>
                    <div className="row gap-sm wrap" style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
                      <button
                        className={'btn btn-sm ' + (matriculado ? 'btn-ghost' : 'btn-primary')}
                        disabled={matriculado}
                        onClick={() => { matricular(user._id, t._id); setAba('aluno') }}
                      >
                        {matriculado ? '✓ Matriculado' : 'Matricular-me'}
                      </button>
                      {(isAdmin || t.instrutor_id === user?._id) && (
                        <>
                          <button className="icon-action" onClick={() => setEditing(t)} title="Editar" aria-label="Editar treinamento">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                          </button>
                          <button className="icon-action danger" onClick={() => setConfirmDel(t)} title="Excluir" aria-label="Excluir treinamento">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <AreaAluno
          matriculas={minhasMatriculas}
          treinamentos={treinamentos}
          onToggle={toggleModuloConcluido}
        />
      )}

      {editing && (
        <TreinamentoForm
          treinamento={editing._id ? editing : null}
          currentUser={user}
          onCancel={() => setEditing(null)}
          onSave={(data) => {
            if (editing._id) atualizarTreinamento(editing._id, data)
            else criarTreinamento(data)
            setEditing(null)
          }}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          title="Excluir treinamento"
          message={`Excluir "${confirmDel.titulo}"? As matrículas associadas serão removidas.`}
          confirmLabel="Excluir"
          onCancel={() => setConfirmDel(null)}
          onConfirm={() => { excluirTreinamento(confirmDel._id); setConfirmDel(null) }}
        />
      )}
    </div>
  )
}

/* ---------------- Student area ---------------- */
function AreaAluno({ matriculas, treinamentos, onToggle }) {
  if (matriculas.length === 0) {
    return (
      <div className="empty">
        <div className="hex" aria-hidden="true">✦</div>
        <p>Você ainda não está matriculado em nenhum treinamento.<br />Explore o catálogo para começar sua trilha.</p>
      </div>
    )
  }
  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {matriculas.map((m) => {
        const tr = treinamentos.find((t) => t._id === m.treinamento_id)
        if (!tr) return null
        const total = tr.modulos.length
        const concluido = m.percentual_progresso === 100
        return (
          <article key={m._id} className="card panel">
            <div className="panel-head">
              <div>
                <span className="cc-cat-text">{CATEGORIA_LABEL[tr.categoria]}</span>
                <h3 style={{ marginTop: '0.5rem' }}>{tr.titulo}</h3>
              </div>
              <span className={'status-pill status-pill-' + m.status}>
                {STATUS_MATRICULA_LABEL[m.status]}
              </span>
            </div>

            <div className="row between text-xs muted" style={{ marginBottom: '0.3rem' }}>
              <span>Progresso</span><span>{m.percentual_progresso}%</span>
            </div>
            <div className="progress" style={{ marginBottom: '1rem' }}><span style={{ width: m.percentual_progresso + '%' }} /></div>

            <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem', color: 'var(--ink-3)' }}>Módulos</h4>
            <ul className="module-list">
              {tr.modulos.map((mod) => {
                const done = m.modulos_concluidos.includes(mod.id)
                return (
                  <li key={mod.id} className="module-row">
                    <input type="checkbox" checked={done} onChange={() => onToggle(m._id, mod.id, total)} style={{ width: 18, height: 18, accentColor: 'var(--red)' }} />
                    <span className="grow" style={done ? { textDecoration: 'line-through', color: 'var(--muted)' } : {}}>{mod.titulo}</span>
                  </li>
                )
              })}
            </ul>

            {concluido && (
              <div className="cert-banner" style={{ marginTop: '1.25rem' }}>
                <div className="hex" aria-hidden="true">★</div>
                <div className="grow">
                  <strong style={{ fontFamily: 'var(--font-display)', display: 'block' }}>Certificado disponível!</strong>
                  <span className="text-xs" style={{ color: 'rgba(243,238,217,0.75)' }}>
                    Concluído em {formatDate(m.concluido_em)} · Carga: {tr.carga_horaria}h
                  </span>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => emitirCertificado(tr, m)}>Emitir certificado</button>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

function emitirCertificado(tr, m) {
  const win = window.open('', '_blank')
  if (!win) { alert('Permita pop-ups para visualizar o certificado.'); return }
  win.document.write(`
    <html><head><title>Certificado — ${tr.titulo}</title>
    <style>
      body{font-family:Georgia,serif;background:#f2f2f2;margin:0;padding:40px;}
      .cert{max-width:800px;margin:0 auto;background:#fff;border:10px solid #cc2f25;padding:60px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.15)}
      h1{font-size:40px;color:#1e1e1e;margin:0 0 8px;letter-spacing:1px}
      .kick{color:#cc2f25;text-transform:uppercase;letter-spacing:4px;font-size:13px;font-weight:bold}
      .big{font-size:28px;margin:30px 0 10px}
      .muted{color:#6c6c6c}
      hr{border:none;border-top:2px solid #f3eed9;margin:30px 0}
    </style></head><body>
    <div class="cert">
      <div class="kick">Tecno System · Training and Management</div>
      <h1>Certificado de Conclusão</h1>
      <p class="muted">Certificamos que o(a) aluno(a) concluiu com êxito o treinamento</p>
      <div class="big">${tr.titulo}</div>
      <p class="muted">Categoria: ${CATEGORIA_LABEL[tr.categoria]} · Carga horária: ${tr.carga_horaria} horas</p>
      <hr/>
      <p class="muted">Concluído em ${formatDate(m.concluido_em)}</p>
      <p style="margin-top:40px">__________________________<br/><strong>Tecno System</strong></p>
    </div>
    <script>window.print&&setTimeout(()=>window.print(),300)</script>
    </body></html>`)
  win.document.close()
}

/* ---------------- Create / edit training form ---------------- */
function TreinamentoForm({ treinamento, currentUser, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    titulo: treinamento?.titulo || '',
    descricao: treinamento?.descricao || '',
    categoria: treinamento?.categoria || CategoriaTreinamento.Tecnico,
    carga_horaria: treinamento?.carga_horaria ?? 8,
    instrutor_id: treinamento?.instrutor_id || currentUser?._id,
    modulos: treinamento?.modulos ? treinamento.modulos.map((m) => ({ ...m })) : [],
  }))
  const [modInput, setModInput] = useState('')
  const [err, setErr] = useState({})
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const addMod = () => {
    const v = modInput.trim()
    if (v) set('modulos', [...form.modulos, { id: uid(), titulo: v }])
    setModInput('')
  }

  const submit = (e) => {
    e.preventDefault()
    const er = {}
    if (!form.titulo.trim()) er.titulo = 'Informe o título.'
    if (form.carga_horaria <= 0) er.carga_horaria = 'Carga horária inválida.'
    if (form.modulos.length === 0) er.modulos = 'Adicione ao menos um módulo.'
    setErr(er)
    if (Object.keys(er).length) return
    onSave({ ...form, carga_horaria: Number(form.carga_horaria) })
  }

  return (
    <Modal
      title={treinamento ? 'Editar treinamento' : 'Novo treinamento'}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit}>{treinamento ? 'Salvar' : 'Criar'}</button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className={'field' + (err.titulo ? ' error' : '')}>
          <label>Título *</label>
          <input value={form.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ex.: React do Zero ao Avançado" />
          {err.titulo && <span className="error-msg">{err.titulo}</span>}
        </div>
        <div className="field">
          <label>Descrição</label>
          <textarea value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
        </div>
        <div className="two-col">
          <div className="field">
            <label>Categoria</label>
            <select value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
              {Object.values(CategoriaTreinamento).map((c) => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
            </select>
          </div>
          <div className={'field' + (err.carga_horaria ? ' error' : '')}>
            <label>Carga horária (h)</label>
            <input type="number" min="1" value={form.carga_horaria} onChange={(e) => set('carga_horaria', e.target.value)} />
            {err.carga_horaria && <span className="error-msg">{err.carga_horaria}</span>}
          </div>
        </div>

        <div className={'field' + (err.modulos ? ' error' : '')}>
          <label>Módulos *</label>
          <div className="row gap-sm">
            <input className="grow" value={modInput} onChange={(e) => setModInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMod() } }} placeholder="Título do módulo + Enter" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={addMod}>Adicionar</button>
          </div>
          {err.modulos && <span className="error-msg">{err.modulos}</span>}
          <div style={{ marginTop: '0.5rem' }}>
            {form.modulos.map((m, i) => (
              <div key={m.id} className="check-item">
                <span className="grow">{i + 1}. {m.titulo}</span>
                <button type="button" className="icon-btn" onClick={() => set('modulos', form.modulos.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  )
}
