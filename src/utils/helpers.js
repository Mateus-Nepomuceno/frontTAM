// Small formatting/helper utilities

export const uid = () => 'id_' + Math.random().toString(36).slice(2, 10)

export function formatDate(iso) {
  if (!iso) return '—'
  const dt = new Date(iso)
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateShort(iso) {
  if (!iso) return '—'
  const dt = new Date(iso)
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// days until (positive = future, negative = overdue)
export function daysUntil(iso) {
  if (!iso) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - now) / (1000 * 60 * 60 * 24))
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

// deterministic avatar color from a string
export function avatarColor(seed = '') {
  const palette = ['#cc2f25', '#1e1e1e', '#2b6cb0', '#2f9e44', '#b87f06', '#7048e8']
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}
