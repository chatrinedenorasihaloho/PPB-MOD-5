import { useState, useEffect, useCallback } from 'react'
import reviewService from '../services/reviewService'
import { fetchQuery, getCachedQuery } from '../utils/queryCache'
import { getUserIdentifier } from '../services/userService'

// ---------------------------------------------------------------------------
// useReviews — fetch reviews for a specific product.
// ---------------------------------------------------------------------------

export function useReviews(gunId) {
  const userId = getUserIdentifier()
  const queryKey = `reviews:${gunId}:${userId}`
  const cachedReviews = getCachedQuery(queryKey)
  const [reviews, setReviews] = useState(() => cachedReviews || [])
  const [loading, setLoading] = useState(() => Boolean(gunId) && cachedReviews === undefined)
  const [error, setError] = useState(null)

  const fetchReviews = useCallback(async (force = false) => {
    if (!gunId) {
      setLoading(false)
      return
    }
    try {
      if (force || getCachedQuery(queryKey) === undefined) setLoading(true)
      setError(null)

      const response = await fetchQuery(
        queryKey,
        () => reviewService.getReviews(gunId, userId),
        { force, shouldCache: (result) => result.success },
      )

      if (response.success) {
        setReviews(response.data || [])
      } else {
        setError(response.message || 'Failed to fetch reviews.')
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching reviews.')
      setReviews([])
    } finally {
      setLoading(false)
    }
  }, [gunId, queryKey, userId])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  return { reviews, loading, error, refetch: () => fetchReviews(true) }
}

// ---------------------------------------------------------------------------
// useCreateReview — submit a new review for a product.
// ---------------------------------------------------------------------------

export function useCreateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const createReview = async (gunId, reviewData) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const response = await reviewService.createReview(gunId, reviewData)

      if (response.success) {
        setSuccess(true)
        return response.data
      } else {
        setError(response.message || 'Failed to submit review.')
        return null
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting review.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createReview, loading, error, success }
}

export function useReviewActions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const runAction = async (action) => {
    try {
      setLoading(true)
      setError(null)
      return await action()
    } catch (err) {
      setError(err.message || 'Could not update review.')
      return false
    } finally {
      setLoading(false)
    }
  }

  const updateReview = (reviewId, data) =>
    runAction(() => reviewService.updateReview(reviewId, data))
  const deleteReview = (reviewId, userId) =>
    runAction(() => reviewService.deleteReview(reviewId, userId))
  const voteReview = (reviewId, productId, userId, vote) =>
    runAction(() => reviewService.setReviewVote(reviewId, productId, userId, vote))

  return { updateReview, deleteReview, voteReview, loading, error }
}
