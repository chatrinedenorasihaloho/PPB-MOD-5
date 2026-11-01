const queryCache = new Map()
const DEFAULT_STALE_TIME = 30_000

export function getCachedQuery(key, staleTime = DEFAULT_STALE_TIME) {
  const entry = queryCache.get(key)
  if (!entry || entry.data === undefined || Date.now() - entry.updatedAt >= staleTime) {
    return undefined
  }
  return entry.data
}

export function fetchQuery(
  key,
  queryFn,
  { staleTime = DEFAULT_STALE_TIME, force = false, shouldCache = () => true } = {},
) {
  const cached = queryCache.get(key)
  if (!force && cached?.promise) return cached.promise

  const freshData = getCachedQuery(key, staleTime)
  if (!force && freshData !== undefined) return Promise.resolve(freshData)

  const entry = {
    data: cached?.data,
    updatedAt: cached?.updatedAt || 0,
    promise: null,
  }
  const request = Promise.resolve()
    .then(queryFn)
    .then((data) => {
      if (queryCache.get(key) === entry) {
        if (shouldCache(data)) {
          queryCache.set(key, { data, updatedAt: Date.now(), promise: null })
        } else {
          queryCache.delete(key)
        }
      }
      return data
    })
    .catch((error) => {
      if (queryCache.get(key) === entry) {
        if (entry.data !== undefined) {
          queryCache.set(key, { ...entry, promise: null })
        } else {
          queryCache.delete(key)
        }
      }
      throw error
    })

  entry.promise = request
  queryCache.set(key, entry)
  return request
}

export function invalidateQueryCache(prefix) {
  for (const key of queryCache.keys()) {
    if (key.startsWith(prefix)) queryCache.delete(key)
  }
}
