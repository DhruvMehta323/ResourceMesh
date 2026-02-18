import clsx from 'clsx'

const statusMap = {
  available:   { cls: 'status-available',   dot: 'bg-emerald-400', label: 'Available' },
  in_use:      { cls: 'status-in_use',      dot: 'bg-blue-400',    label: 'In Use' },
  maintenance: { cls: 'status-maintenance', dot: 'bg-amber-400',   label: 'Maintenance' },
  retired:     { cls: 'status-retired',     dot: 'bg-slate-500',   label: 'Retired' },
}

const priorityMap = {
  critical: { cls: 'priority-critical', label: 'Critical' },
  high:     { cls: 'priority-high',     label: 'High' },
  medium:   { cls: 'priority-medium',   label: 'Medium' },
  low:      { cls: 'priority-low',      label: 'Low' },
}

const projectStatusMap = {
  planning:   { cls: 'badge bg-violet-500/15 text-violet-400 border border-violet-500/20', label: 'Planning' },
  active:     { cls: 'badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/20', label: 'Active' },
  on_hold:    { cls: 'badge bg-amber-500/15 text-amber-400 border border-amber-500/20', label: 'On Hold' },
  completed:  { cls: 'badge bg-blue-500/15 text-blue-400 border border-blue-500/20', label: 'Completed' },
  cancelled:  { cls: 'badge bg-slate-500/15 text-slate-400 border border-slate-500/20', label: 'Cancelled' },
}

export function AssetStatus({ status }) {
  const s = statusMap[status] || statusMap.available
  return (
    <span className={s.cls}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const p = priorityMap[priority] || priorityMap.medium
  return <span className={p.cls}>{p.label}</span>
}

export function ProjectStatus({ status }) {
  const s = projectStatusMap[status] || projectStatusMap.planning
  return <span className={s.cls}>{s.label}</span>
}