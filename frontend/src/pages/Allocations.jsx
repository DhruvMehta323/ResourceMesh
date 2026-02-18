import { useState } from 'react'
import { useApi, useMutation } from '../hooks/useApi'
import { allocationsAPI, assetsAPI, teamsAPI, projectsAPI } from '../api'
import { PageLoader, ErrorState } from '../components/Spinner'
import Modal from '../components/Modal'
import { fmt } from '../utils/format'
import { Plus, RefreshCw, CheckCircle, Clock } from 'lucide-react'
import clsx from 'clsx'

export default function Allocations() {
  const [status, setStatus] = useState('active')
  const [showAlloc, setShowAlloc] = useState(false)
  const [releasingId, setReleasingId] = useState(null)

  const { data: allocations, loading, error, refetch } = useApi(
    () => allocationsAPI.list(status), [status]
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {['active', 'released'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                status === s ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200')}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={refetch} className="btn-ghost p-2.5"><RefreshCw size={14} /></button>
          <button onClick={() => setShowAlloc(true)} className="btn-primary">
            <Plus size={14} /> Allocate Asset
          </button>
        </div>
      </div>

      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={refetch} /> : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset</th><th>Category</th><th>Team</th><th>Project</th>
                <th>Allocated</th><th>Hours Used</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(allocations || []).map(alloc => (
                <tr key={alloc.id}>
                  <td>
                    <div>
                      <p className="font-medium text-slate-200">{alloc.asset_name}</p>
                      <p className="text-xs font-mono text-slate-500">{alloc.asset_tag}</p>
                    </div>
                  </td>
                  <td>
                    <span className="badge text-xs"
                      style={{ color: alloc.color, background: `${alloc.color}15`, border: `1px solid ${alloc.color}25` }}>
                      {alloc.category_name}
                    </span>
                  </td>
                  <td className="text-slate-300 text-sm">{alloc.team_name}</td>
                  <td className="text-slate-400 text-sm">{alloc.project_name || '—'}</td>
                  <td>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock size={11} />
                      {fmt.date(alloc.allocated_at)}
                    </div>
                  </td>
                  <td className="font-mono text-sm text-slate-300">{alloc.actual_hours_used || 0}h</td>
                  <td>
                    {alloc.status === 'active' && (
                      <button onClick={() => setReleasingId(alloc.id)} className="btn-secondary text-xs py-1">
                        Release
                      </button>
                    )}
                    {alloc.status === 'released' && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle size={11} /> Released
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {(!allocations || allocations.length === 0) && (
                <tr><td colSpan={7} className="text-center text-slate-500 py-12">No {status} allocations</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AllocateModal isOpen={showAlloc} onClose={() => setShowAlloc(false)}
        onSuccess={() => { setShowAlloc(false); refetch() }} />

      <ReleaseModal isOpen={!!releasingId} allocId={releasingId}
        onClose={() => setReleasingId(null)}
        onSuccess={() => { setReleasingId(null); refetch() }} />
    </div>
  )
}

function AllocateModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({ asset_id: '', team_id: '', project_id: '', allocation_reason: '', allocated_by: '' })
  const { data: assets } = useApi(() => assetsAPI.list({ status: 'available' }))
  const { data: teams } = useApi(() => teamsAPI.list())
  const { data: projects } = useApi(() => projectsAPI.list())
  const { mutate, loading, error } = useMutation(allocationsAPI.allocate)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    try {
      await mutate({ ...form, asset_id: Number(form.asset_id), team_id: Number(form.team_id), project_id: form.project_id ? Number(form.project_id) : null })
      onSuccess()
    } catch {}
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Allocate Asset">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Asset *</label>
          <select className="input" required value={form.asset_id} onChange={e => set('asset_id', e.target.value)}>
            <option value="">Select available asset</option>
            {(assets || []).map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Team *</label>
          <select className="input" required value={form.team_id} onChange={e => set('team_id', e.target.value)}>
            <option value="">Select team</option>
            {(teams || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Project (optional)</label>
          <select className="input" value={form.project_id} onChange={e => set('project_id', e.target.value)}>
            <option value="">No specific project</option>
            {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Allocated By</label>
          <input className="input" value={form.allocated_by} onChange={e => set('allocated_by', e.target.value)} placeholder="your@email.com" />
        </div>
        <div>
          <label className="label">Reason</label>
          <textarea className="input h-20 resize-none" value={form.allocation_reason}
            onChange={e => set('allocation_reason', e.target.value)} placeholder="Why do you need this asset?" />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Allocating...' : 'Allocate Asset'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ReleaseModal({ isOpen, allocId, onClose, onSuccess }) {
  const [hours, setHours] = useState('')
  const [releasedBy, setReleasedBy] = useState('')
  const { mutate, loading, error } = useMutation((data) => allocationsAPI.release(allocId, data))

  const submit = async (e) => {
    e.preventDefault()
    try {
      await mutate({ hours_used: Number(hours) || 0, released_by: releasedBy || 'system' })
      onSuccess()
    } catch {}
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Release Asset">
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-slate-400">Log actual usage and return the asset to the pool.</p>
        <div>
          <label className="label">Hours Used</label>
          <input className="input" type="number" min="0" step="0.5" value={hours}
            onChange={e => setHours(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">Released By</label>
          <input className="input" value={releasedBy} onChange={e => setReleasedBy(e.target.value)} placeholder="your@email.com" />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Releasing...' : 'Release Asset'}
          </button>
        </div>
      </form>
    </Modal>
  )
}