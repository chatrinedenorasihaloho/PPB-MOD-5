import { useState } from 'react'
import { ArrowLeft, Camera, Save, Shield } from 'lucide-react'
import userService from '../services/userService'

export default function EditProfilePage({ onBack, onSave }) {
  const [profile] = useState(() => userService.getUserProfile())
  const [username, setUsername] = useState(profile.username || 'Shooter')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatar, setAvatar] = useState(profile.avatar || null)
  const [error, setError] = useState('')

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Avatar image must be under 2MB.')
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onload = () => setAvatar(String(reader.result))
    reader.onerror = () => setError('Could not read the selected image.')
    reader.readAsDataURL(file)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')
    const result = userService.saveUserProfile({
      ...profile,
      username: username.trim() || 'Shooter',
      bio: bio.trim(),
      avatar,
    })
    if (!result.success) {
      setError(result.message || 'Failed to save profile.')
      return
    }
    if (onSave) onSave()
  }

  return (
    <div className="profile-page">
      <section className="masthead">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Profile
        </button>
        <h1 className="display">Edit Profile</h1>
        <p className="lede">Update your operator alias, profile image, and notes.</p>
      </section>

      <form onSubmit={handleSubmit} className="profile-form">
        <h2 className="section-title">Profile Details</h2>
        <div className="profile-edit-avatar">
          <div className="avatar-wrap">
            {avatar ? (
              <img src={avatar} alt="Profile avatar preview" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder"><Shield size={36} stroke="var(--brass)" /></div>
            )}
          </div>
          <label htmlFor="avatar-file-input" className="btn btn--outline btn--sm">
            <Camera size={15} /> Change Photo
            <input
              id="avatar-file-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden-file-input"
            />
          </label>
          <span className="form-hint">Maximum file size: 2MB.</span>
        </div>

        <div className="form-group">
          <label htmlFor="prof-name" className="form-label">Callsign / Operator Alias</label>
          <input
            id="prof-name"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="e.g. Operator Delta"
            className="form-input"
            maxLength={60}
          />
        </div>
        <div className="form-group">
          <label htmlFor="prof-bio" className="form-label">Armory Notes / Station Bio</label>
          <textarea
            id="prof-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Add a short profile description..."
            rows={4}
            className="form-textarea"
            maxLength={500}
          />
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="profile-edit-actions">
          <button type="button" className="btn btn--outline" onClick={onBack}>Cancel</button>
          <button type="submit" className="btn btn--primary">
            <Save size={16} /> Save Profile
          </button>
        </div>
      </form>
    </div>
  )
}
