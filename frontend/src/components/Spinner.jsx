export default function Spinner({ size = 'md', className = '' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size]
  return (
    <div className={`${s} border-2 border-slate-700 border-t-brand-500 rounded-full animate-spin ${className}`} />
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="text-slate-400 text-sm mb-3">{message || 'Something went wrong'}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-secondary text-xs">Retry</button>
        )}
      </div>
    </div>
  )
}