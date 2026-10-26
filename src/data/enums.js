// Domain enums mirroring the backend models

export const PerfilUsuario = {
  Admin: 'Admin',
  Gestor: 'Gestor',
  Membro: 'Membro',
}

export const CategoriaTreinamento = {
  Tecnico: 'Tecnico',
  SoftSkills: 'SoftSkills',
  Onboarding: 'Onboarding',
  Cloud: 'Cloud',
}
export const CATEGORIA_LABEL = {
  Tecnico: 'Técnico',
  SoftSkills: 'Soft Skills',
  Onboarding: 'Onboarding',
  Cloud: 'Cloud',
}

export const StatusMatricula = {
  Matriculado: 'Matriculado',
  EmAndamento: 'EmAndamento',
  Concluido: 'Concluido',
  Desistente: 'Desistente',
}
export const STATUS_MATRICULA_LABEL = {
  Matriculado: 'Matriculado',
  EmAndamento: 'Em andamento',
  Concluido: 'Concluído',
  Desistente: 'Desistente',
}

export const StatusProjeto = {
  Planejamento: 'Planejamento',
  Ativo: 'Ativo',
  Pausado: 'Pausado',
  Concluido: 'Concluido',
  Cancelado: 'Cancelado',
}
export const STATUS_PROJETO_LABEL = {
  Planejamento: 'Planejamento',
  Ativo: 'Ativo',
  Pausado: 'Pausado',
  Concluido: 'Concluído',
  Cancelado: 'Cancelado',
}

export const SaudeProjeto = {
  NoPrazo: 'NoPrazo',
  EmRisco: 'EmRisco',
  Atrasado: 'Atrasado',
}
export const SAUDE_LABEL = {
  NoPrazo: 'No prazo',
  EmRisco: 'Em risco',
  Atrasado: 'Atrasado',
}
// maps health -> badge css class
export const SAUDE_BADGE = {
  NoPrazo: 'badge-ok',
  EmRisco: 'badge-warn',
  Atrasado: 'badge-danger',
}

export const ColunaQuadro = {
  Backlog: 'Backlog',
  AFazer: 'AFazer',
  EmAndamento: 'EmAndamento',
  Revisao: 'Revisao',
  Concluido: 'Concluido',
}
export const COLUNA_LABEL = {
  Backlog: 'Backlog',
  AFazer: 'A Fazer',
  EmAndamento: 'Em Andamento',
  Revisao: 'Revisão',
  Concluido: 'Concluído',
}
export const COLUNAS_ORDER = [
  ColunaQuadro.Backlog,
  ColunaQuadro.AFazer,
  ColunaQuadro.EmAndamento,
  ColunaQuadro.Revisao,
  ColunaQuadro.Concluido,
]

export const PrioridadeTarefa = {
  Baixa: 'Baixa',
  Media: 'Media',
  Alta: 'Alta',
  Urgente: 'Urgente',
}
export const PRIORIDADE_LABEL = {
  Baixa: 'Baixa',
  Media: 'Média',
  Alta: 'Alta',
  Urgente: 'Urgente',
}
export const PRIORIDADE_BADGE = {
  Baixa: 'badge-blue',
  Media: 'badge-cream',
  Alta: 'badge-warn',
  Urgente: 'badge-danger',
}
export const PRIORIDADE_ORDER = { Urgente: 0, Alta: 1, Media: 2, Baixa: 3 }
