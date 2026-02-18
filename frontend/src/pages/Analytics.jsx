import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { analyticsAPI } from '../api'
import { PageLoader, ErrorState } from '../components/Spinner'
import { fmt } from '../utils/format'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { RefreshCw } from 'lucide-react'
import clsx from 'clsx'

const CHART_STYLE = {
  contentStyle: { background: '#1e293b', border: '1px solid #334155', borderRadius: 12 },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
}

export default function Analytics() {
  const [tab, setTab] = useState('overview')

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
        {[['overview','Overview'],['cost','Cost Analysis']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx('px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              tab === id ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewAnalytics />}
      {tab === 'cost'     && <CostAnalytics />}
    </div>
  )
}

function OverviewAnalytics() {
  const { data, loading, error, refetch } = useApi(() => analyticsAPI.overview())

  if (loading) return <PageLoader />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (!data) return null

  const barData = (data.by_category || []).map(c => ({
    name: c.name.replace(' ', '\n'),
    Available: c.available || 0,
    'In Use': c.in_use || 0,
    color: c.color,
  }))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={refetch} className="btn-ghost p-2"><RefreshCw size={14} /></button>
      </div>

      {/* Category bar chart */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-white text-sm mb-4">Asset Availability by Category</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip {...CHART_STYLE} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="In Use"    fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Total Assets', fmt.number(data.summary?.total_assets), 'text-white'],
          ['Total Value', fmt.currency(data.summary?.total_value), 'text-emerald-400'],
          ['Avg Utilization', fmt.percent(data.summary?.avg_utilization), 'text-blue-400'],
          ['Total Hours Logged', fmt.number(data.summary?.total_hours_logged), 'text-violet-400'],
        ].map(([label, value, cls]) => (
          <div key={label} className="stat-card">
            <p className={`text-2xl font-display font-bold ${cls}`}>{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Idle table */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-white text-sm mb-3">Top Idle Assets (Opportunity Cost)</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Asset</th><th>Category</th><th>Utilization</th><th>Cost/Day</th><th>Days Idle</th><th>Est. Waste/Month</th></tr>
            </thead>
            <tbody>
              {(data.idle_assets || []).map(a => (
                <tr key={a.id}>
                  <td>
                    <p className="font-medium text-slate-200">{a.name}</p>
                    <p className="text-xs font-mono text-slate-500">{a.asset_tag}</p>
                  </td>
                  <td>
                    <span className="badge text-xs" style={{ color: a.color, background: `${a.color}15`, border: `1px solid ${a.color}25` }}>
                      {a.category_name}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${a.utilization_rate || 0}%` }} />
                      </div>
                      <span className="text-xs text-amber-400">{fmt.percent(a.utilization_rate)}</span>
                    </div>
                  </td>
                  <td className="font-mono text-sm">{a.cost_per_day > 0 ? fmt.currency(a.cost_per_day) : '—'}</td>
                  <td className="text-slate-400 text-sm">{a.days_idle != null ? `${a.days_idle}d` : 'Unknown'}</td>
                  <td className="font-mono text-sm text-red-400">
                    {a.cost_per_day > 0 ? fmt.currency(a.cost_per_day * 30 * (1 - (a.utilization_rate || 0) / 100)) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function CostAnalytics() {
  const { data, loading, error, refetch } = useApi(() => analyticsAPI.costAnalysis())

  if (loading) return <PageLoader />
  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (!data) return null

  const teamBarData = (data.by_team || []).map(t => ({
    name: t.team_name?.split(' ').slice(0, 2).join(' ') || 'Unknown',
    'Daily Cost': t.daily_cost || 0,
    'Assets': t.asset_count || 0,
  }))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={refetch} className="btn-ghost p-2"><RefreshCw size={14} /></button>
      </div>

      {/* Cost by team chart */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-white text-sm mb-4">Daily Cost by Team</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={teamBarData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip {...CHART_STYLE} formatter={(val, name) => name === 'Daily Cost' ? fmt.currency(val) : val} />
            <Bar dataKey="Daily Cost" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Wasted cost */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-white text-sm mb-3">Top Waste Opportunities (Underutilized Assets)</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Asset</th><th>Utilization</th><th>Cost/Day</th><th>Wasted Cost/Day</th><th>Wasted/Month</th></tr>
            </thead>
            <tbody>
              {(data.wasted_cost || []).map((a, i) => (
                <tr key={i}>
                  <td>
                    <p className="text-sm text-slate-200 font-medium">{a.name}</p>
                    <p className="text-xs font-mono text-slate-500">{a.asset_tag}</p>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${a.utilization_rate || 0}%` }} />
                      </div>
                      <span className="text-xs text-red-400">{fmt.percent(a.utilization_rate)}</span>
                    </div>
                  </td>
                  <td className="font-mono text-sm">{fmt.currency(a.cost_per_day)}</td>
                  <td className="font-mono text-sm text-amber-400">{fmt.currency(a.wasted_daily)}</td>
                  <td className="font-mono text-sm font-bold text-red-400">{fmt.currency(a.wasted_daily * 30)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* By team table */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-white text-sm mb-3">Cost Breakdown by Team</h3>
        <table className="data-table">
          <thead>
            <tr><th>Team</th><th>Dept</th><th>Assets</th><th>Daily Cost</th><th>Monthly Cost</th></tr>
          </thead>
          <tbody>
            {(data.by_team || []).map((t, i) => (
              <tr key={i}>
                <td className="font-medium text-slate-200">{t.team_name}</td>
                <td className="text-slate-400">{t.department}</td>
                <td className="text-slate-300">{t.asset_count}</td>
                <td className="font-mono text-sm">{fmt.currency(t.daily_cost)}</td>
                <td className="font-mono text-sm text-blue-400">{fmt.currency(t.monthly_cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}