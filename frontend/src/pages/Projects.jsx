import { useState } from 'react'
import { useApi, useMutation } from '../hooks/useApi'
import { projectsAPI, assetsAPI, teamsAPI } from '../api'
import { PageLoader, ErrorState } from '../components/Spinner'
import { ProjectStatus, PriorityBadge } from '../components/StatusBadge'
import Modal from '../components/Modal'
import { fmt } from '../utils/format'
import { Plus, FolderKanban, CalendarDays, Users, Eye } from 'lucide-react'

export default function Projects() {
  const [showCreate, setShowCreate] = useState(false)
  const [viewing, setViewing] = useState(null)
  const { data: projects, loading, error, refetch } = useApi(() => projectsAPI.list())
  const { data: projectDetail } = useApi(
    () => viewing ? projectsAPI.get(viewing) : Promise.resolve(null),
    [viewing], { initialData: null }
  )

  if (loading) return <PageLoader />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={14} /> New Project</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(projects || []).map(p => (
          <div key={p.id} className="card-hover p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-display font-bold text-white">{p.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{p.team_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={p.priority} />
                <ProjectStatus status={p.status} />
              </div>
            </div>

            {p.description && <p className="text-sm text-slate-400 mb-3 line-clamp-2">{p.description}</p>}

            <div className="flex items-center gap-4 text-xs text-slate-500">
              {p.start_date && (
                <span className="flex items-center gap-1">
                  <CalendarDays size={11} />
                  {fmt.date(p.start_date)} → {fmt.date(p.end_date)}
                </span>
              )}
              {p.budget > 0 && <span>{fmt.currency(p.budget)} budget</span>}
              {p.allocated_assets > 0 && (
                <span className="text-blue-400">{p.allocated_assets} assets</span>
              )}
            </div>

            <button onClick={() => setViewing(p.id)} className="btn-ghost text-xs mt-3 pl-0">
              <Eye size={12} /> View details
            </button>
          </div>
        ))}
      </div>

      <CreateProjectModal isOpen={showCreate} onClose={() => setShowCreate(false)}
        onSuccess={() => { setShowCreate(false); refetch() }} />

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Project Details" size="lg">
        {projectDetail ? <ProjectDetail project={projectDetail} /> : <PageLoader />}
      </Modal>
    </div>
  )
}

function ProjectDetail({ project }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display font-bold text-white text-lg">{project.name}</h3>
          <p className="text-sm text-slate-400">{project.team_name}</p>
        </div>
        <div className="flex gap-2">
          <PriorityBadge priority={project.priority} />
          <ProjectStatus status={project.status} />
        </div>
      </div>
      {project.description && <p className="text-sm text-slate-400">{project.description}</p>}

      <div className="grid grid-cols-3 gap-3">
        {[
          ['Start', fmt.date(project.start_date)],
          ['End', fmt.date(project.end_date)],
          ['Budget', fmt.currency(project.budget)],
        ].map(([label, val]) => (
          <div key={label} className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase">{label}</p>
            <p className="text-sm text-slate-200 mt-0.5 font-medium">{val}</p>
          </div>
        ))}
      </div>

      {project.requirements?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Resource Requirements</p>
          <div className="space-y-1.5">
            {project.requirements.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ color: r.color, background: `${r.color}15`, border: `1px solid ${r.color}25` }}>
                    {r.category_name}
                  </span>
                  <span className="text-sm text-slate-300">×{r.quantity_needed}</span>
                </div>
                <span className="text-xs text-slate-500 capitalize">{r.priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {project.allocations?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Allocated Assets</p>
          <div className="space-y-1.5">
            {project.allocations.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-xl">
                <div>
                  <p className="text-sm text-slate-200">{a.asset_name}</p>
                  <p className="text-xs font-mono text-slate-500">{a.asset_tag}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ color: a.color, background: `${a.color}15`, border: `1px solid ${a.color}25` }}>
                  {a.category_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CreateProjectModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', description: '', team_id: '', status: 'planning', priority: 'medium', start_date: '', end_date: '', budget: '' })
  const { data: teams } = useApi(() => teamsAPI.list())
  const { mutate, loading, error } = useMutation(projectsAPI.create)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    try {
      await mutate({ ...form, team_id: Number(form.team_id) || null, budget: Number(form.budget) || 0 })
      onSuccess()
    } catch {}
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Project">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Project Name *</label>
          <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="LLM Fine-tuning Pipeline" />
        </div>
        <div>
          <label className="label">Team</label>
          <select className="input" value={form.team_id} onChange={e => set('team_id', e.target.value)}>
            <option value="">No team</option>
            {(teams || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              {['planning','active','on_hold','completed','cancelled'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={e => set('priority', e.target.value)}>
              {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Start Date</label>
            <input className="input" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input className="input" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Budget ($)</label>
          <input className="input" type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input h-20 resize-none" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create Project'}</button>
        </div>
      </form>
    </Modal>
  )
}