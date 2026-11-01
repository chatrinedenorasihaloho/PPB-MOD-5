import { useState, useEffect, useCallback } from 'react'
import gunService from '../services/gunService'
import { fetchQuery, getCachedQuery } from '../utils/queryCache'

// ---------------------------------------------------------------------------
// useGuns — fetch the paginated / filtered product list from the API.
//
// Returns { guns, loading, error, pagination, refetch }.
// When the API is unreachable the `error` string will be set and `guns`
// will remain an empty array so the UI can show a proper error state.
// ---------------------------------------------------------------------------

export function useGuns(params = {}) {
  const queryKey = `guns:list:${JSON.stringify(params)}`
  const cachedResult = getCachedQuery(queryKey)
  const [guns, setGuns] = useState(() => cachedResult?.data || [])
  const [loading, setLoading] = useState(() => cachedResult === undefined)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState(() => cachedResult?.pagination || null)
  const paramKey = JSON.stringify(params)

  const fetchGuns = useCallback(async (force = false) => {
    try {
      if (force || getCachedQuery(queryKey) === undefined) setLoading(true)
      setError(null)

      const response = await fetchQuery(
        queryKey,
        () => gunService.getGuns(params),
        { force, shouldCache: (result) => result.success },
      )

      if (response.success) {
        setGuns(response.data || [])
        setPagination(response.pagination || null)
      } else {
        setError(response.message || 'Failed to fetch products.')
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching products.')
      setGuns([])
    } finally {
      setLoading(false)
    }
    // Params are keyed by their serialized value because callers may create a new object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, paramKey])

  useEffect(() => {
    fetchGuns()
  }, [fetchGuns])

  return { guns, loading, error, pagination, refetch: () => fetchGuns(true) }
}

// ---------------------------------------------------------------------------
// useGunById — fetch a single product by its UUID.
//
// Returns { gun, loading, error, refetch }.
// ---------------------------------------------------------------------------

export function useGunById(id) {
  const queryKey = `guns:detail:${id}`
  const cachedResult = getCachedQuery(queryKey)
  const [gun, setGun] = useState(() => cachedResult?.data || null)
  const [loading, setLoading] = useState(() => Boolean(id) && cachedResult === undefined)
  const [error, setError] = useState(null)

  const fetchGun = useCallback(async (force = false) => {
    if (!id) {
      setLoading(false)
      return
    }
    try {
      if (force || getCachedQuery(queryKey) === undefined) setLoading(true)
      setError(null)

      const response = await fetchQuery(
        queryKey,
        () => gunService.getGunById(id),
        { force, shouldCache: (result) => result.success },
      )

      if (response.success) {
        setGun(response.data)
      } else {
        setError(response.message || 'Product not found.')
      }
    } catch (err) {
      setError(err.message || 'Failed to load product details.')
      setGun(null)
    } finally {
      setLoading(false)
    }
  }, [id, queryKey])

  useEffect(() => {
    fetchGun()
  }, [fetchGun])

  return { gun, loading, error, refetch: () => fetchGun(true) }
}
