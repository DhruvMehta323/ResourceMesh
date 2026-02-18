import { useState } from 'react'
import { useApi, useMutation } from '../hooks/useApi'
import { teamsAPI } from '../api'
import { PageLoader, ErrorState } from '../components/Spinner'
import Modal from '../components/Modal'
import { fmt } from '../utils/format'
import { Plus, Users, DollarSign, MapPin, Mail, Server } from 'lucide-react'

export default function Teams() {
  const [showCreate, setShowCreate] = useState(false)
  const [viewing, setViewing] = useState(null)
  const { data: teams, loading, error, refetch } = useApi(() => teamsAPI.list())
  const { data: teamDetail } = useApi(
    () => viewing ? teamsAPI.get(viewing) : Promise.resolve(null),
    [viewing], { initialData: null }
  )

  if (loading) return <PageLoader />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={14} /> Add Team
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(teams || []).map(team => (
          <div key={team.id} onClick={() => setViewing(team.id)}
            className="card-hover p-5 cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-white">{team.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{team.department}</p>
              </div>
              <div className="w-10 h-10 bg-brand-600/20 rounded-xl flex items-center justify-center border border-brand-500/20">
                <Users size={18} className="text-brand-400" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <MiniStat icon={<Users size={11} />} label="Headcount" value={team.headcount || 0} />
              <MiniStat icon={<Server size={11} />} label="Assets" value={team.asset_count || 0} />
              <MiniStat icon={<Server size={11} />} label="Active Allocs" value={team.active_allocations || 0} />
            </div>

            <div className="space-y-1.5 text-xs text-slate-500">
              {team.lead_name && (
                <div className="flex items-center gap-2">
                  <Mail size={10} className="text-slate-600" />
                  <span>{team.lead_name}</span>
                </div>
              )}
              {team.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={10} className="text-slate-600" />
                  <span>{team.location}</span>
                </div>
              )}
              {team.budget > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign size={10} className="text-slate-600" />
                  <span>Budget: {fmt.currency(team.budget)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <CreateTeamModal isOpen={showCreate} onClose={() => setShowCreate(false)}
        onSuccess={() => { setShowCreate(false); refetch() }} />

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Team Details" size="lg">
        {teamDetail ? <TeamDetail team={teamDetail} /> : <PageLoader />}
      </Modal>
    </div>
  )
}

function MiniStat({ icon, label, value }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">{icon}</div>
      <p className="text-lg font-display font-bold text-white">{value}</p>
      <p className="text-[10px] text-slate-600">{label}</p>
    </div>
  )
}

function TeamDetail({ team }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display font-bold text-white text-lg">{team.name}</h3>
        <p className="text-sm text-slate-400">{team.department} · {team.location}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          ['Lead', team.lead_name],
          ['Email', team.lead_email],
          ['Headcount', team.headcount],
          ['Budget', fmt.currency(team.budget)],
        ].map(([label, val]) => (
          <div key={label} className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-sm text-slate-200 mt-0.5">{val || '—'}</p>
          </div>
        ))}
      </div>

      {team.assets?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Allocated Assets ({team.assets.length})</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {team.assets.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-xl">
                <div>
                  <p className="text-sm text-slate-200">{a.name}</p>
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

      {team.projects?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Projects ({team.projects.length})</p>
          <div className="space-y-1.5">
            {team.projects.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-xl">
                <p className="text-sm text-slate-200">{p.name}</p>
                <span className="text-xs text-slate-400 capitalize">{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CreateTeamModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', department: '', lead_name: '', lead_email: '', headcount: '', budget: '', location: '' })
  const { mutate, loading, error } = useMutation(teamsAPI.create)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    try { await mutate(form); onSuccess() } catch {}
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Team">
      <form onSubmit={submit} className="space-y-3">
        {[
          ['name', 'Team Name *', 'text', true, 'AI Research Lab'],
          ['department', 'Department', 'text', false, 'R&D'],
          ['lead_name', 'Team Lead', 'text', false, 'Jane Doe'],
          ['lead_email', 'Lead Email', 'email', false, 'jane@company.com'],
          ['headcount', 'Headcount', 'number', false, '10'],
          ['budget', 'Annual Budget ($)', 'number', false, '500000'],
          ['location', 'Location', 'text', false, 'Building A, Floor 2'],
        ].map(([key, label, type, required, placeholder]) => (
          <div key={key}>
            <label className="label">{label}</label>
            <input className="input" type={type} required={required} placeholder={placeholder}
              value={form[key]} onChange={e => set(key, e.target.value)} />
          </div>
        ))}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </form>
    </Modal>
  )
}