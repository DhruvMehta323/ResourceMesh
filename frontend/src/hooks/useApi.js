import { useState, useEffect, useCallback } from 'react'

export function useApi(apiFn, deps = [], opts = {}) {
  const { immediate = true, initialData = null } = opts
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState(null)

  const execute = useCallback(async (...args) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFn(...args)
      setData(result)
      return result
    } catch (e) {
      setError(e.message || 'Request failed')
      throw e
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => {
    if (immediate) execute()
  }, [execute, immediate])

  const refetch = useCallback(() => execute(), [execute])

  return { data, loading, error, execute, refetch }
}

export function useMutation(apiFn) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async (data) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiFn(data)
      return result
    } catch (e) {
      setError(e.message || 'Operation failed')
      throw e
    } finally {
      setLoading(false)
    }
  }, [apiFn])

  return { mutate, loading, error }
}