import FavoriteButton from '../common/FavoriteButton'
import ShareButton from '../common/ShareButton'
import WhatsAppContactButton from '../common/WhatsAppContactButton'
import { formatPrice, truncate } from '../../utils/helpers'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'

/**
 * Product card used in the catalog grid.
 *
 * @param {Object}   props
 * @param {Object}   props.gun       — product data
 * @param {Function} props.onSelect  — called with the gun when clicked
 * @param {Function} [props.onEdit]  — called when Edit is clicked (admin)
 * @param {Function} [props.onArchive] — archive an active product
 * @param {Function} [props.onRestore] — restore an archived product
 * @param {Function} [props.onPermanentDelete] — permanently delete an archived product
 */
export default function GunCard({
  gun,
  onSelect,
  onEdit,
  onArchive,
  onRestore,
  onPermanentDelete,
  archived = false,
}) {
  const imgSrc = gun.image_urls?.[0] || gun.image_url || gun.image || '/guns/pistol.svg'
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0

  return (
    <li className="card">
      <button
        type="button"
        className="card-btn"
        onClick={() => onSelect(gun)}
        aria-label={`View ${gun.name}`}
      >
        <img
          className="card-img"
          src={imgSrc}
          alt={gun.name}
          width="240"
          height="180"
          loading="lazy"
          decoding="async"
        />

        <span className="name display">{gun.name}</span>

        <span className="type">
          {category}
          {caliber ? ` · ${caliber}` : ''}
        </span>

        {gun.description && (
          <span className="card-desc">{truncate(gun.description, 72)}</span>
        )}

        <span className="price">{formatPrice(price)}</span>
      </button>

      {!archived && <WhatsAppContactButton gun={gun} className="btn btn--whatsapp card-contact-btn" />}

      {/* Floating actions row */}
      <div className="card-actions">
        {!archived && (
          <>
            <FavoriteButton gunId={gun.id || gun.name} />
            <ShareButton gun={gun} className="card-act-btn" compact />
          </>
        )}

        {!archived && onEdit && (
          <button
            type="button"
            className="card-act-btn"
            onClick={(e) => { e.stopPropagation(); onEdit(gun) }}
            aria-label={`Edit ${gun.name}`}
            title="Edit"
          >
            ✏️
          </button>
        )}

        {!archived && onArchive && (
          <button
            type="button"
            className="card-act-btn"
            onClick={(e) => { e.stopPropagation(); onArchive(gun) }}
            aria-label={`Archive ${gun.name}`}
            title="Archive"
          >
            <Archive size={16} />
          </button>
        )}

        {archived && onRestore && (
          <button
            type="button"
            className="card-act-btn"
            onClick={(e) => { e.stopPropagation(); onRestore(gun) }}
            aria-label={`Restore ${gun.name}`}
            title="Restore"
          >
            <RotateCcw size={16} />
          </button>
        )}

        {archived && onPermanentDelete && (
          <button
            type="button"
            className="card-act-btn card-act-btn--danger"
            onClick={(e) => { e.stopPropagation(); onPermanentDelete(gun) }}
            aria-label={`Permanently delete ${gun.name}`}
            title="Delete permanently"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </li>
  )
}
