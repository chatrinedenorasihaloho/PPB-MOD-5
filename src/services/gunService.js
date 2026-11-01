import { apiClient, IS_SUPABASE } from '../config/api'
import { invalidateQueryCache } from '../utils/queryCache'

// ---------------------------------------------------------------------------
// Normalizer — standardizes product shape whether received from Supabase
// (public.products) or from the university API (/api/v1/recipes).
// ---------------------------------------------------------------------------
export const normalizeProduct = (item) => {
  if (!item) return null

  // Resolve specifications from Supabase `specs` (text array) or API `ingredients`
  let specsList = []
  if (Array.isArray(item.specs)) {
    specsList = item.specs.map((s, idx) => {
      if (typeof s === 'string') {
        const colonIndex = s.indexOf(':')
        if (colonIndex > -1) {
          return {
            id: `spec-${idx}`,
            name: s.substring(0, colonIndex).trim(),
            quantity: s.substring(colonIndex + 1).trim(),
          }
        }
        return {
          id: `spec-${idx}`,
          name: 'Specification',
          quantity: s.trim(),
        }
      }
      return s
    })
  } else if (Array.isArray(item.ingredients)) {
    specsList = item.ingredients
  }

  // Resolve steps
  const stepsList =
    Array.isArray(item.steps) && item.steps.length > 0
      ? item.steps
      : ['Verify firearm is completely unloaded and point in safe direction.', 'Inspect receiver and mechanism for maintenance.']
  const imageUrls = Array.isArray(item.image_urls)
    ? item.image_urls.filter((url) => typeof url === 'string' && url.length > 0)
    : []
  if (imageUrls.length === 0) {
    const imageUrl = item.image_url || item.image
    if (imageUrl) imageUrls.push(imageUrl)
  }

  return {
    ...item,
    id: item.id,
    archived_at: item.archived_at || null,
    name: item.name || 'Hardware Piece',
    type: item.type || item.category || 'Hardware',
    category: item.type || item.category || 'Hardware',
    caliber: item.caliber || 'Standard',
    price: Number(item.price ?? item.cook_time ?? 0),
    description: item.description || '',
    image_urls: imageUrls.length > 0 ? imageUrls : ['/guns/pistol.svg'],
    image_url: imageUrls[0] || '/guns/pistol.svg',
    image: imageUrls[0] || '/guns/pistol.svg',
    ingredients: specsList,
    steps: stepsList,
  }
}

// ---------------------------------------------------------------------------
// GunService — wraps backend CRUD endpoints.
// Supports both Supabase PostgREST table (/rest/v1/products) and
// standard REST API (/api/v1/recipes).
// ---------------------------------------------------------------------------
class GunService {
  /**
   * Fetch a paginated, filterable list of products.
   */
  async getGuns(params = {}) {
    if (IS_SUPABASE) {
      const queryParts = [
        'select=*',
        `archived_at=${params.archived ? 'not.is.null' : 'is.null'}`,
      ]

      if (params.search) {
        queryParts.push(`name=ilike.*${encodeURIComponent(params.search)}*`)
      }

      if (params.category && params.category !== 'All') {
        queryParts.push(`type=eq.${encodeURIComponent(params.category)}`)
      }

      if (params.sort_by) {
        const order = params.order === 'desc' ? 'desc' : 'asc'
        queryParts.push(`order=${encodeURIComponent(params.sort_by)}.${order}`)
      } else {
        queryParts.push('order=created_at.desc')
      }

      if (params.limit) {
        queryParts.push(`limit=${params.limit}`)
      }

      const queryString = queryParts.join('&')
      const data = await apiClient.get(`/rest/v1/products?${queryString}`)
      const list = Array.isArray(data) ? data.map(normalizeProduct) : []

      return {
        success: true,
        data: list,
        pagination: {
          total: list.length,
          page: params.page || 1,
          limit: params.limit || 50,
        },
      }
    }

    // Fallback: university REST API
    const clean = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v != null),
    )
    return apiClient.get('/api/v1/recipes', { params: clean })
  }

  /**
   * Fetch a single product by ID.
   */
  async getGunById(id) {
    if (IS_SUPABASE) {
      const data = await apiClient.get(`/rest/v1/products?id=eq.${id}&select=*`)
      if (Array.isArray(data) && data.length > 0) {
        return { success: true, data: normalizeProduct(data[0]) }
      }
      throw new Error('Hardware item not found.')
    }
    return apiClient.get(`/api/v1/recipes/${id}`)
  }

  /**
   * Create a new product.
   */
  async createGun(data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : []

      const payload = {
        name: data.name,
        type: data.type || (data.category === 'minuman' ? 'Rifle' : 'Pistol'),
        caliber: data.caliber || '9mm',
        price: Number(data.price ?? data.cook_time ?? 0),
        description: data.description || '',
        specs: specsArray,
        image_urls: Array.isArray(data.image_urls) ? data.image_urls : [],
        image_url: data.image_url || data.image_urls?.[0] || null,
      }

      const res = await apiClient.post('/rest/v1/products', payload, {
        headers: { Prefer: 'return=representation' },
      })
      const created = Array.isArray(res) ? res[0] : res
      invalidateQueryCache('guns:')
      return { success: true, data: normalizeProduct(created) }
    }
    const response = await apiClient.post('/api/v1/recipes', data)
    invalidateQueryCache('guns:')
    return response
  }

  /**
   * Update existing product.
   */
  async updateGun(id, data) {
    if (IS_SUPABASE) {
      const specsArray = Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => `${i.name}: ${i.quantity}`)
        : Array.isArray(data.specs)
        ? data.specs
        : undefined

      const payload = {
        updated_at: new Date().toISOString(),
      }
      if (data.name !== undefined) payload.name = data.name
      if (data.type !== undefined) payload.type = data.type
      if (data.caliber !== undefined) payload.caliber = data.caliber
      if (data.price !== undefined || data.cook_time !== undefined) {
        payload.price = Number(data.price ?? data.cook_time ?? 0)
      }
      if (data.description !== undefined) payload.description = data.description
      if (specsArray !== undefined) payload.specs = specsArray
      if (data.image_urls !== undefined) payload.image_urls = data.image_urls
      if (data.image_url !== undefined) payload.image_url = data.image_url

      const res = await apiClient.patch(`/rest/v1/products?id=eq.${id}`, payload, {
        headers: { Prefer: 'return=representation' },
      })
      const updated = Array.isArray(res) ? res[0] : res
      invalidateQueryCache('guns:')
      return { success: true, data: normalizeProduct(updated) }
    }
    const response = await apiClient.put(`/api/v1/recipes/${id}`, data)
    invalidateQueryCache('guns:')
    return response
  }

  /**
   * Partial update (PATCH).
   */
  async patchGun(id, data) {
    if (IS_SUPABASE) {
      return this.updateGun(id, data)
    }
    return apiClient.patch(`/api/v1/recipes/${id}`, data)
  }

  /**
   * Archive product without removing its data.
   */
  async archiveGun(id) {
    return this.setArchivedAt(id, new Date().toISOString())
  }

  /**
   * Restore an archived product.
   */
  async restoreGun(id) {
    return this.setArchivedAt(id, null)
  }

  async setArchivedAt(id, archivedAt) {
    if (IS_SUPABASE) {
      const currentArchiveState = archivedAt === null ? 'not.is.null' : 'is.null'
      const result = await apiClient.patch(
        `/rest/v1/products?id=eq.${encodeURIComponent(id)}&archived_at=${currentArchiveState}`,
        { archived_at: archivedAt },
        { headers: { Prefer: 'return=representation' } },
      )
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error('Product was not updated. It may already have this archive state, or your Supabase permissions may prevent the change.')
      }
      invalidateQueryCache('guns:')
      return { success: true, data: normalizeProduct(result[0]) }
    }
    if (String(id).startsWith('local-')) {
      throw new Error('Local catalog products cannot be archived on the server.')
    }
    const response = await apiClient.patch(
      `/api/v1/recipes/${encodeURIComponent(id)}`,
      { archived_at: archivedAt },
    )
    invalidateQueryCache('guns:')
    return response
  }

  /**
   * Permanently remove a product. Use only from the archive view.
   */
  async permanentlyDeleteGun(id) {
    if (IS_SUPABASE) {
      const result = await apiClient.delete(
        `/rest/v1/products?id=eq.${encodeURIComponent(id)}&archived_at=not.is.null`,
        { headers: { Prefer: 'return=representation' } },
      )
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error('Only archived products can be permanently deleted. Check its ID and your Supabase permissions.')
      }
      invalidateQueryCache('guns:')
      return { success: true }
    }
    if (String(id).startsWith('local-')) {
      throw new Error('Local catalog products cannot be permanently deleted.')
    }
    const response = await apiClient.delete(`/api/v1/recipes/${encodeURIComponent(id)}`)
    invalidateQueryCache('guns:')
    return response
  }

  // Keep the previous service method as a permanent-delete alias for callers outside this catalog flow.
  async deleteGun(id) {
    return this.permanentlyDeleteGun(id)
  }
}

export default new GunService()
