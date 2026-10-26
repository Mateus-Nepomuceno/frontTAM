import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { api, setToken } from '../services/api.js'
import { StatusProjeto } from '../data/enums.js'

const DataContext = createContext(null)

function notificarErro(err) {
  console.error(err)
  window.alert(err?.message || 'Ocorreu um erro ao comunicar com o servidor.')
}

export function DataProvider({ children }) {
  const [usuarios, setUsuarios] = useState([])
  const [projetos, setProjetos] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [treinamentos, setTreinamentos] = useState([])
  const [matriculas, setMatriculas] = useState([])

  const tarefasRef = useRef(tarefas)
  tarefasRef.current = tarefas
  const matriculasRef = useRef(matriculas)
  matriculasRef.current = matriculas

  const replaceIn = (setter) => (item) => setter((list) => list.map((x) => (x._id === item._id ? item : x)))

  const carregar = useCallback(async () => {
    const [u, p, t, tr, m] = await Promise.all([
      api.listarUsuarios(),
      api.listarProjetos(),
      api.listarTarefas(),
      api.listarTreinamentos(),
      api.listarMatriculas(),
    ])
    setUsuarios(u)
    setProjetos(p)
    setTarefas(t)
    setTreinamentos(tr)
    setMatriculas(m)
  }, [])

  const executar = useCallback(async (fn) => {
    try {
      return await fn()
    } catch (err) {
      notificarErro(err)
      if (err?.status && err.status !== 401) carregar().catch(() => {})
      return null
    }
  }, [carregar])

  const limpar = useCallback(() => {
    setToken(null)
    setUsuarios([])
    setProjetos([])
    setTarefas([])
    setTreinamentos([])
    setMatriculas([])
  }, [])

  const getUsuario = useCallback((id) => usuarios.find((u) => u._id === id), [usuarios])

  // ---------------- Usuários CRUD (admin) ----------------
  const emailEmUso = useCallback(
    (email, ignoreId = null) =>
      usuarios.some((u) => u.email.toLowerCase() === email.trim().toLowerCase() && u._id !== ignoreId),
    [usuarios],
  )

  const criarUsuario = useCallback((data) => executar(async () => {
    const novo = await api.criarUsuario(data)
    setUsuarios((list) => [novo, ...list])
    return novo
  }), [executar])

  const atualizarUsuario = useCallback((id, data) => executar(async () => {
    replaceIn(setUsuarios)(await api.atualizarUsuario(id, data))
  }), [executar])

  const excluirUsuario = useCallback((id) => executar(async () => {
    await api.excluirUsuario(id)
    setUsuarios((list) => list.filter((u) => u._id !== id))
  }), [executar])

  const autenticar = useCallback(async (email, senha) => {
    let res
    try {
      res = await api.login(email.trim(), senha)
    } catch (err) {
      if (err.status === 401 || err.status === 422) return null
      throw err
    }
    setToken(res.access_token)
    try {
      const u = await api.me()
      await carregar()
      return u
    } catch (err) {
      setToken(null)
      throw err
    }
  }, [carregar])

  // ---------------- Projetos CRUD ----------------
  const criarProjeto = useCallback((data) => executar(async () => {
    const novo = await api.criarProjeto(data)
    setProjetos((p) => [novo, ...p])
    return novo
  }), [executar])

  const atualizarProjeto = useCallback((id, data) => executar(async () => {
    replaceIn(setProjetos)(await api.atualizarProjeto(id, data))
  }), [executar])

  const excluirProjeto = useCallback((id) => executar(async () => {
    await api.excluirProjeto(id)
    setProjetos((list) => list.filter((p) => p._id !== id))
    setTarefas((list) => list.filter((t) => t.projeto_id !== id))
  }), [executar])

  const toggleMarco = useCallback((projetoId, idx) => executar(async () => {
    replaceIn(setProjetos)(await api.alternarMarco(projetoId, idx))
  }), [executar])

  // ---------------- Tarefas CRUD ----------------
  const criarTarefa = useCallback((data) => executar(async () => {
    const novo = await api.criarTarefa(data)
    setTarefas((t) => [novo, ...t])
    return novo
  }), [executar])

  const atualizarTarefa = useCallback((id, data) => executar(async () => {
    replaceIn(setTarefas)(await api.atualizarTarefa(id, data))
  }), [executar])

  const moverTarefa = useCallback((id, coluna) => executar(async () => {
    replaceIn(setTarefas)(await api.atualizarTarefa(id, { coluna_quadro: coluna }))
  }), [executar])

  const excluirTarefa = useCallback((id) => executar(async () => {
    await api.excluirTarefa(id)
    setTarefas((list) => list.filter((t) => t._id !== id))
  }), [executar])

  const adicionarComentario = useCallback((tarefaId, _autorId, texto) => executar(async () => {
    replaceIn(setTarefas)(await api.comentarTarefa(tarefaId, texto))
  }), [executar])

  const toggleChecklistTarefa = useCallback((tarefaId, idx) => executar(async () => {
    const t = tarefasRef.current.find((x) => x._id === tarefaId)
    if (!t) return
    const checklist = t.checklist.map((c, i) => (i === idx ? { ...c, concluido: !c.concluido } : c))
    replaceIn(setTarefas)(await api.atualizarTarefa(tarefaId, { checklist }))
  }), [executar])

  // ---------------- Treinamentos CRUD ----------------
  const criarTreinamento = useCallback((data) => executar(async () => {
    const novo = await api.criarTreinamento(data)
    setTreinamentos((t) => [novo, ...t])
    return novo
  }), [executar])

  const atualizarTreinamento = useCallback((id, data) => executar(async () => {
    replaceIn(setTreinamentos)(await api.atualizarTreinamento(id, data))
  }), [executar])

  const excluirTreinamento = useCallback((id) => executar(async () => {
    await api.excluirTreinamento(id)
    setTreinamentos((list) => list.filter((t) => t._id !== id))
    setMatriculas((list) => list.filter((m) => m.treinamento_id !== id))
  }), [executar])

  // ---------------- Matrículas (área do aluno) ----------------
  const matricular = useCallback((alunoId, treinamentoId) => executar(async () => {
    const existe = matriculasRef.current.some((m) => m.aluno_id === alunoId && m.treinamento_id === treinamentoId)
    if (existe) return
    const nova = await api.criarMatricula(alunoId, treinamentoId)
    setMatriculas((list) => [...list, nova])
  }), [executar])

  const toggleModuloConcluido = useCallback((matriculaId, moduloId, _totalModulos) => executar(async () => {
    const m = matriculasRef.current.find((x) => x._id === matriculaId)
    if (!m) return
    const done = m.modulos_concluidos.includes(moduloId)
      ? m.modulos_concluidos.filter((x) => x !== moduloId)
      : [...m.modulos_concluidos, moduloId]
    replaceIn(setMatriculas)(await api.atualizarMatricula(matriculaId, { modulos_concluidos: done }))
  }), [executar])

  const value = {
    usuarios, getUsuario,
    criarUsuario, atualizarUsuario, excluirUsuario, emailEmUso,
    autenticar, carregar, limpar,
    projetos, criarProjeto, atualizarProjeto, excluirProjeto, toggleMarco,
    tarefas, criarTarefa, atualizarTarefa, moverTarefa, excluirTarefa, adicionarComentario, toggleChecklistTarefa,
    treinamentos, criarTreinamento, atualizarTreinamento, excluirTreinamento,
    matriculas, matricular, toggleModuloConcluido,
    StatusProjeto,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
