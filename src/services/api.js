const API_URL = import.meta.env.VITE_API_URL.replace(/\/$/, '')

let token = null
let onUnauthorized = null

export const setToken = (t) => { token = t }
export const setOnUnauthorized = (fn) => { onUnauthorized = fn }

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function mensagemDeErro(body, status) {
  const detail = body?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d) => d.msg?.replace(/^Value error, /, '') || String(d)).join(' ')
  }
  return `Erro ${status} ao comunicar com o servidor.`
}

async function request(method, path, { body, form, auth = true } = {}) {
  const headers = {}
  let payload
  if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    payload = new URLSearchParams(form).toString()
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(API_URL + path, { method, headers, body: payload })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor.')
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && auth && token && onUnauthorized) onUnauthorized()
    throw new ApiError(res.status, mensagemDeErro(data, res.status))
  }
  return data
}

const get = (p) => request('GET', p)
const post = (p, body) => request('POST', p, { body })
const patch = (p, body) => request('PATCH', p, { body })
const del = (p) => request('DELETE', p)

const utc = (v) => (typeof v === 'string' && !/(Z|[+-]\d{2}:?\d{2})$/.test(v) ? v + 'Z' : v ?? null)

export const fromApi = {
  usuario: (u) => ({
    _id: u._id,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil,
    departamento: u.departamento || '',
    criado_em: utc(u.criado_em),
  }),

  projeto: (p) => ({
    _id: p._id,
    responsavel_id: p.responsavel_id,
    nome: p.nome,
    descricao: p.descricao || '',
    status: p.status,
    saude_projeto: p.saude_projeto,
    percentual_progresso: p.percentual_progresso,
    membros_equipe: p.membros_equipe || [],
    marcos: (p.marcos || []).map((m) => ({ titulo: m.titulo, concluido: m.concluido, data_prevista: utc(m.data_prevista) })),
    historico_status: (p.historico_status || []).map((h) => ({
      status: h.status_novo,
      data: utc(h.data_alteracao),
      nota: h.nota || 'Status atualizado',
    })),
    data_inicio: utc(p.data_inicio),
    data_entrega: utc(p.data_entrega),
  }),

  tarefa: (t) => ({
    _id: t._id,
    projeto_id: t.projeto_id,
    criado_por_id: t.criador_id,
    atribuido_para_id: t.responsavel_id,
    titulo: t.titulo,
    descricao: t.descricao || '',
    coluna_quadro: t.coluna_quadro,
    ordem_coluna: t.ordem_coluna ?? 0,
    prioridade: t.prioridade,
    etiquetas: t.etiquetas || [],
    checklist: (t.checklist || []).map((c) => ({ id: c.id, titulo: c.titulo, concluido: c.concluido })),
    comentarios: (t.comentarios || []).map((c) => ({
      id: c.id, autor_id: c.autor_id, texto: c.texto, data: utc(c.criado_em),
    })),
    data_entrega: utc(t.data_prazo),
    criado_em: utc(t.criado_em),
  }),

  treinamento: (t) => ({
    _id: t._id,
    instrutor_id: t.instrutor_id,
    titulo: t.titulo,
    descricao: t.descricao || '',
    categoria: t.categoria,
    carga_horaria: t.carga_horaria,
    modulos: (t.modulos || []).map((m) => ({ id: m.id, titulo: m.titulo })),
    criado_em: utc(t.criado_em),
  }),

  matricula: (m) => ({
    _id: m._id,
    aluno_id: m.aluno_id,
    treinamento_id: m.treinamento_id,
    status: m.status,
    percentual_progresso: m.percentual_progresso,
    modulos_concluidos: m.modulos_concluidos || [],
    url_certificado: m.url_certificado || '',
    iniciado_em: utc(m.iniciado_em),
    concluido_em: utc(m.concluido_em),
  }),
}

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]))

const toApi = {
  usuario: (d) => {
    const out = pick(d, ['nome', 'email', 'perfil', 'departamento'])
    if (d.senha) out.senha = d.senha
    return out
  },
  projeto: (d) => {
    const out = pick(d, [
      'nome', 'descricao', 'responsavel_id', 'status', 'saude_projeto',
      'percentual_progresso', 'membros_equipe', 'data_inicio', 'data_entrega',
    ])
    if (d.marcos) {
      out.marcos = d.marcos.map((m) => ({ titulo: m.titulo, concluido: !!m.concluido, data_prevista: m.data_prevista || null }))
    }
    return out
  },
  tarefa: (d) => {
    const out = pick(d, ['projeto_id', 'titulo', 'descricao', 'coluna_quadro', 'prioridade', 'etiquetas'])
    if ('criado_por_id' in d) out.criador_id = d.criado_por_id || null
    if ('atribuido_para_id' in d) out.responsavel_id = d.atribuido_para_id || null
    if ('data_entrega' in d) out.data_prazo = d.data_entrega || null
    if (d.checklist) {
      out.checklist = d.checklist.map((c) => (c.id
        ? { id: c.id, titulo: c.titulo, concluido: !!c.concluido }
        : { titulo: c.titulo, concluido: !!c.concluido }))
    }
    return out
  },
  treinamento: (d) => {
    const out = pick(d, ['titulo', 'descricao', 'categoria', 'carga_horaria', 'instrutor_id'])
    if (d.modulos) out.modulos = d.modulos.map((m, i) => ({ id: m.id, titulo: m.titulo, ordem: i + 1 }))
    return out
  },
}

const LIMIT = '?limit=1000'

export const api = {
  login: (email, senha) =>
    request('POST', '/auth/token', { form: { username: email, password: senha }, auth: false }),
  me: () => get('/auth/me').then(fromApi.usuario),

  listarUsuarios: () => get('/usuarios/' + LIMIT).then((l) => l.map(fromApi.usuario)),
  criarUsuario: (d) => post('/usuarios/', toApi.usuario(d)).then(fromApi.usuario),
  atualizarUsuario: (id, d) => patch(`/usuarios/${id}`, toApi.usuario(d)).then(fromApi.usuario),
  excluirUsuario: (id) => del(`/usuarios/${id}`),

  listarProjetos: () => get('/projetos/' + LIMIT).then((l) => l.map(fromApi.projeto)),
  criarProjeto: (d) => post('/projetos/', toApi.projeto(d)).then(fromApi.projeto),
  atualizarProjeto: (id, d) => patch(`/projetos/${id}`, toApi.projeto(d)).then(fromApi.projeto),
  excluirProjeto: (id) => del(`/projetos/${id}`),
  alternarMarco: (id, idx) => post(`/projetos/${id}/marcos/${idx}/alternar`).then(fromApi.projeto),

  listarTarefas: () => get('/tarefas/' + LIMIT).then((l) => l.map(fromApi.tarefa)),
  criarTarefa: (d) => post('/tarefas/', toApi.tarefa(d)).then(fromApi.tarefa),
  atualizarTarefa: (id, d) => patch(`/tarefas/${id}`, toApi.tarefa(d)).then(fromApi.tarefa),
  excluirTarefa: (id) => del(`/tarefas/${id}`),
  comentarTarefa: (id, texto) => post(`/tarefas/${id}/comentarios`, { texto }).then(fromApi.tarefa),

  listarTreinamentos: () => get('/treinamentos/' + LIMIT).then((l) => l.map(fromApi.treinamento)),
  criarTreinamento: (d) => post('/treinamentos/', toApi.treinamento(d)).then(fromApi.treinamento),
  atualizarTreinamento: (id, d) => patch(`/treinamentos/${id}`, toApi.treinamento(d)).then(fromApi.treinamento),
  excluirTreinamento: (id) => del(`/treinamentos/${id}`),

  listarMatriculas: () => get('/matriculas/' + LIMIT).then((l) => l.map(fromApi.matricula)),
  criarMatricula: (alunoId, treinamentoId) =>
    post('/matriculas/', { aluno_id: alunoId, treinamento_id: treinamentoId }).then(fromApi.matricula),
  atualizarMatricula: (id, d) => patch(`/matriculas/${id}`, d).then(fromApi.matricula),
}
