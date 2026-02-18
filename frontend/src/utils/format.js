export const fmt = {
  currency: (n, decimals = 0) => {
    if (n == null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: decimals
    }).format(n)
  },
  number: (n) => n == null ? '—' : new Intl.NumberFormat('en-US').format(n),
  percent: (n, decimals = 1) => n == null ? '—' : `${Number(n).toFixed(decimals)}%`,
  date: (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  },
  relativeDate: (d) => {
    if (!d) return '—'
    const diff = Date.now() - new Date(d).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days/7)}w ago`
    return `${Math.floor(days/30)}mo ago`
  },
  hours: (h) => {
    if (h == null) return '—'
    if (h < 24) return `${h}h`
    return `${Math.round(h/24)}d`
  },
}

export const statusLabel = {
  available: 'Available',
  in_use: 'In Use',
  maintenance: 'Maintenance',
  retired: 'Retired',
}

export const priorityLabel = {
  low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical'
}

export const projectStatusLabel = {
  planning: 'Planning', active: 'Active',
  on_hold: 'On Hold', completed: 'Completed', cancelled: 'Cancelled'
}