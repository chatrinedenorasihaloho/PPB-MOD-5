import { apiClient, IS_SUPABASE } from '../config/api'
import { invalidateQueryCache } from '../utils/queryCache'

// ---------------------------------------------------------------------------
// ReviewService — product reviews & ratings.
// Supports both Supabase (public.reviews) and university API (/api/v1/recipes/:id/reviews).
// ---------------------------------------------------------------------------

class ReviewService {
  /**
   * Fetch all reviews for a given product.
   */
  async getReviews(gunId, userId) {
    if (IS_SUPABASE) {
      const productId = encodeURIComponent(gunId)
      const [data, votes] = await Promise.all([
        apiClient.get(
          `/rest/v1/reviews?product_id=eq.${productId}&select=*&order=created_at.desc`,
        ),
        apiClient.get(
          `/rest/v1/review_votes?product_id=eq.${productId}&select=review_id,user_id,vote`,
        ),
      ])
      const voteMap = new Map()
      for (const vote of Array.isArray(votes) ? votes : []) {
        const key = String(vote.review_id)
        const current = voteMap.get(key) || { upvotes: 0, downvotes: 0, userVote: null }
        if (Number(vote.vote) === 1) current.upvotes += 1
        if (Number(vote.vote) === -1) current.downvotes += 1
        if (String(vote.user_id) === String(userId)) current.userVote = Number(vote.vote)
        voteMap.set(key, current)
      }

      const list = (Array.isArray(data) ? data : []).map((r) => {
        const reviewVotes = voteMap.get(String(r.id))
        return {
          id: r.id,
          product_id: r.product_id,
          user_id: r.user_id || null,
          user_identifier: r.user_id ? `Operator ${String(r.user_id).substring(0, 8)}` : 'Anonymous',
          rating: r.rating,
          comment: r.comment || '',
          created_at: r.created_at,
          upvotes: reviewVotes?.upvotes || 0,
          downvotes: reviewVotes?.downvotes || 0,
          user_vote: reviewVotes?.userVote ?? null,
        }
      })

      return { success: true, data: list }
    }

    const response = await apiClient.get(`/api/v1/recipes/${gunId}/reviews`)
    if (Array.isArray(response?.data)) {
      return {
        ...response,
        data: response.data.map((review) => ({
          ...review,
          user_id: review.user_id || review.user_identifier || null,
          upvotes: Number(review.upvotes) || 0,
          downvotes: Number(review.downvotes) || 0,
          user_vote: review.user_vote ?? null,
        })),
      }
    }
    return response
  }

  /**
   * Submit a new review.
   * @param {string|number} gunId
   * @param {Object} reviewData  { user_identifier, rating, comment }
   */
  async createReview(gunId, reviewData) {
    if (IS_SUPABASE) {
      const payload = {
        product_id: Number(gunId),
        user_id: reviewData.user_id || reviewData.user_identifier,
        rating: Number(reviewData.rating),
        comment: reviewData.comment || '',
      }

      const res = await apiClient.post('/rest/v1/reviews', payload, {
        headers: { Prefer: 'return=representation' },
      })
      const created = Array.isArray(res) ? res[0] : res
      invalidateQueryCache(`reviews:${gunId}`)
      return { success: true, data: created }
    }

    const response = await apiClient.post(`/api/v1/recipes/${gunId}/reviews`, reviewData)
    invalidateQueryCache(`reviews:${gunId}`)
    return response
  }

  /**
   * Edit an existing review.
   */
  async updateReview(reviewId, reviewData) {
    if (!reviewData.user_id && !reviewData.user_identifier) {
      throw new Error('Review owner identity is required.')
    }
    if (IS_SUPABASE) {
      const res = await apiClient.patch(
        `/rest/v1/reviews?id=eq.${encodeURIComponent(reviewId)}&user_id=eq.${encodeURIComponent(reviewData.user_id)}`,
        {
          rating: Number(reviewData.rating),
          comment: reviewData.comment || '',
        },
        { headers: { Prefer: 'return=representation' } },
      )
      if (!Array.isArray(res) || res.length === 0) {
        throw new Error('Review was not updated. Only its author can edit it.')
      }
      invalidateQueryCache('reviews:')
      return { success: true, data: res[0] }
    }

    const response = await apiClient.put(
      `/api/v1/reviews/${encodeURIComponent(reviewId)}`,
      reviewData,
    )
    invalidateQueryCache('reviews:')
    return response
  }

  /**
   * Delete a review.
   */
  async deleteReview(reviewId, userId) {
    if (!userId) throw new Error('Review owner identity is required.')
    if (IS_SUPABASE) {
      const result = await apiClient.delete(
        `/rest/v1/reviews?id=eq.${encodeURIComponent(reviewId)}&user_id=eq.${encodeURIComponent(userId)}`,
        { headers: { Prefer: 'return=representation' } },
      )
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error('Review was not deleted. Only its author can delete it.')
      }
      invalidateQueryCache('reviews:')
      return { success: true }
    }

    const response = await apiClient.delete(
      `/api/v1/reviews/${encodeURIComponent(reviewId)}`,
      { params: { user_identifier: userId } },
    )
    invalidateQueryCache('reviews:')
    return response
  }

  async setReviewVote(reviewId, productId, userId, vote) {
    if (!reviewId || !productId || !userId) {
      throw new Error('Review, product, and user IDs are required to vote.')
    }
    if (vote !== null && vote !== 1 && vote !== -1) {
      throw new Error('Vote must be 1, -1, or null.')
    }

    if (IS_SUPABASE) {
      const review = encodeURIComponent(reviewId)
      const user = encodeURIComponent(userId)
      if (vote === null) {
        await apiClient.delete(
          `/rest/v1/review_votes?review_id=eq.${review}&user_id=eq.${user}`,
        )
      } else {
        await apiClient.post(
          '/rest/v1/review_votes?on_conflict=review_id,user_id',
          {
            review_id: String(reviewId),
            product_id: String(productId),
            user_id: userId,
            vote,
            updated_at: new Date().toISOString(),
          },
          {
            headers: {
              Prefer: 'resolution=merge-duplicates,return=minimal',
            },
          },
        )
      }
      invalidateQueryCache(`reviews:${productId}`)
      return { success: true }
    }

    const response = vote === null
      ? await apiClient.delete(`/api/v1/reviews/${encodeURIComponent(reviewId)}/vote`, {
          params: { user_identifier: userId },
        })
      : await apiClient.put(`/api/v1/reviews/${encodeURIComponent(reviewId)}/vote`, {
          user_identifier: userId,
          product_id: productId,
          vote,
        })
    invalidateQueryCache(`reviews:${productId}`)
    return response
  }
}

export default new ReviewService()
