import { useState } from 'react'
import { useApi, useMutation } from '../hooks/useApi'
import { matchingAPI, assetsAPI, projectsAPI } from '../api'
import { PageLoader, ErrorState } from '../components/Spinner'
import { fmt } from '../utils/format'
import { Zap, Target, AlertTriangle, TrendingUp, ChevronRight, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

const TABS = [
  { id: 'gap', label: 'Gap Analysis', icon: AlertTriangle },
  { id: 'optimize', label: 'Optimize Project', icon: Target },
  { id: 'urgent', label: 'Urgent Match', icon: Zap },
  { id: 'demand', label: 'Demand Scores', icon: TrendingUp },
]

export default function Matching() {
  const [tab, setTab] = useState('gap')

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === id ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200')}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'gap'      && <GapAnalysis />}
      {tab === 'optimize' && <OptimizeProject />}
      {tab === 'urgent'   && <UrgentMatch />}
      {tab === 'demand'   && <DemandScores />}
    </div>
  )
}

// ── Gap Analysis ──────────────────────────────────────────────────────────
function GapAnalysis() {
  const { data, loading, error, refetch } = useApi(() => matchingAPI.gapAnalysis())

  if (loading) return <PageLoader />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (!data) return null

  const scoreColor = data.gap_score > 0.8 ? 'text-emerald-400' : data.gap_score > 0.5 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="space-y-4">
      <div className="card p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Overall Resource Coverage</p>
          <p className={`text-4xl font-display font-bold mt-1 ${scoreColor}`}>
            {fmt.percent(data.gap_score * 100)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {data.total_available_matching} of {data.total_required} required assets available
          </p>
        </div>
        <button onClick={refetch} className="btn-ghost p-2"><RefreshCw size={15} /></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Unmet */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-red-400 rounded-full" />
            <h3 className="text-sm font-semibold text-white">Unmet Needs ({data.unmet_requirements?.length})</h3>
          </div>
          <div className="space-y-2">
            {(data.unmet_requirements || []).map(r => (
              <div key={r.category_id} className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-200 font-medium">{r.category_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Need {r.needed}, have {r.available}
                    </p>
                  </div>
                  <span className="text-xs text-red-400 font-mono">-{r.shortage}</span>
                </div>
              </div>
            ))}
            {(!data.unmet_requirements || data.unmet_requirements.length === 0) && (
              <p className="text-sm text-emerald-400 text-center py-4">✓ All requirements met!</p>
            )}
          </div>
        </div>

        {/* Met */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
            <h3 className="text-sm font-semibold text-white">Met ({data.met_requirements?.length})</h3>
          </div>
          <div className="space-y-2">
            {(data.met_requirements || []).map(r => (
              <div key={r.category_id} className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm text-slate-200">{r.category_name}</p>
                    <p className="text-xs text-slate-500">Need {r.needed}, have {r.available}</p>
                  </div>
                  {r.surplus > 0 && <span className="text-xs text-emerald-400">+{r.surplus} spare</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Over-provisioned */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-amber-400 rounded-full" />
            <h3 className="text-sm font-semibold text-white">Over-provisioned ({data.over_provisioned?.length})</h3>
          </div>
          <div className="space-y-2">
            {(data.over_provisioned || []).map(r => (
              <div key={r.category_id} className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                <p className="text-sm text-slate-200">{r.category_name}</p>
                <p className="text-xs text-amber-400 mt-0.5">{r.surplus} assets idle, no project needs them</p>
              </div>
            ))}
            {(!data.over_provisioned || data.over_provisioned.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-4">No over-provisioned assets</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Optimize Project ──────────────────────────────────────────────────────
function OptimizeProject() {
  const [projectId, setProjectId] = useState('')
  const { data: projects } = useApi(() => projectsAPI.list({ status: 'planning' }))
  const { data: result, loading, execute, error } = useApi(
    () => projectId ? matchingAPI.optimizeForProject(projectId) : Promise.resolve(null),
    [projectId], { initialData: null, immediate: false }
  )

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-3">DP-Optimized Asset Selection</h3>
        <p className="text-sm text-slate-400 mb-4">
          Uses dynamic programming (0/1 knapsack) to find the best asset combination for a project — maximizing coverage within budget.
        </p>
        <div className="flex gap-3">
          <select className="input flex-1" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">Select a project</option>
            {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => execute()} disabled={!projectId || loading} className="btn-primary">
            {loading ? 'Optimizing...' : 'Run Optimizer'}
          </button>
        </div>
      </div>

      {error && <div className="card p-4 border-red-500/20"><p className="text-red-400 text-sm">{error}</p></div>}

      {result && (
        <div className="space-y-4">
          {/* Score */}
          <div className="card p-5 flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-emerald-400">
                {fmt.percent((result.coverage_score || 0) * 100)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Coverage Score</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-blue-400">
                {fmt.currency(result.total_cost_per_day)}/day
              </p>
              <p className="text-xs text-slate-500 mt-1">Estimated Cost</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-white">
                {result.selected_asset_ids?.length || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">Assets Selected</p>
            </div>
          </div>

          {/* Selected assets */}
          {result.selected_assets?.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Recommended Assets</h3>
              <div className="space-y-2">
                {result.selected_assets.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-3 px-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: a.color }} />
                      <div>
                        <p className="text-sm text-slate-200 font-medium">{a.name}</p>
                        <p className="text-xs font-mono text-slate-500">{a.asset_tag} · {a.category_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-slate-300">{fmt.currency(a.cost_per_day)}/day</p>
                      <p className="text-xs text-emerald-400">{fmt.percent(a.utilization_rate)} util.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Urgent Match ──────────────────────────────────────────────────────────
function UrgentMatch() {
  const [form, setForm] = useState({ category_id: '', quantity: 1, max_daily_cost: '' })
  const { data: categories } = useApi(() => import('../api').then(m => m.assetsAPI.categories()))
  const { mutate, loading, error } = useMutation(matchingAPI.urgentMatch)
  const [result, setResult] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    try {
      const r = await mutate({ ...form, category_id: Number(form.category_id), max_daily_cost: Number(form.max_daily_cost) || 9999 })
      setResult(r)
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-1">Greedy Urgent Matcher</h3>
        <p className="text-sm text-slate-400 mb-4">Find the best available asset in real-time using composite scoring.</p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Category *</label>
              <select className="input" required value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                <option value="">Select type</option>
                {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
            <div>
              <label className="label">Max Cost/Day ($)</label>
              <input className="input" type="number" value={form.max_daily_cost} onChange={e => set('max_daily_cost', e.target.value)} placeholder="Unlimited" />
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-fit">
            <Zap size={14} />
            {loading ? 'Searching...' : 'Find Best Match'}
          </button>
        </form>
      </div>

      {result && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-3">
            {result.total_found} Matches Found
          </h3>
          <div className="space-y-3">
            {result.matches.map((m, i) => (
              <div key={m.asset_id} className={clsx(
                'flex items-center justify-between p-4 rounded-xl border transition-all',
                i === 0 ? 'bg-brand-600/10 border-brand-500/30' : 'bg-slate-800/50 border-slate-700/50'
              )}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {i === 0 && <span className="badge bg-brand-500/20 text-brand-400 border border-brand-500/20 text-[10px]">Best Match</span>}
                    <p className="text-sm font-medium text-slate-200">{m.asset_name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>Spec: {fmt.percent(m.spec_match * 100)}</span>
                    <span>Avail: {fmt.percent(m.availability * 100)}</span>
                    <span>Cost eff: {fmt.percent(m.cost_efficiency * 100)}</span>
                  </div>
                  {m.reasons.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {m.reasons.map(r => <span key={r} className="text-[10px] px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">{r}</span>)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-display font-bold text-white">{fmt.percent(m.score * 100)}</p>
                  <p className="text-xs text-slate-500">{fmt.currency(m.cost_per_day)}/day</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Demand Scores ─────────────────────────────────────────────────────────
function DemandScores() {
  const { data, loading, error, refetch } = useApi(() => matchingAPI.demandScores())

  if (loading) return <PageLoader />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-semibold text-white">PageRank Demand Scores</h3>
            <p className="text-sm text-slate-400 mt-0.5">Assets that get requested by high-utilization teams score higher.</p>
          </div>
          <button onClick={refetch} className="btn-ghost p-2"><RefreshCw size={14} /></button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr><th>Rank</th><th>Asset</th><th>Status</th><th>Demand Score</th><th>Signal</th></tr>
          </thead>
          <tbody>
            {(data || []).map((item, i) => (
              <tr key={item.asset_id}>
                <td className="font-mono text-slate-500 text-sm">#{i + 1}</td>
                <td className="font-medium text-slate-200">{item.asset_name}</td>
                <td>
                  <span className={`badge ${
                    item.status === 'available' ? 'status-available' :
                    item.status === 'in_use' ? 'status-in_use' : 'status-maintenance'
                  }`}>{item.status?.replace('_', ' ')}</span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full"
                        style={{ width: `${(item.demand_score || 0) * 100}%` }} />
                    </div>
                    <span className="font-mono text-xs text-slate-300">{(item.demand_score || 0).toFixed(4)}</span>
                  </div>
                </td>
                <td>
                  {item.demand_score > 0.7 ? <span className="text-xs text-amber-400">🔥 Hot</span> :
                   item.demand_score > 0.4 ? <span className="text-xs text-blue-400">📈 Active</span> :
                   <span className="text-xs text-slate-500">💤 Low</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}