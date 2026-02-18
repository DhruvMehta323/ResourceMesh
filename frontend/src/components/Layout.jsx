import Sidebar from './Sidebar'
import { useLocation } from 'react-router-dom'

const pageTitles = {
  '/':            { title: 'Overview',         sub: 'Your enterprise resource dashboard' },
  '/assets':      { title: 'Assets',           sub: 'Discover and manage all enterprise resources' },
  '/teams':       { title: 'Teams',            sub: 'Departments and their resource footprint' },
  '/projects':    { title: 'Projects',         sub: 'Active and planned project portfolio' },
  '/allocations': { title: 'Allocations',      sub: 'Track who is using what, right now' },
  '/matching':    { title: 'Match Engine',     sub: 'AI-powered resource allocation optimizer' },
  '/analytics':   { title: 'Analytics',        sub: 'Utilization trends and cost intelligence' },
}

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const meta = pageTitles[pathname] || { title: 'ResourceMesh', sub: '' }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 ml-[260px] flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 px-8 py-5 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm">
          <h1 className="font-display font-bold text-xl text-white">{meta.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{meta.sub}</p>
        </header>
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 page-enter">
          {children}
        </div>
      </main>
    </div>
  )
}