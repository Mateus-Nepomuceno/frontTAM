import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  StatusProjeto, SaudeProjeto, STATUS_PROJETO_LABEL,
  SAUDE_LABEL, SAUDE_BADGE, PerfilUsuario,
} from '../data/enums.js'
import { formatDate, daysUntil } from '../utils/helpers.js'
import { Modal, ConfirmDialog } from '../components/Modal.jsx'
import './pages.css'

const STATUS_BADGE = {
  Planejamento: 'badge-blue',
  Ativo: 'badge-ok',
  Pausado: 'badge-warn',
  Concluido: 'badge-ink',
  Cancelado: 'badge-danger',
}

export default function Projetos() {
  const { projetos, usuarios, getUsuario, criarProjeto, atualizarProjeto, excluirProjeto, toggleMarco } = useData()
  const { user } = useAuth()
  const podeGerenciar = user?.perfil === PerfilUsuario.Admin || user?.perfil === PerfilUsuario.Gestor
  const veTudo = user?.perfil === PerfilUsuario.Admin

  const [q, setQ] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fSaude, setFSaude] = useState('')
  const [detalheId, setDetalheId] = useState(null)
  const [editing, setEditing] = useState(null) // null | {} (novo) | projeto
  const [confirmDel, setConfirmDel] = useState(null)

  const filtrados = useMemo(() => {
    return projetos.filter((p) => {
      // Apenas Admin vê todos; demais veem só os projetos dos quais participam
      if (!veTudo) {
        const participa = p.responsavel_id === user?._id || p.membros_equipe.includes(user?._id)
        if (!participa) return false
      }
      if (q && !p.nome.toLowerCase().includes(q.toLowerCase()) && !p.descricao.toLowerCase().includes(q.toLowerCase())) return false
      if (fStatus && p.status !== fStatus) return false
      if (fSaude && p.saude_projeto !== fSaude) return false
      return true
    })
  }, [projetos, q, fStatus, fSaude, veTudo, user])

  const detalhe = projetos.find((p) => p._id === detalheId)

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="kicker">Portfólio</span>
          <h1>Gestão de Projetos</h1>
          <p className="sub">Busque, filtre por status e saúde, e gerencie o ciclo de vida dos projetos.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search">
          <input placeholder="Buscar por nome ou descrição…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="filter-select" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.values(StatusProjeto).map((s) => <option key={s} value={s}>{STATUS_PROJETO_LABEL[s]}</option>)}
        </select>
        <select className="filter-select" value={fSaude} onChange={(e) => setFSaude(e.target.value)}>
          <option value="">Toda a saúde</option>
          {Object.values(SaudeProjeto).map((s) => <option key={s} value={s}>{SAUDE_LABEL[s]}</option>)}
        </select>
        {podeGerenciar && (
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setEditing({})}>+ Novo projeto</button>
        )}
      </div>

      {/* Cards */}
      {filtrados.length === 0 ? (
        <div className="empty"><div className="hex" aria-hidden="true">∅</div><p>Nenhum projeto encontrado com esses filtros.</p></div>
      ) : (
        <div className="proj-grid stagger">
          {filtrados.map((p) => {
            const resp = getUsuario(p.responsavel_id)
            return (
              <article key={p._id} className="card proj-card" onClick={() => setDetalheId(p._id)}>
                <div className="pc-head">
                  <h4>{p.nome}</h4>
                  <span className={'status-ball status-ball-' + p.status} title={STATUS_PROJETO_LABEL[p.status]} aria-label={STATUS_PROJETO_LABEL[p.status]} />
                </div>
                <p className="pc-desc">{p.descricao}</p>

                <div>
                  <div className="row between text-xs muted" style={{ marginBottom: '0.3rem' }}>
                    <span>Progresso</span><span>{p.percentual_progresso}%</span>
                  </div>
                  <div className="progress"><span style={{ width: p.percentual_progresso + '%' }} /></div>
                </div>

                <div className="pc-foot">
                  <div className="row gap-sm">
                    <span className="text-xs muted">{resp?.nome}</span>
                  </div>
                  <span className="text-xs muted">Entrega {formatDate(p.data_entrega)}</span>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Detail drawer */}
      {detalhe && (
        <ProjetoDrawer
          projeto={detalhe}
          responsavel={getUsuario(detalhe.responsavel_id)}
          membros={detalhe.membros_equipe.map(getUsuario)}
          podeGerenciar={podeGerenciar}
          onClose={() => setDetalheId(null)}
          onToggleMarco={(i) => toggleMarco(detalhe._id, i)}
          onEdit={() => { setEditing(detalhe); setDetalheId(null) }}
          onDelete={() => { setConfirmDel(detalhe); setDetalheId(null) }}
        />
      )}

      {/* Create / edit modal */}
      {editing && (
        <ProjetoForm
          projeto={editing._id ? editing : null}
          usuarios={usuarios}
          currentUser={user}
          onCancel={() => setEditing(null)}
          onSave={(data) => {
            if (editing._id) atualizarProjeto(editing._id, data)
            else criarProjeto(data)
            setEditing(null)
          }}
        />
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <ConfirmDialog
          title="Excluir projeto"
          message={`Tem certeza que deseja excluir "${confirmDel.nome}"? As tarefas vinculadas também serão removidas. Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setConfirmDel(null)}
          onConfirm={() => { excluirProjeto(confirmDel._id); setConfirmDel(null) }}
        />
      )}
    </div>
  )
}

/* ---------------- Detail drawer ---------------- */
function ProjetoDrawer({ projeto, responsavel, membros, podeGerenciar, onClose, onToggleMarco, onEdit, onDelete }) {
  const dias = daysUntil(projeto.data_entrega)
  return (
    <div className="drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer">
        <header className="drawer-head">
          <div className="row-close">
            <span className={'badge badge-solid ' + STATUS_BADGE[projeto.status]}>{STATUS_PROJETO_LABEL[projeto.status]}</span>
            <button className="icon-btn" onClick={onClose} aria-label="Fechar" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>×</button>
          </div>
          <h2>{projeto.nome}</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>{projeto.descricao}</p>
          <div className="row gap wrap" style={{ marginTop: '1rem' }}>
            <span className={'badge badge-solid ' + SAUDE_BADGE[projeto.saude_projeto]}>{SAUDE_LABEL[projeto.saude_projeto]}</span>
            <span className="badge" style={{ background: '#fff', color: 'var(--ink)' }}>{projeto.percentual_progresso}% concluído</span>
          </div>
        </header>

        <div className="drawer-body">
          <div className="two-col" style={{ marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '0.85rem' }}>
              <div className="text-xs muted">Início</div>
              <strong>{formatDate(projeto.data_inicio)}</strong>
            </div>
            <div className="card" style={{ padding: '0.85rem' }}>
              <div className="text-xs muted">Entrega</div>
              <strong>{formatDate(projeto.data_entrega)}</strong>
              <div className={'text-xs' + (dias < 0 ? ' overdue' : ' muted')}>
                {dias < 0 ? `${Math.abs(dias)}d atrasado` : `${dias}d restantes`}
              </div>
            </div>
          </div>

          <div className="drawer-section">
            <h4>Equipe</h4>
            <div className="row gap-sm wrap">
              <span className="badge badge-solid badge-danger">Responsável: {responsavel?.nome}</span>
              {membros.filter(Boolean).map((m) => (
                <span key={m._id} className="badge badge-ink">{m.nome}</span>
              ))}
            </div>
          </div>

          <div className="drawer-section">
            <h4>Checklist de marcos</h4>
            {projeto.marcos.length === 0 && <p className="muted text-sm">Sem marcos cadastrados.</p>}
            {projeto.marcos.map((m, i) => (
              <label key={i} className={'check-item' + (m.concluido ? ' done' : '')}>
                <input type="checkbox" checked={m.concluido} onChange={() => onToggleMarco(i)} />
                <span>{m.titulo}</span>
              </label>
            ))}
          </div>

          <div className="drawer-section">
            <h4>Linha do tempo de status</h4>
            <ul className="timeline">
              {projeto.historico_status.map((h, i) => (
                <li key={i}>
                  <div className="tl-status">{STATUS_PROJETO_LABEL[h.status] || h.status}</div>
                  <div className="tl-date">{formatDate(h.data)} · {h.nota}</div>
                </li>
              ))}
            </ul>
          </div>

          {podeGerenciar && (
            <div className="row gap">
              <button className="btn btn-dark grow" onClick={onEdit}>Editar</button>
              <button className="btn btn-danger" onClick={onDelete}>Excluir</button>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

/* ---------------- Create / edit form ---------------- */
function ProjetoForm({ projeto, usuarios, currentUser, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    nome: projeto?.nome || '',
    descricao: projeto?.descricao || '',
    status: projeto?.status || StatusProjeto.Planejamento,
    saude_projeto: projeto?.saude_projeto || SaudeProjeto.NoPrazo,
    percentual_progresso: projeto?.percentual_progresso ?? 0,
    responsavel_id: projeto?.responsavel_id || currentUser?._id || usuarios[0]?._id,
    data_inicio: toInputDate(projeto?.data_inicio),
    data_entrega: toInputDate(projeto?.data_entrega),
  }))
  const [err, setErr] = useState({})

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e) => {
    e.preventDefault()
    const er = {}
    if (!form.nome.trim()) er.nome = 'Informe o nome do projeto.'
    if (form.percentual_progresso < 0 || form.percentual_progresso > 100) er.percentual_progresso = '0 a 100.'
    setErr(er)
    if (Object.keys(er).length) return
    onSave({
      ...form,
      percentual_progresso: Number(form.percentual_progresso),
      data_inicio: form.data_inicio ? new Date(form.data_inicio).toISOString() : new Date().toISOString(),
      data_entrega: form.data_entrega ? new Date(form.data_entrega).toISOString() : new Date().toISOString(),
      membros_equipe: projeto?.membros_equipe || [form.responsavel_id],
      marcos: projeto?.marcos || [],
    })
  }

  return (
    <Modal
      title={projeto ? 'Editar projeto' : 'Novo projeto'}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit}>{projeto ? 'Salvar' : 'Criar projeto'}</button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className={'field' + (err.nome ? ' error' : '')}>
          <label>Nome *</label>
          <input value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Portal do Cliente 2.0" />
          {err.nome && <span className="error-msg">{err.nome}</span>}
        </div>

        <div className="field">
          <label>Descrição</label>
          <textarea value={form.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Objetivo do projeto…" />
        </div>

        <div className="two-col">
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {Object.values(StatusProjeto).map((s) => <option key={s} value={s}>{STATUS_PROJETO_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Saúde</label>
            <select value={form.saude_projeto} onChange={(e) => set('saude_projeto', e.target.value)}>
              {Object.values(SaudeProjeto).map((s) => <option key={s} value={s}>{SAUDE_LABEL[s]}</option>)}
            </select>
          </div>
        </div>

        <div className="two-col">
          <div className="field">
            <label>Responsável</label>
            <select value={form.responsavel_id} onChange={(e) => set('responsavel_id', e.target.value)}>
              {usuarios.map((u) => <option key={u._id} value={u._id}>{u.nome}</option>)}
            </select>
          </div>
          <div className={'field' + (err.percentual_progresso ? ' error' : '')}>
            <label>Progresso (%)</label>
            <input type="number" min="0" max="100" value={form.percentual_progresso} onChange={(e) => set('percentual_progresso', e.target.value)} />
            {err.percentual_progresso && <span className="error-msg">{err.percentual_progresso}</span>}
          </div>
        </div>

        <div className="two-col">
          <div className="field">
            <label>Data de início</label>
            <input type="date" value={form.data_inicio} onChange={(e) => set('data_inicio', e.target.value)} />
          </div>
          <div className="field">
            <label>Data de entrega</label>
            <input type="date" value={form.data_entrega} onChange={(e) => set('data_entrega', e.target.value)} />
          </div>
        </div>
      </form>
    </Modal>
  )
}

function toInputDate(iso) {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10)
}
