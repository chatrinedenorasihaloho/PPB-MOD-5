import { useState } from 'react'
import { Share2 } from 'lucide-react'

export default function ShareButton({ gun, className = 'btn btn--outline', compact = false }) {
  const [message, setMessage] = useState('')

  const handleShare = async (event) => {
    event.stopPropagation()
    if (!gun.id) {
      setMessage('This product cannot be shared because it has no ID.')
      return
    }

    const url = new URL(window.location.href)
    url.searchParams.set('gun', gun.id)
    const shareData = { title: gun.name, text: `View ${gun.name}`, url: url.toString() }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        setMessage('Share link ready.')
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url)
        setMessage('Link copied.')
      } else {
        setMessage(`Share link: ${shareData.url}`)
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setMessage(`Could not share link: ${error.message}`)
      }
    }
  }

  return (
    <span className="share-control">
      <button
        type="button"
        className={className}
        onClick={handleShare}
        aria-label={`Share ${gun.name}`}
        title="Share link"
      >
        <Share2 size={compact ? 16 : 17} />
        {!compact && <span>Share</span>}
      </button>
      {message && <span className="share-feedback" role="status">{message}</span>}
    </span>
  )
}
