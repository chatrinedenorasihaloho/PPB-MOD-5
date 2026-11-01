import { useState } from 'react'
import {
  Check,
  Copy,
  FileText,
  Heart,
  Play,
  Shield,
  Trash2,
  UserRoundPen,
} from 'lucide-react'
import userService from '../services/userService'
import { useFavorites } from '../hooks/useFavorites'
import About from './About'
import Contact from './Contact'
import {
  deleteDraft,
  formatDraftTime,
  getAllDraftIds,
  getDraftTimestamp,
  loadDraft,
} from '../utils/draftStorage'

function getDrafts() {
  return getAllDraftIds()
    .map((id) => {
      const data = loadDraft(id)
      if (!data) return null
      return {
        id,
        title: data.formData?.name?.trim() || (id === 'create' ? 'New catalog item' : 'Untitled item'),
        type: id === 'create' ? 'New item' : 'Edit item',
        savedAt: getDraftTimestamp(id) || data.savedAt,
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0))
}

export default function ProfilePage({ onReplaySplash, onEditProfile, onResumeDraft }) {
  const [profile] = useState(() => userService.getUserProfile())
  const [copied, setCopied] = useState(false)
  const [drafts, setDrafts] = useState(getDrafts)
  const [draftError, setDraftError] = useState('')
  const [profileError, setProfileError] = useState('')
  const { favorites } = useFavorites()

  const handleCopyId = async () => {
    if (!profile.userId) return
    try {
      await navigator.clipboard.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      setProfileError(`Could not copy user ID: ${error.message}`)
    }
  }

  const handleDeleteDraft = (id) => {
    if (!deleteDraft(id)) {
      setDraftError('Could not remove this draft from local storage.')
      return
    }
    setDraftError('')
    setDrafts(getDrafts())
  }

  return (
    <div className="profile-page">
      <section className="masthead profile-heading">
        <div>
          <h1 className="display">Operator Profile</h1>
          <p className="lede">Your profile, saved catalog drafts, and information about Bore &amp; Barrel.</p>
        </div>
        <div className="profile-heading__actions">
          {onEditProfile && (
            <button type="button" className="btn btn--primary btn--sm" onClick={onEditProfile}>
              <UserRoundPen size={15} /> Edit Profile
            </button>
          )}
          {onReplaySplash && (
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={onReplaySplash}
              title="Replay introductory splash animation"
            >
              <Play size={14} /> Replay Intro
            </button>
          )}
        </div>
      </section>

      {profileError && <p className="form-error" role="alert">{profileError}</p>}

      <section className="profile-card" aria-label="Profile overview">
        <div className="profile-card-top">
          <div className="avatar-wrap">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.username} className="avatar-img" loading="lazy" decoding="async" />
            ) : (
              <div className="avatar-placeholder"><Shield size={36} stroke="var(--brass)" /></div>
            )}
          </div>
          <div className="profile-identity">
            <h2 className="display">{profile.username || 'Shooter'}</h2>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            <div className="profile-id-row">
              <span className="mono-badge">{profile.userId}</span>
              <button type="button" className="icon-btn" onClick={handleCopyId} title="Copy User ID to clipboard">
                {copied ? <Check size={14} color="var(--brass)" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
        <div className="profile-stats">
          <div className="stat-item">
            <Heart size={20} className="stat-icon" stroke="var(--brass)" />
            <div className="stat-val">{favorites.length}</div>
            <div className="stat-label">Procurement Favorites</div>
          </div>
          <div className="stat-item">
            <FileText size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{drafts.length}</div>
            <div className="stat-label">Saved Catalog Drafts</div>
          </div>
        </div>
      </section>

      <section className="profile-section">
        <div className="profile-section__heading">
          <div>
            <h2 className="section-title">Catalog Drafts</h2>
            <p className="profile-section__description">Unfinished catalog items saved on this device.</p>
          </div>
          <span className="count">{drafts.length} draft{drafts.length !== 1 ? 's' : ''}</span>
        </div>
        {draftError && <p className="form-error" role="alert">{draftError}</p>}
        {drafts.length === 0 ? (
          <div className="state-box profile-empty">
            <FileText size={28} />
            <p>You do not have any saved catalog drafts.</p>
          </div>
        ) : (
          <ul className="draft-list">
            {drafts.map((draft) => (
              <li className="draft-item" key={draft.id}>
                <div className="draft-item__details">
                  <strong>{draft.title}</strong>
                  <span>{draft.type}{draft.savedAt ? ` · ${formatDraftTime(draft.savedAt)}` : ''}</span>
                </div>
                <div className="draft-item__actions">
                  {onResumeDraft && (
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => onResumeDraft(draft.id)}
                    >
                      Resume
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-btn draft-delete"
                    onClick={() => handleDeleteDraft(draft.id)}
                    aria-label={`Delete draft ${draft.title}`}
                    title="Delete draft"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="profile-section profile-info-section">
        <h2 className="section-title">About</h2>
        <About />
      </section>

      <section className="profile-section profile-info-section">
        <h2 className="section-title">Contact</h2>
        <Contact />
      </section>
    </div>
  )
}
