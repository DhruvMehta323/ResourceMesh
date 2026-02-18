import { useState } from 'react'
import { useApi, useMutation } from '../hooks/useApi'
import { assetsAPI, teamsAPI } from '../api'
import { PageLoader, ErrorState } from '../components/Spinner'
import { AssetStatus } from '../components/StatusBadge'
import Modal from '../components/Modal'
import { fmt } from '../utils/format'
import { Plus, Search, Filter, RefreshCw, Server, Eye } from 'lucide-react'
import clsx from 'clsx'

const STATUSES = ['', 'available', 'in_use', 'maintenance', 'retired']

export default function Assets() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [viewing, setViewing] = useState(null)

  const { data: assets, loading, error, refetch } = useApi(
    () => assetsAPI.list({ search: search || undefined, status: statusFilter || undefined, category_id: categoryFilter || undefined }),
    [search, statusFilter, categoryFilter]
  )
  const { data: categories } = useApi(() => assetsAPI.categories())
  const { data: viewAsset, loading: viewLoading } = useApi(
    () => viewing ? assetsAPI.get(viewing) : Promise.resolve(null),
    [viewing], { initialData: null }
  )

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input pl-9" placeholder="Search assets..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select className="input py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.filter(Boolean).map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select className="input py-2 text-sm" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={refetch} className="btn-ghost p-2.5"><RefreshCw size={14} /></button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={14} /> Add Asset
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? <PageLoader /> : error ? <ErrorState message={error} onRetry={refetch} /> : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset</th><th>Category</th><th>Status</th>
                <th>Location</th><th>Utilization</th><th>Cost/Day</th><th>Team</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(assets || []).map(asset => (
                <tr key={asset.id}>
                  <td>
                    <div>
                      <p className="font-medium text-slate-200">{asset.name}</p>
                      <p className="text-xs font-mono text-slate-500">{asset.asset_tag}</p>
                    </div>
                  </td>
                  <td>
                    <span className="badge text-xs px-2 py-1"
                      style={{ color: asset.color, background: `${asset.color}15`, border: `1px solid ${asset.color}30` }}>
                      {asset.category_name}
                    </span>
                  </td>
                  <td><AssetStatus status={asset.status} /></td>
                  <td className="text-slate-400 text-xs">{asset.location || '—'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${asset.utilization_rate || 0}%` }} />
                      </div>
                      <span className="text-xs text-slate-400">{fmt.percent(asset.utilization_rate)}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs text-slate-300">{asset.cost_per_day > 0 ? fmt.currency(asset.cost_per_day) : '—'}</td>
                  <td className="text-xs text-slate-400">{asset.team_name || <span className="text-slate-600">Unassigned</span>}</td>
                  <td>
                    <button onClick={() => setViewing(asset.id)} className="btn-ghost p-1.5 rounded-lg text-xs">
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {(!assets || assets.length === 0) && (
                <tr><td colSpan={8} className="text-center text-slate-500 py-12">No assets found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateAssetModal isOpen={showCreate} onClose={() => setShowCreate(false)}
        categories={categories || []} onSuccess={() => { setShowCreate(false); refetch() }} />

      {/* View Modal */}
      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title="Asset Details" size="lg">
        {viewLoading ? <PageLoader /> : viewAsset ? <AssetDetail asset={viewAsset} /> : null}
      </Modal>
    </div>
  )
}

function AssetDetail({ asset }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display font-bold text-white text-lg">{asset.name}</h3>
          <p className="text-xs font-mono text-slate-500">{asset.asset_tag}</p>
        </div>
        <AssetStatus status={asset.status} />
      </div>
      {asset.description && <p className="text-sm text-slate-400">{asset.description}</p>}

      <div className="grid grid-cols-2 gap-3">
        {[
          ['Category', asset.category_name],
          ['Location', asset.location],
          ['Team', asset.team_name || 'Unassigned'],
          ['Utilization', fmt.percent(asset.utilization_rate)],
          ['Cost/Hour', asset.cost_per_hour > 0 ? fmt.currency(asset.cost_per_hour, 2) : 'N/A'],
          ['Cost/Day', asset.cost_per_day > 0 ? fmt.currency(asset.cost_per_day) : 'N/A'],
          ['Purchase Cost', fmt.currency(asset.purchase_cost)],
          ['Hours Used', fmt.number(asset.total_hours_used)],
        ].map(([label, val]) => (
          <div key={label} className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-sm text-slate-200 mt-1 font-medium">{val || '—'}</p>
          </div>
        ))}
      </div>

      {asset.specifications && Object.keys(asset.specifications).length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Specifications</p>
          <div className="bg-slate-800/50 rounded-xl p-3 font-mono text-xs text-slate-300 space-y-1">
            {Object.entries(asset.specifications).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-slate-500">{k}:</span>
                <span>{Array.isArray(v) ? v.join(', ') : String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {asset.active_allocation && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs font-medium text-blue-400 mb-1">Active Allocation</p>
          <p className="text-sm text-slate-300">
            Team: {asset.active_allocation.team_name}
            {asset.active_allocation.project_name && ` · Project: ${asset.active_allocation.project_name}`}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Since {fmt.date(asset.active_allocation.allocated_at)}
          </p>
        </div>
      )}
    </div>
  )
}

function CreateAssetModal({ isOpen, onClose, categories, onSuccess }) {
  const [form, setForm] = useState({
    name: '', asset_tag: '', category_id: '', status: 'available',
    location: '', description: '', cost_per_hour: '', cost_per_day: '', purchase_cost: ''
  })
  const { mutate, loading, error } = useMutation(assetsAPI.create)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    try {
      await mutate({ ...form, category_id: Number(form.category_id) || undefined })
      onSuccess()
    } catch {}
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Asset" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Asset Name *</label>
            <input className="input" required value={form.name} onChange={e => set('name', e.target.value)} placeholder="NVIDIA A100 Cluster" />
          </div>
          <div>
            <label className="label">Asset Tag</label>
            <input className="input" value={form.asset_tag} onChange={e => set('asset_tag', e.target.value)} placeholder="GPU-010" />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              {['available','in_use','maintenance','retired'].map(s => (
                <option key={s} value={s}>{s.replace('_',' ')}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Location</label>
            <input className="input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Data Center - Rack A1" />
          </div>
          <div>
            <label className="label">Cost/Hour ($)</label>
            <input className="input" type="number" step="0.01" value={form.cost_per_hour} onChange={e => set('cost_per_hour', e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="label">Cost/Day ($)</label>
            <input className="input" type="number" step="0.01" value={form.cost_per_day} onChange={e => set('cost_per_day', e.target.value)} placeholder="0.00" />
          </div>
          <div className="col-span-2">
            <label className="label">Purchase Cost ($)</label>
            <input className="input" type="number" step="0.01" value={form.purchase_cost} onChange={e => set('purchase_cost', e.target.value)} placeholder="0.00" />
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea className="input h-20 resize-none" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Asset'}
          </button>
        </div>
      </form>
    </Modal>
  )
}