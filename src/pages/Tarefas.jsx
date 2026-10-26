import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  COLUNAS_ORDER, COLUNA_LABEL, ColunaQuadro,
  PrioridadeTarefa, PRIORIDADE_LABEL, PRIORIDADE_ORDER, PerfilUsuario,
} from '../data/enums.js'
import { formatDate, formatDateShort, daysUntil } from '../utils/helpers.js'
import { Modal, ConfirmDialog } from '../components/Modal.jsx'
import './pages.css'

// priority -> accent color (matches .tcard.prio-* borders)
const PRIORIDADE_COR = {
  Urgente: 'var(--red)',
  Alta: 'var(--warn)',
  Media: '#2b6cb0',
  Baixa: 'var(--cream-deep)',
}
// text color that stays legible over each priority background
const PRIORIDADE_COR_TEXTO = {
  Urgente: '#fff',
  Alta: '#fff',
  Media: '#fff',
  Baixa: 'var(--ink)',
}

export default function Tarefas() {
  const {
    tarefas, projetos, usuarios, getUsuario,
    criarTarefa, atualizarTarefa, moverTarefa, excluirTarefa,
    adicionarComentario, toggleChecklistTarefa,
  } = useData()
  const { user } = useAuth()
  const podeGerenciar = user?.perfil === PerfilUsuario.Admin || user?.perfil === PerfilUsuario.Gestor

  // Projects the user may see: all (admin/gestor) or only ones they participate in
  const meusProjetos = podeGerenciar
    ? projetos
    : projetos.filter((p) => p.responsavel_id === user?._id || p.membros_equipe.includes(user?._id))

  const [fProjeto, setFProjeto] = useState(() => meusProjetos[0]?._id || '')
  const [fResp, setFResp] = useState('')
  const [fEtiqueta, setFEtiqueta] = useState('')
  const [fPrio, setFPrio] = useState('')
  const [abertaId, setAbertaId] = useState(null)
  const [editing, setEditing] = useState(null) // null | {} | tarefa
  const [confirmDel, setConfirmDel] = useState(null)
  const [dragCol, setDragCol] = useState(null)

  const etiquetas = useMemo(() => {
    const set = new Set()
    tarefas.forEach((t) => t.etiquetas.forEach((e) => set.add(e)))
    return [...set].sort()
  }, [tarefas])

  // People belonging to the selected project (responsável + equipe)
  const membrosProjeto = useMemo(() => {
    const proj = projetos.find((p) => p._id === fProjeto)
    if (!proj) return []
    const ids = new Set([proj.responsavel_id, ...proj.membros_equipe])
    return usuarios.filter((u) => ids.has(u._id))
  }, [projetos, usuarios, fProjeto])

  const filtradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (fProjeto && t.projeto_id !== fProjeto) return false
      if (fResp && t.atribuido_para_id !== fResp) return false
      if (fEtiqueta && !t.etiquetas.includes(fEtiqueta)) return false
      if (fPrio && t.prioridade !== fPrio) return false
      return true
    })
  }, [tarefas, fProjeto, fResp, fEtiqueta, fPrio])

  const porColuna = (col) =>
    filtradas
      .filter((t) => t.coluna_quadro === col)
      .sort((a, b) => PRIORIDADE_ORDER[a.prioridade] - PRIORIDADE_ORDER[b.prioridade])

  const aberta = tarefas.find((t) => t._id === abertaId)
  const onDrop = (col) => {
    if (dragCol && dragCol.col !== col) moverTarefa(dragCol.id, col)
    setDragCol(null)
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="kicker">Fluxo de trabalho</span>
          <h1>Quadro de Tarefas</h1>
          <p className="sub">Arraste cards entre colunas ou use os atalhos para mudar o status rapidamente.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <select className="filter-select" value={fProjeto} onChange={(e) => { setFProjeto(e.target.value); setFResp('') }}>
          {meusProjetos.map((p) => <option key={p._id} value={p._id}>{p.nome}</option>)}
        </select>
        <select className="filter-select" value={fResp} onChange={(e) => setFResp(e.target.value)}>
          <option value="">Todos os responsáveis</option>
          {membrosProjeto.map((u) => <option key={u._id} value={u._id}>{u.nome}</option>)}
        </select>
        <select className="filter-select" value={fEtiqueta} onChange={(e) => setFEtiqueta(e.target.value)}>
          <option value="">Todas as etiquetas</option>
          {etiquetas.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select className="filter-select" value={fPrio} onChange={(e) => setFPrio(e.target.value)}>
          <option value="">Toda prioridade</option>
          {Object.values(PrioridadeTarefa).map((p) => <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>)}
        </select>
        {(fResp || fEtiqueta || fPrio) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFResp(''); setFEtiqueta(''); setFPrio('') }}>
            Limpar filtros
          </button>
        )}
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setEditing({})}>+ Nova tarefa</button>
      </div>

      {/* Board */}
      <div className="board">
        {COLUNAS_ORDER.map((col) => {
          const cards = porColuna(col)
          return (
            <section
              key={col}
              className={'column' + (dragCol && dragCol.overCol === col ? ' drag-over' : '')}
              onDragOver={(e) => { e.preventDefault(); setDragCol((d) => d ? { ...d, overCol: col } : d) }}
              onDrop={() => onDrop(col)}
            >
              <div className="column-head">
                <h4>{COLUNA_LABEL[col]}</h4>
                <span className="column-count">{cards.length}</span>
              </div>
              <div className="column-body">
                {cards.map((t) => {
                  const resp = getUsuario(t.atribuido_para_id)
                  const doneCheck = t.checklist.filter((c) => c.concluido).length
                  const concluida = t.coluna_quadro === ColunaQuadro.Concluido
                  const diasRest = daysUntil(t.data_entrega)
                  const atrasada = !concluida && diasRest !== null && diasRest < 0
                  const corTitulo = concluida ? '#2f9e44' : atrasada ? 'var(--red)' : PRIORIDADE_COR[t.prioridade]
                  const corTituloTexto = concluida || atrasada ? '#fff' : PRIORIDADE_COR_TEXTO[t.prioridade]
                  return (
                    <article
                      key={t._id}
                      className={'tcard prio-' + t.prioridade}
                      draggable
                      onDragStart={() => setDragCol({ id: t._id, col })}
                      onDragEnd={() => setDragCol(null)}
                      onClick={() => setAbertaId(t._id)}
                    >
                      <h5 style={{ background: corTitulo, color: corTituloTexto }}>{t.titulo}</h5>
                      {t.etiquetas.length > 0 && (
                        <div className="tags">{t.etiquetas.map((e) => <span key={e} className="tag">{e}</span>)}</div>
                      )}
                      <div className="tc-foot">
                        <span className="text-xs muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{resp?.nome}</span>
                        <div className="row gap-sm text-xs muted">
                          {t.data_entrega && (
                            <span className="row" style={{ alignItems: 'center', gap: '0.25rem' }}>
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="9" />
                                <polyline points="12 7 12 12 15.5 14" />
                              </svg>
                              {formatDateShort(t.data_entrega)}
                            </span>
                          )}
                          {t.checklist.length > 0 && <span>☑ {doneCheck}/{t.checklist.length}</span>}
                          {t.comentarios.length > 0 && (
                            <span className="row" style={{ alignItems: 'center', gap: '0.25rem' }} aria-label={`${t.comentarios.length} comentários`}>
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                              {t.comentarios.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
                {cards.length === 0 && <p className="text-xs muted" style={{ textAlign: 'center', padding: '1rem 0' }}>Vazio</p>}
              </div>
            </section>
          )
        })}
      </div>

      {/* Task detail modal */}
      {aberta && (
        <TarefaDetalhe
          tarefa={aberta}
          responsavel={getUsuario(aberta.atribuido_para_id)}
          getUsuario={getUsuario}
          currentUser={user}
          onClose={() => setAbertaId(null)}
          onToggleCheck={(i) => toggleChecklistTarefa(aberta._id, i)}
          onComment={(txt) => adicionarComentario(aberta._id, user._id, txt)}
          onEdit={() => { setEditing(aberta); setAbertaId(null) }}
          onDelete={() => { setConfirmDel(aberta); setAbertaId(null) }}
          onMove={(col) => moverTarefa(aberta._id, col)}
        />
      )}

      {/* Create / edit */}
      {editing && (
        <TarefaForm
          tarefa={editing._id ? editing : null}
          projetos={meusProjetos}
          usuarios={usuarios}
          currentUser={user}
          onCancel={() => setEditing(null)}
          onSave={(data) => {
            if (editing._id) atualizarTarefa(editing._id, data)
            else criarTarefa({ ...data, criado_por_id: user._id })
            setEditing(null)
          }}
        />
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <ConfirmDialog
          title="Excluir tarefa"
          message={`Deseja excluir a tarefa "${confirmDel.titulo}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setConfirmDel(null)}
          onConfirm={() => { excluirTarefa(confirmDel._id); setConfirmDel(null) }}
        />
      )}
    </div>
  )
}

/* ---------------- Task detail modal ---------------- */
function TarefaDetalhe({ tarefa, responsavel, getUsuario, currentUser, onClose, onToggleCheck, onComment, onEdit, onDelete, onMove }) {
  const [comentario, setComentario] = useState('')
  const doneCheck = tarefa.checklist.filter((c) => c.concluido).length
  const checklistPct = tarefa.checklist.length ? Math.round((doneCheck / tarefa.checklist.length) * 100) : 0

  const enviar = () => {
    if (!comentario.trim()) return
    onComment(comentario.trim())
    setComentario('')
  }

  return (
    <Modal
      title={tarefa.titulo}
      onClose={onClose}
      maxWidth={640}
      headColor={PRIORIDADE_COR[tarefa.prioridade]}
      headText={PRIORIDADE_COR_TEXTO[tarefa.prioridade]}
      footer={
        <>
          <button className="btn btn-danger" onClick={onDelete} style={{ marginRight: 'auto' }}>Excluir</button>
          <button className="btn btn-ghost" onClick={onClose}>Fechar</button>
          <button className="btn btn-dark" onClick={onEdit}>Editar</button>
        </>
      }
    >
      <div className="row gap-sm wrap" style={{ marginBottom: '1rem' }}>
        {tarefa.etiquetas.map((e) => <span key={e} className="tag">{e}</span>)}
      </div>

      {tarefa.descricao && <p className="text-sm" style={{ marginBottom: '1rem' }}>{tarefa.descricao}</p>}

      <div className="two-col" style={{ marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '0.75rem' }}>
          <div className="text-xs muted">Responsável</div>
          <div className="row gap-sm" style={{ marginTop: '0.3rem' }}><strong className="text-sm">{responsavel?.nome}</strong></div>
        </div>
        <div className="card" style={{ padding: '0.75rem' }}>
          <div className="text-xs muted">Entrega</div>
          <strong className="text-sm">{formatDate(tarefa.data_entrega)}</strong>
        </div>
      </div>

      {/* Status quick move */}
      <div className="field">
        <label>Mover para coluna</label>
        <select value={tarefa.coluna_quadro} onChange={(e) => onMove(e.target.value)}>
          {COLUNAS_ORDER.map((c) => <option key={c} value={c}>{COLUNA_LABEL[c]}</option>)}
        </select>
      </div>

      {/* Checklist */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div className="row between" style={{ marginBottom: '0.5rem' }}>
          <strong className="text-sm">Checklist ({doneCheck}/{tarefa.checklist.length})</strong>
          <span className="text-xs muted">{checklistPct}%</span>
        </div>
        <div className="progress" style={{ marginBottom: '0.5rem' }}><span style={{ width: checklistPct + '%' }} /></div>
        {tarefa.checklist.length === 0 && <p className="muted text-xs">Nenhum item. Edite a tarefa para adicionar.</p>}
        {tarefa.checklist.map((c, i) => (
          <label key={i} className={'check-item' + (c.concluido ? ' done' : '')}>
            <input type="checkbox" checked={c.concluido} onChange={() => onToggleCheck(i)} />
            <span>{c.titulo}</span>
          </label>
        ))}
      </div>

      {/* Comments */}
      <div>
        <strong className="text-sm">Comentários ({tarefa.comentarios.length})</strong>
        <div style={{ margin: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {tarefa.comentarios.map((c, i) => {
            const autor = getUsuario(c.autor_id)
            return (
              <div key={i} className="row gap-sm" style={{ alignItems: 'flex-start' }}>
                <div className="card" style={{ padding: '0.6rem 0.8rem', flex: 1 }}>
                  <div className="row between"><strong className="text-xs">{autor?.nome}</strong><span className="text-xs muted">{formatDate(c.data)}</span></div>
                  <p className="text-sm" style={{ marginTop: '0.2rem' }}>{c.texto}</p>
                </div>
              </div>
            )
          })}
          {tarefa.comentarios.length === 0 && <p className="muted text-xs">Seja o primeiro a comentar.</p>}
        </div>
        <div className="row gap-sm">
          <input
            className="grow" style={{ padding: '0.55rem 0.75rem', border: '1.5px solid var(--line)', borderRadius: '8px', background: 'var(--bg)' }}
            placeholder="Escreva um comentário…" value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviar()}
          />
          <button className="btn btn-primary btn-sm" onClick={enviar}>Enviar</button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------------- Create / edit form ---------------- */
function TarefaForm({ tarefa, projetos, usuarios, currentUser, onCancel, onSave }) {
  const [form, setForm] = useState(() => {
    const projIni = tarefa?.projeto_id || projetos[0]?._id
    const proj = projetos.find((p) => p._id === projIni)
    const ids = proj ? [proj.responsavel_id, ...proj.membros_equipe] : []
    const assignee = tarefa?.atribuido_para_id
      || (ids.includes(currentUser?._id) ? currentUser._id : ids[0] || '')
    return {
      titulo: tarefa?.titulo || '',
      descricao: tarefa?.descricao || '',
      projeto_id: projIni,
      atribuido_para_id: assignee,
      coluna_quadro: tarefa?.coluna_quadro || ColunaQuadro.Backlog,
      prioridade: tarefa?.prioridade || PrioridadeTarefa.Media,
      data_entrega: tarefa?.data_entrega ? new Date(tarefa.data_entrega).toISOString().slice(0, 10) : '',
      etiquetas: tarefa?.etiquetas ? [...tarefa.etiquetas] : [],
      checklist: tarefa?.checklist ? tarefa.checklist.map((c) => ({ ...c })) : [],
    }
  })
  const [tagInput, setTagInput] = useState('')
  const [checkInput, setCheckInput] = useState('')
  const [err, setErr] = useState({})
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Only people in the selected project can be assigned
  const projetoSel = projetos.find((p) => p._id === form.projeto_id)
  const membrosDoProjeto = projetoSel
    ? usuarios.filter((u) => u._id === projetoSel.responsavel_id || projetoSel.membros_equipe.includes(u._id))
    : []

  const mudarProjeto = (projetoId) => {
    const proj = projetos.find((p) => p._id === projetoId)
    const ids = proj ? [proj.responsavel_id, ...proj.membros_equipe] : []
    setForm((f) => ({
      ...f,
      projeto_id: projetoId,
      // keep current assignee if still valid, else pick first member
      atribuido_para_id: ids.includes(f.atribuido_para_id) ? f.atribuido_para_id : ids[0] || '',
    }))
  }

  const addTag = () => {
    const v = tagInput.trim()
    if (v && !form.etiquetas.includes(v)) set('etiquetas', [...form.etiquetas, v])
    setTagInput('')
  }
  const addCheck = () => {
    const v = checkInput.trim()
    if (v) set('checklist', [...form.checklist, { titulo: v, concluido: false }])
    setCheckInput('')
  }

  const submit = (e) => {
    e.preventDefault()
    const er = {}
    if (!form.titulo.trim()) er.titulo = 'Informe o título.'
    if (!form.projeto_id) er.projeto_id = 'Selecione um projeto.'
    setErr(er)
    if (Object.keys(er).length) return
    onSave({
      ...form,
      data_entrega: form.data_entrega ? new Date(form.data_entrega).toISOString() : null,
    })
  }

  return (
    <Modal
      title={tarefa ? 'Editar tarefa' : 'Nova tarefa'}
      onClose={onCancel}
      maxWidth={640}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit}>{tarefa ? 'Salvar' : 'Criar tarefa'}</button>
        </>
      }
    >
      <form onSubmit={submit}>
        <div className={'field' + (err.titulo ? ' error' : '')}>
          <label>Título *</label>
          <input value={form.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ex.: Implementar tela de login" />
          {err.titulo && <span className="error-msg">{err.titulo}</span>}
        </div>

        <div className="field">
          <label>Descrição</label>
          <textarea value={form.descricao} onChange={(e) => set('descricao', e.target.value)} />
        </div>

        <div className="two-col">
          <div className={'field' + (err.projeto_id ? ' error' : '')}>
            <label>Projeto *</label>
            <select value={form.projeto_id} onChange={(e) => mudarProjeto(e.target.value)}>
              {projetos.map((p) => <option key={p._id} value={p._id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Responsável</label>
            <select value={form.atribuido_para_id} onChange={(e) => set('atribuido_para_id', e.target.value)}>
              {membrosDoProjeto.map((u) => <option key={u._id} value={u._id}>{u.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="two-col">
          <div className="field">
            <label>Coluna</label>
            <select value={form.coluna_quadro} onChange={(e) => set('coluna_quadro', e.target.value)}>
              {COLUNAS_ORDER.map((c) => <option key={c} value={c}>{COLUNA_LABEL[c]}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Prioridade</label>
            <select value={form.prioridade} onChange={(e) => set('prioridade', e.target.value)}>
              {Object.values(PrioridadeTarefa).map((p) => <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Data de entrega</label>
          <input type="date" value={form.data_entrega} onChange={(e) => set('data_entrega', e.target.value)} />
        </div>

        {/* Tags */}
        <div className="field">
          <label>Etiquetas</label>
          <div className="row gap-sm">
            <input className="grow" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder="Digite e Enter" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={addTag}>Adicionar</button>
          </div>
          <div className="row gap-sm wrap" style={{ marginTop: '0.5rem' }}>
            {form.etiquetas.map((t) => (
              <span key={t} className="chip">{t}<button type="button" onClick={() => set('etiquetas', form.etiquetas.filter((x) => x !== t))}>×</button></span>
            ))}
          </div>
        </div>

        {/* Checklist */}
        <div className="field">
          <label>Checklist</label>
          <div className="row gap-sm">
            <input className="grow" value={checkInput} onChange={(e) => setCheckInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCheck() } }} placeholder="Novo item" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={addCheck}>Adicionar</button>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            {form.checklist.map((c, i) => (
              <div key={i} className="check-item">
                <input type="checkbox" checked={c.concluido} onChange={() => set('checklist', form.checklist.map((x, j) => j === i ? { ...x, concluido: !x.concluido } : x))} />
                <span className="grow">{c.titulo}</span>
                <button type="button" className="icon-btn" onClick={() => set('checklist', form.checklist.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  )
}
