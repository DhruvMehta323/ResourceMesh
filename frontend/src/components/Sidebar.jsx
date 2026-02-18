import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Cpu, Users, FolderKanban,
  Zap, BarChart3, Settings, ChevronRight, Activity
} from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { label: 'Overview',     href: '/',              icon: LayoutDashboard },
  { label: 'Assets',       href: '/assets',        icon: Cpu },
  { label: 'Teams',        href: '/teams',         icon: Users },
  { label: 'Projects',     href: '/projects',      icon: FolderKanban },
  { label: 'Allocations',  href: '/allocations',   icon: Activity },
  { label: 'Match Engine', href: '/matching',      icon: Zap },
  { label: 'Analytics',    href: '/analytics',     icon: BarChart3 },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-[260px] bg-slate-950 border-r border-slate-800/60 flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-900/50">
            <span className="text-white text-sm font-display font-bold">R</span>
          </div>
          <div>
            <p className="font-display font-bold text-white text-sm leading-tight">ResourceMesh</p>
            <p className="text-[10px] text-slate-500 font-mono">Asset Intelligence</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ label, href, icon: Icon }) => (
          <NavLink
            key={href}
            to={href}
            end={href === '/'}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
              isActive
                ? 'bg-brand-600/20 text-brand-400 border border-brand-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'} />
                <span>{label}</span>
                {isActive && <ChevronRight size={12} className="ml-auto text-brand-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-800/60">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse-slow" />
          <span className="text-xs text-emerald-400 font-medium">System Online</span>
        </div>
      </div>
    </aside>
  )
}