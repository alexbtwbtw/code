export function fmt(n: number | null, currency: string) {
  if (n == null) return '—'
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

export function fmtDate(d: string | null | undefined) { return d ? d.slice(0, 10) : '—' }

export function fmtDim(label: string, val: number | null) { return val != null ? `${label} ${val} m` : null }

export function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}
