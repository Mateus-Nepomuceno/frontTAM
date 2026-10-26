import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  StatusProjeto, ColunaQuadro, SaudeProjeto, SAUDE_LABEL,
  PRIORIDADE_LABEL, PerfilUsuario,
} from '../data/enums.js'
import { daysUntil } from '../utils/helpers.js'
import './pages.css'

export default function Dashboard() {
  const { projetos, tarefas, matriculas, treinamentos, getUsuario } = useData()
  const { user } = useAuth()
  const navigate = useNavigate()

  // Admin sees everything; everyone else sees only what they're involved in
  const veTudo = user?.perfil === PerfilUsuario.Admin

  // Scope data to the user's involvement (Admin/Gestor see everything)
  const meusProjetos = useMemo(
    () => veTudo
      ? projetos
      : projetos.filter((p) => p.responsavel_id === user?._id || p.membros_equipe.includes(user?._id)),
    [projetos, veTudo, user],
  )
  const meusProjetoIds = useMemo(() => new Set(meusProjetos.map((p) => p._id)), [meusProjetos])
  const minhasTarefas = useMemo(
    () => veTudo ? tarefas : tarefas.filter((t) => meusProjetoIds.has(t.projeto_id)),
    [tarefas, veTudo, meusProjetoIds],
  )
  const minhasMatriculas = useMemo(
    () => veTudo ? matriculas : matriculas.filter((m) => m.aluno_id === user?._id),
    [matriculas, veTudo, user],
  )

  const stats = useMemo(() => {
    const ativos = meusProjetos.filter((p) => p.status === StatusProjeto.Ativo)
    const concluidosSemana = minhasTarefas.filter(
      (t) => t.coluna_quadro === ColunaQuadro.Concluido && (daysUntil(t.data_entrega) ?? -99) >= -7,
    )
    const emAndamento = minhasTarefas.filter((t) => t.coluna_quadro === ColunaQuadro.EmAndamento)
    const pendentes = minhasTarefas.filter((t) =>
      [ColunaQuadro.Backlog, ColunaQuadro.AFazer].includes(t.coluna_quadro),
    )

    // Average onboarding / capacitação progress across enrollments
    const progressoMedio = minhasMatriculas.length
      ? Math.round(minhasMatriculas.reduce((s, m) => s + m.percentual_progresso, 0) / minhasMatriculas.length)
      : 0

    // Health distribution for active projects
    const saude = {
      [SaudeProjeto.NoPrazo]: ativos.filter((p) => p.saude_projeto === SaudeProjeto.NoPrazo).length,
      [SaudeProjeto.EmRisco]: ativos.filter((p) => p.saude_projeto === SaudeProjeto.EmRisco).length,
      [SaudeProjeto.Atrasado]: ativos.filter((p) => p.saude_projeto === SaudeProjeto.Atrasado).length,
    }

    return { ativos, concluidosSemana, emAndamento, pendentes, progressoMedio, saude }
  }, [meusProjetos, minhasTarefas, minhasMatriculas])

  // Training completions grouped by month (last 6 months)
  const capacitacaoSerie = useMemo(() => {
    const now = new Date()
    const buckets = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        ano: d.getFullYear(),
        conclusoes: 0,
      })
    }
    minhasMatriculas.forEach((m) => {
      if (!m.concluido_em) return
      const d = new Date(m.concluido_em)
      const k = `${d.getFullYear()}-${d.getMonth()}`
      const b = buckets.find((x) => x.key === k)
      if (b) b.conclusoes += 1
    })
    const max = Math.max(1, ...buckets.map((b) => b.conclusoes))
    const total = buckets.reduce((s, b) => s + b.conclusoes, 0)
    return { buckets, max, total }
  }, [minhasMatriculas])

  // Urgent/near-deadline tasks (not done), soonest first
  const urgentes = useMemo(() => {
    return minhasTarefas
      .filter((t) => t.coluna_quadro !== ColunaQuadro.Concluido && t.data_entrega)
      .map((t) => ({ ...t, dias: daysUntil(t.data_entrega) }))
      .filter((t) => t.dias !== null && t.dias <= 7)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 5)
  }, [minhasTarefas])

  return (
    <div>
      <div className="page-head">
        <div>
          <span className="kicker">Visão geral</span>
          <h1>Dashboard</h1>
          <p className="sub">Resumo de projetos ativos, tarefas da semana e capacitação da equipe.</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid stagger">
        <div className="card stat">
          <div className="stat-mark" aria-hidden="true" />
          <span className="stat-label">Projetos ativos</span>
          <div className="stat-value">{stats.ativos.length}</div>
          <div className="stat-foot">de {projetos.length} projetos no total</div>
        </div>

        <div className="card stat">
          <div className="stat-mark" aria-hidden="true" />
          <span className="stat-label">Tarefas pendentes</span>
          <div className="stat-value">{stats.pendentes.length}</div>
          <div className="stat-foot">Backlog + A Fazer</div>
        </div>

        <div className="card stat">
          <div className="stat-mark" aria-hidden="true" />
          <span className="stat-label">Em andamento</span>
          <div className="stat-value">{stats.emAndamento.length}</div>
          <div className="stat-foot">tarefas sendo executadas</div>
        </div>

        <div className="card stat accent">
          <div className="stat-mark" aria-hidden="true" />
          <span className="stat-label">Concluídas na semana</span>
          <div className="stat-value">{stats.concluidosSemana.length}</div>
          <div className="stat-foot">últimos 7 dias</div>
        </div>
      </div>

      <div className="dash-grid">
        {/* Left: health + capacitação */}
        <div className="card panel animate-rise">
          <div className="panel-head">
            <h3>Saúde dos projetos ativos</h3>
          </div>

          {/* Health bar */}
          <HealthBar saude={stats.saude} total={stats.ativos.length} />

          <div className="health-legend">
            {Object.entries(stats.saude).map(([k, v]) => (
              <span key={k} className="health-item">
                <span className={'health-dot health-' + k} aria-hidden="true" />
                {v} {SAUDE_LABEL[k].toLowerCase()}
              </span>
            ))}
          </div>

          <hr className="divider" />

          <div className="panel-head">
            <h3>Capacitação / Onboarding</h3>
          </div>
          <div className="row between" style={{ marginBottom: '0.5rem' }}>
            <span className="text-sm muted">{veTudo ? 'Progresso médio da equipe' : 'Progresso individual'}</span>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>
              {stats.progressoMedio}%
            </strong>
          </div>
          <div className="progress progress-green"><span style={{ width: stats.progressoMedio + '%' }} /></div>
          <p className="text-xs muted" style={{ marginTop: '0.5rem' }}>
            {minhasMatriculas.length} {minhasMatriculas.length === 1 ? 'matrícula' : 'matrículas'} em {new Set(minhasMatriculas.map((m) => m.treinamento_id)).size} {new Set(minhasMatriculas.map((m) => m.treinamento_id)).size === 1 ? 'treinamento' : 'treinamentos'}.
          </p>

          <hr className="divider" />

          <div className="panel-head">
            <h3>Conclusões de capacitação</h3>
            <span className="text-xs muted">últimos 6 meses · {capacitacaoSerie.total} no total</span>
          </div>
          <CompletionsChart serie={capacitacaoSerie} />
        </div>

        {/* Right: urgent shortcuts */}
        <div className="card panel animate-rise">
          <div className="panel-head">
            <h3>Tarefas urgentes</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tarefas')}>Ver quadro</button>
          </div>
          <p className="text-xs muted" style={{ marginBottom: '1rem' }}>
            Próximas da data de entrega (ou atrasadas).
          </p>

          {urgentes.length === 0 && <p className="muted text-sm">Nenhuma tarefa urgente.</p>}

          {urgentes.map((t) => {
            const resp = getUsuario(t.atribuido_para_id)
            const overdue = t.dias < 0
            const alerta = overdue || t.prioridade === 'Urgente'
            return (
              <div key={t._id} className={'urgent urgent-' + t.prioridade + (alerta ? ' urgent-alert' : '')} onClick={() => navigate('/tarefas')} role="button" tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate('/tarefas')}>
                <div className="grow" style={{ minWidth: 0 }}>
                  <strong className="text-sm" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.titulo}
                  </strong>
                  <span className="urgent-prio">
                    {PRIORIDADE_LABEL[t.prioridade]}
                  </span>
                </div>
                <div className={'urgent-due' + (overdue ? ' overdue' : t.dias === 0 ? ' today' : '')}>
                  <span className="urgent-due-value">
                    {overdue ? `${Math.abs(t.dias)}d` : t.dias === 0 ? 'Hoje' : `${t.dias}d`}
                  </span>
                  <span className="urgent-due-label">
                    {overdue ? 'atrasada' : t.dias === 0 ? 'vence hoje' : 'restantes'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function HealthBar({ saude, total }) {
  if (!total) return <p className="muted text-sm">Nenhum projeto ativo.</p>
  const pct = (n) => (n / total) * 100
  return (
    <div style={{ display: 'flex', height: 16, borderRadius: 999, overflow: 'hidden', border: '1px solid var(--line)' }}>
      <div style={{ width: pct(saude.NoPrazo) + '%', background: 'var(--ok)' }} title="No prazo" />
      <div style={{ width: pct(saude.EmRisco) + '%', background: 'var(--warn)' }} title="Em risco" />
      <div style={{ width: pct(saude.Atrasado) + '%', background: 'var(--red)' }} title="Atrasado" />
    </div>
  )
}

function CompletionsChart({ serie }) {
  const { buckets, max, total } = serie
  if (total === 0) {
    return <p className="muted text-sm">Nenhuma capacitação concluída no período.</p>
  }
  return (
    <div className="cap-chart" role="img" aria-label="Conclusões de capacitação por mês">
      <div className="cap-bars">
        {buckets.map((b) => (
          <div key={b.key} className="cap-col">
            <span className="cap-value">{b.conclusoes > 0 ? b.conclusoes : ''}</span>
            <div className="cap-bar-track">
              <div
                className={'cap-bar' + (b.conclusoes === 0 ? ' empty' : '')}
                style={{ height: Math.round((b.conclusoes / max) * 100) + '%' }}
                title={`${b.conclusoes} conclusão(ões) em ${b.label}/${b.ano}`}
              />
            </div>
            <span className="cap-label">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
