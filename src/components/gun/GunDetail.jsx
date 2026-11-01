import { useState } from 'react'
import {
  ArrowLeft,
  Archive,
  Check,
  Pencil,
  RotateCcw,
  Star,
  Send,
  Loader,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import ShareButton from '../common/ShareButton'
import WhatsAppContactButton from '../common/WhatsAppContactButton'
import { useReviews, useCreateReview, useReviewActions } from '../../hooks/useReviews'
import { getUserIdentifier } from '../../services/userService'
import { formatPrice, averageRating } from '../../utils/helpers'
import ConfirmModal from '../modals/ConfirmModal'

/**
 * Full-screen product detail view.
 *
 * @param {Object}   props
 * @param {Object}   props.gun       — product data
 * @param {Function} props.onBack    — return to catalog
 * @param {Function} [props.onEdit]  — navigate to edit page
 * @param {Function} [props.onArchive]— archive an active product
 * @param {Function} [props.onRestore]— restore an archived product
 * @param {Function} [props.onPermanentDelete]— permanently delete an archived product
 */
export default function GunDetail({
  gun,
  onBack,
  onEdit,
  onArchive,
  onRestore,
  onPermanentDelete,
  archived = false,
}) {
  const imageUrls = Array.isArray(gun.image_urls) && gun.image_urls.length > 0
    ? gun.image_urls
    : [gun.image_url || gun.image || '/guns/pistol.svg']
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0
  const [selectedImage, setSelectedImage] = useState({ gunId: null, index: 0 })
  const selectedImageIndex = selectedImage.gunId === gun.id ? selectedImage.index : 0

  // Reviews
  const { reviews, loading: reviewsLoading, refetch: refetchReviews } = useReviews(gun.id)
  const { createReview, loading: submitting } = useCreateReview()
  const {
    updateReview,
    deleteReview,
    voteReview,
    loading: reviewActionLoading,
    error: reviewActionError,
  } = useReviewActions()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')
  const [editingReview, setEditingReview] = useState(null)
  const [deleteReviewTarget, setDeleteReviewTarget] = useState(null)
  const currentUserId = getUserIdentifier()

  const avgRating = gun.average_rating || averageRating(reviews)
  const reviewCount = gun.review_count ?? reviews.length

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setReviewError('')
    setReviewSuccess('')

    if (rating < 1 || rating > 5) {
      setReviewError('Rating must be between 1 and 5.')
      return
    }

    const result = await createReview(gun.id, {
      user_identifier: currentUserId,
      rating,
      comment: comment.trim(),
    })

    if (result) {
      setReviewSuccess('Review submitted!')
      setComment('')
      setRating(5)
      refetchReviews()
    } else {
      setReviewError('Could not submit review. The server may be unavailable.')
    }
  }

  const beginEditReview = (review) => {
    setEditingReview({
      id: review.id,
      rating: Number(review.rating),
      comment: review.comment || '',
    })
    setReviewError('')
  }

  const handleUpdateReview = async (event) => {
    event.preventDefault()
    if (!editingReview || editingReview.rating < 1 || editingReview.rating > 5) {
      setReviewError('Rating must be between 1 and 5.')
      return
    }

    const result = await updateReview(editingReview.id, {
      rating: editingReview.rating,
      comment: editingReview.comment.trim(),
      user_id: currentUserId,
      user_identifier: currentUserId,
    })
    if (!result) return

    setEditingReview(null)
    setReviewSuccess('Review updated.')
    await refetchReviews()
  }

  const handleDeleteReview = async () => {
    if (!deleteReviewTarget) return
    const result = await deleteReview(deleteReviewTarget.id, currentUserId)
    if (!result) return

    setDeleteReviewTarget(null)
    setReviewSuccess('Review deleted.')
    await refetchReviews()
  }

  const handleVote = async (review, vote) => {
    const nextVote = Number(review.user_vote) === vote ? null : vote
    const result = await voteReview(review.id, gun.id, currentUserId, nextVote)
    if (result) await refetchReviews()
  }

  return (
    <div className="detail">
      {/* Back button */}
      <button type="button" className="detail-back" onClick={onBack}>
        <ArrowLeft size={18} /> Back to Catalog
      </button>

      {/* Hero */}
      <div className="detail-hero">
        <div className="detail-gallery">
          <img
            className="detail-img"
            src={imageUrls[selectedImageIndex] || imageUrls[0]}
            alt={`${gun.name} — image ${selectedImageIndex + 1}`}
            loading="lazy"
            decoding="async"
          />
          {imageUrls.length > 1 && (
            <div className="detail-gallery-thumbnails" aria-label="Product images">
              {imageUrls.map((url, index) => (
                <button
                  type="button"
                  className={`detail-gallery-thumbnail ${index === selectedImageIndex ? 'active' : ''}`}
                  key={`${url}-${index}`}
                  onClick={() => setSelectedImage({ gunId: gun.id, index })}
                  aria-label={`View image ${index + 1} of ${imageUrls.length}`}
                  aria-pressed={index === selectedImageIndex}
                >
                  <img src={url} alt="" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-info">
          <h1 className="display">{gun.name}</h1>
          <p className="type">
            {category}
            {caliber ? ` · ${caliber}` : ''}
          </p>
          <p className="price detail-price">{formatPrice(price)}</p>

          {avgRating > 0 && (
            <p className="detail-rating">
              <Star size={16} fill="var(--brass)" stroke="var(--brass)" />
              {avgRating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
            </p>
          )}

          <div className="detail-actions">
            {!archived && <FavoriteButton gunId={gun.id || gun.name} />}
            {!archived && <ShareButton gun={gun} />}
            {!archived && <WhatsAppContactButton gun={gun} />}
            {!archived && onEdit && (
              <button type="button" className="btn btn--outline" onClick={() => onEdit(gun)}>
                Edit
              </button>
            )}
            {!archived && onArchive && (
              <button type="button" className="btn btn--outline" onClick={() => onArchive(gun)}>
                <Archive size={16} /> Archive
              </button>
            )}
            {archived && onRestore && (
              <button type="button" className="btn btn--outline" onClick={() => onRestore(gun)}>
                <RotateCcw size={16} /> Restore
              </button>
            )}
            {archived && onPermanentDelete && (
              <button type="button" className="btn btn--danger" onClick={() => onPermanentDelete(gun)}>
                <Trash2 size={16} /> Delete Permanently
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <section className="detail-section">
        <h2>Description</h2>
        <p>{gun.description || 'No description available.'}</p>
      </section>

      {/* Specifications (from ingredients / steps if present) */}
      {gun.ingredients && gun.ingredients.length > 0 && (
        <section className="detail-section">
          <h2>Specifications</h2>
          <ul className="detail-specs">
            {gun.ingredients.map((ing, i) => (
              <li key={ing.id || i}>
                <strong>{ing.name}</strong> — {ing.quantity}
              </li>
            ))}
          </ul>
        </section>
      )}

      {gun.steps && gun.steps.length > 0 && (
        <section className="detail-section">
          <h2>Assembly / Maintenance Steps</h2>
          <ol className="detail-steps">
            {gun.steps.map((step, i) => (
              <li key={step.id || i}>
                {step.instruction || step}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Reviews Section */}
      <section className="detail-section">
        <h2>Reviews</h2>

        {/* Submit review */}
        {!archived && <form className="review-form" onSubmit={handleSubmitReview}>
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="star-btn"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  size={22}
                  fill={n <= rating ? 'var(--brass)' : 'none'}
                  stroke={n <= rating ? 'var(--brass)' : 'var(--steel)'}
                />
              </button>
            ))}
          </div>

          <textarea
            className="review-input"
            rows="3"
            placeholder="Write a short review (optional)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />

          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || !gun.id}
          >
            {submitting ? (
              <><Loader size={16} className="spin" /> Submitting…</>
            ) : (
              <><Send size={16} /> Submit Review</>
            )}
          </button>

          {reviewError && <p className="form-error">{reviewError}</p>}
          {reviewSuccess && <p className="form-success">{reviewSuccess}</p>}
          {!gun.id && (
            <p className="form-hint">
              Reviews require a server-generated product ID. This product is local-only.
            </p>
          )}
        </form>}

        {/* Existing reviews */}
        {reviewsLoading ? (
          <p className="detail-loading">Loading reviews…</p>
        ) : reviews.length > 0 ? (
          <ul className="review-list">
            {reviews.map((rev) => (
              <li key={rev.id} className="review-item">
                <div className="review-head">
                  <div className="review-head__author">
                    <span className="review-user">{rev.user_identifier || 'Anonymous'}</span>
                    {String(rev.user_id) === String(currentUserId) && (
                      <span className="review-own-badge">Your review</span>
                    )}
                  </div>
                  <span className="review-stars-display">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i < rev.rating ? 'var(--brass)' : 'none'}
                        stroke={i < rev.rating ? 'var(--brass)' : 'var(--line)'}
                      />
                    ))}
                  </span>
                </div>
                {editingReview?.id === rev.id ? (
                  <form className="review-edit-form" onSubmit={handleUpdateReview}>
                    <div className="review-stars" aria-label="Edit review rating">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className="star-btn"
                          onClick={() => setEditingReview((current) => ({ ...current, rating: n }))}
                          aria-label={`${n} star${n > 1 ? 's' : ''}`}
                        >
                          <Star
                            size={20}
                            fill={n <= editingReview.rating ? 'var(--brass)' : 'none'}
                            stroke={n <= editingReview.rating ? 'var(--brass)' : 'var(--steel)'}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="review-input"
                      rows="3"
                      value={editingReview.comment}
                      onChange={(event) => setEditingReview((current) => ({
                        ...current,
                        comment: event.target.value,
                      }))}
                      maxLength={500}
                      aria-label="Edit review comment"
                    />
                    <div className="review-edit-actions">
                      <button type="submit" className="btn btn--primary btn--sm" disabled={reviewActionLoading}>
                        <Check size={15} /> Save
                      </button>
                      <button type="button" className="btn btn--outline btn--sm" onClick={() => setEditingReview(null)}>
                        <X size={15} /> Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {rev.comment && <p className="review-comment">{rev.comment}</p>}
                    <div className="review-actions">
                      <button
                        type="button"
                        className={`review-vote${Number(rev.user_vote) === 1 ? ' review-vote--active' : ''}`}
                        onClick={() => handleVote(rev, 1)}
                        disabled={reviewActionLoading || !gun.id}
                        aria-pressed={Number(rev.user_vote) === 1}
                        aria-label={`Thumbs up review, ${rev.upvotes || 0} votes`}
                      >
                        <ThumbsUp size={16} /> {rev.upvotes || 0}
                      </button>
                      <button
                        type="button"
                        className={`review-vote${Number(rev.user_vote) === -1 ? ' review-vote--down' : ''}`}
                        onClick={() => handleVote(rev, -1)}
                        disabled={reviewActionLoading || !gun.id}
                        aria-pressed={Number(rev.user_vote) === -1}
                        aria-label={`Thumbs down review, ${rev.downvotes || 0} votes`}
                      >
                        <ThumbsDown size={16} /> {rev.downvotes || 0}
                      </button>
                      {String(rev.user_id) === String(currentUserId) && (
                        <div className="review-owner-actions">
                          <button
                            type="button"
                            className="review-action-btn"
                            onClick={() => beginEditReview(rev)}
                            aria-label="Edit your review"
                          >
                            <Pencil size={15} /> Edit
                          </button>
                          <button
                            type="button"
                            className="review-action-btn review-action-btn--danger"
                            onClick={() => setDeleteReviewTarget(rev)}
                            aria-label="Delete your review"
                          >
                            <Trash2 size={15} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="detail-empty">No reviews yet. Be the first!</p>
        )}
        {reviewActionError && <p className="form-error" role="alert">{reviewActionError}</p>}
      </section>

      <ConfirmModal
        open={Boolean(deleteReviewTarget)}
        title="Delete Review"
        message="Delete your review? This cannot be undone."
        confirmLabel="Delete"
        danger
        loading={reviewActionLoading}
        onConfirm={handleDeleteReview}
        onCancel={() => setDeleteReviewTarget(null)}
      />
    </div>
  )
}
