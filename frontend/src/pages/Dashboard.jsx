import { useApi } from '../hooks/useApi'
import { analyticsAPI } from '../api'
import { PageLoader, ErrorState } from '../components/Spinner'
import { AssetStatus } from '../components/StatusBadge'
import { fmt } from '../utils/format'
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip
} from 'recharts'
import {
  Server, DollarSign, Activity, AlertTriangle,
  TrendingUp, Package, Cpu, Users, RefreshCw
} from 'lucide-react'

const STATUS_COLORS = {
  available: '#10b981', in_use: '#3b82f6',
  maintenance: '#f59e0b', retired: '#64748b'
}

export default function Dashboard() {
  const { data, loading, error, refetch } = useApi(() => analyticsAPI.overview())

  if (loading) return <PageLoader />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (!data) return null

  const { summary, status_breakdown, by_category, idle_assets, recent_activity, active_allocations, active_projects } = data

  const pieData = (status_breakdown || []).map(s => ({
    name: s.status, value: s.count, fill: STATUS_COLORS[s.status] || '#6366f1'
  }))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Server size={20} className="text-brand-400" />}
          label="Total Assets" value={fmt.number(summary?.total_assets)}
          sub={`${active_allocations} currently allocated`}
          color="brand"
        />
        <StatCard
          icon={<DollarSign size={20} className="text-emerald-400" />}
          label="Portfolio Value" value={fmt.currency(summary?.total_value)}
          sub="Total asset investment"
          color="emerald"
        />
        <StatCard
          icon={<Activity size={20} className="text-blue-400" />}
          label="Avg Utilization" value={fmt.percent(summary?.avg_utilization)}
          sub={`${active_projects} active projects`}
          color="blue"
        />
        <StatCard
          icon={<AlertTriangle size={20} className="text-amber-400" />}
          label="Idle Assets" value={idle_assets?.length || 0}
          sub="Under 20% utilization"
          color="amber"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status pie */}
        <div className="card p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-4">Asset Status</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                dataKey="value" paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {pieData.map(p => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
                  <span className="text-slate-400 capitalize">{p.name.replace('_', ' ')}</span>
                </div>
                <span className="text-slate-300 font-medium">{p.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Category */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-display font-semibold text-white text-sm mb-4">By Category</h3>
          <div className="space-y-3">
            {(by_category || []).map(cat => (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                    <span className="text-sm text-slate-300">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="text-emerald-400">{cat.available} free</span>
                    <span className="text-blue-400">{cat.in_use} used</span>
                    <span className="text-slate-400">{cat.total} total</span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${cat.total > 0 ? (cat.in_use / cat.total) * 100 : 0}%`,
                      background: cat.color
                    }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Idle Assets */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white text-sm">Idle Assets</h3>
            <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/20">
              {idle_assets?.length} assets
            </span>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(idle_assets || []).map(asset => (
              <div key={asset.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors">
                <div>
                  <p className="text-sm text-slate-200 font-medium">{asset.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-slate-500">{asset.asset_tag}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md border text-xs"
                      style={{ color: asset.color, borderColor: `${asset.color}30`, background: `${asset.color}10` }}>
                      {asset.category_name}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-amber-400">{fmt.percent(asset.utilization_rate)} util.</p>
                  <p className="text-[10px] text-slate-500">{asset.days_idle ? `${asset.days_idle}d idle` : 'Never used'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white text-sm">Recent Activity</h3>
            <button onClick={refetch} className="btn-ghost p-1.5 rounded-lg">
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(recent_activity || []).map(log => (
              <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-slate-800/50 last:border-0">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  log.action === 'allocated' ? 'bg-blue-400' :
                  log.action === 'released' ? 'bg-emerald-400' :
                  log.action.includes('maintenance') ? 'bg-amber-400' : 'bg-slate-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 truncate">
                    <span className="font-medium capitalize">{log.action.replace('_', ' ')}</span>
                    {' — '}{log.asset_name}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {log.team_name && `${log.team_name} · `}{fmt.relativeDate(log.logged_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color }) {
  const colors = {
    brand: 'bg-brand-500/10 border-brand-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
  }
  return (
    <div className="stat-card">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-display font-bold text-white">{value}</p>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="text-[10px] text-slate-600 mt-0.5">{sub}</p>
    </div>
  )
}