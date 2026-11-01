import { useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Catalog from './pages/Catalog.jsx'
import FavoritesPage from './pages/FavoritesPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import EditProfilePage from './pages/EditProfilePage.jsx'
import CreateGunPage from './pages/CreateGunPage.jsx'
import EditGunPage from './pages/EditGunPage.jsx'
import GunDetail from './components/gun/GunDetail.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import gunService from './services/gunService.js'
import GUNS_LOCAL from './data/guns.js'
import './App.css'

function App() {
  const [sharedGunId, setSharedGunId] = useState(
    () => new URLSearchParams(window.location.search).get('gun'),
  )
  const [sharedGunLoading, setSharedGunLoading] = useState(Boolean(sharedGunId))
  const [sharedGunError, setSharedGunError] = useState('')
  const [showSplash, setShowSplash] = useState(true)
  const [tab, setTab] = useState('Catalog')
  const [mode, setMode] = useState('list') // 'list' | 'create' | 'edit' | 'detail'
  const [selectedGun, setSelectedGun] = useState(null)
  const [editingGun, setEditingGun] = useState(null)
  const [resumeDraftId, setResumeDraftId] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [archiveError, setArchiveError] = useState('')

  useEffect(() => {
    if (!sharedGunId) return

    let active = true
    const loadSharedGun = async () => {
      setSharedGunLoading(true)
      setSharedGunError('')
      try {
        const localGun = GUNS_LOCAL.find((gun, index) => `local-${index}` === sharedGunId)
        const gun = localGun
          ? { ...localGun, id: sharedGunId }
          : (await gunService.getGunById(sharedGunId)).data
        if (!gun) throw new Error('Gun not found.')
        if (active) {
          setSelectedGun(gun)
          setMode('detail')
          setTab('Catalog')
        }
      } catch (error) {
        if (active) setSharedGunError(error.message || 'Could not load this gun.')
      } finally {
        if (active) setSharedGunLoading(false)
      }
    }

    loadSharedGun()
    return () => { active = false }
  }, [sharedGunId])

  const clearSharedGunUrl = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('gun')
    window.history.replaceState({}, '', url)
    setSharedGunId(null)
    setSharedGunError('')
  }

  // Unified navigation handler
  const handleNavigate = (target, payload) => {
    if (sharedGunId) clearSharedGunUrl()
    if (target === 'ResumeDraft') {
      setTab('Profile')
      setResumeDraftId(payload)
      if (payload === 'create') {
        setMode('create')
      } else {
        const localGun = GUNS_LOCAL.find((gun, index) => `local-${index}` === payload)
        setEditingGun(localGun ? { ...localGun, id: payload } : { id: payload })
        setMode('edit')
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'EditProfile') {
      setTab('Profile')
      setMode('profile-edit')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Create') {
      setResumeDraftId(null)
      setMode('create')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Edit') {
      setResumeDraftId(null)
      setEditingGun(payload)
      setMode('edit')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (target === 'Detail') {
      setSelectedGun(payload)
      setMode('detail')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Tab change
      setTab(target)
      setMode('list')
      setSelectedGun(null)
      setEditingGun(null)
      setResumeDraftId(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBackToList = () => {
    if (sharedGunId) clearSharedGunUrl()
    setMode('list')
    setSelectedGun(null)
    setEditingGun(null)
    setResumeDraftId(null)
  }

  return (
    <div className="shell">
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}

      <Header
        tab={mode === 'list' ? tab : ''}
        onTab={(newTab) => handleNavigate(newTab)}
        onNavigateCreate={() => handleNavigate('Create')}
      />

      <main className="main">
        {sharedGunLoading && (
          <div className="state-box" role="status">
            <p>Loading shared gun…</p>
          </div>
        )}

        {!sharedGunLoading && sharedGunError && (
          <div className="state-box state-box--error" role="alert">
            <p>{sharedGunError}</p>
            <button type="button" className="btn btn--outline" onClick={handleBackToList}>
              Back to Catalog
            </button>
          </div>
        )}

        {/* Sub-page views */}
        {!sharedGunLoading && !sharedGunError && mode === 'create' && (
          <CreateGunPage
            resumeDraft={resumeDraftId === 'create'}
            onBack={handleBackToList}
            onSuccess={() => {
              handleBackToList()
              setTab('Catalog')
            }}
          />
        )}

        {!sharedGunLoading && !sharedGunError && mode === 'edit' && (
          <EditGunPage
            gun={editingGun}
            gunId={editingGun?.id}
            resumeDraft={String(resumeDraftId) === String(editingGun?.id)}
            onBack={handleBackToList}
            onSuccess={() => {
              handleBackToList()
              setTab('Catalog')
            }}
          />
        )}

        {!sharedGunLoading && !sharedGunError && mode === 'detail' && selectedGun && (
          <GunDetail
            gun={selectedGun}
            onBack={handleBackToList}
            onEdit={(g) => handleNavigate('Edit', g)}
            onArchive={(g) => setArchiveTarget(g)}
          />
        )}

        {!sharedGunLoading && !sharedGunError && mode === 'profile-edit' && (
          <EditProfilePage
            onBack={handleBackToList}
            onSave={handleBackToList}
          />
        )}

        {/* Top-level Tabs */}
        {!sharedGunLoading && !sharedGunError && mode === 'list' && (
          <>
            {tab === 'Catalog' && (
              <Catalog
                onNavigate={(destination, payload) => handleNavigate(destination, payload)}
              />
            )}
            {tab === 'Favorites' && (
              <FavoritesPage
                onSelectGun={(g) => handleNavigate('Detail', g)}
                onNavigateCatalog={() => setTab('Catalog')}
              />
            )}
            {tab === 'Profile' && (
              <ProfilePage
                onReplaySplash={() => setShowSplash(true)}
                onEditProfile={() => handleNavigate('EditProfile')}
                onResumeDraft={(draftId) => handleNavigate('ResumeDraft', draftId)}
              />
            )}
          </>
        )}
      </main>

      {/* Global archive confirmation for shared product details */}
      <ConfirmModal
        open={Boolean(archiveTarget)}
        title="Archive Hardware Record"
        message={`Archive "${archiveTarget?.name}"? It will be hidden from the active catalog and can be restored later.`}
        confirmLabel="Archive"
        loading={archiving}
        onConfirm={async () => {
          if (!archiveTarget) return
          try {
            setArchiving(true)
            setArchiveError('')
            await gunService.archiveGun(archiveTarget.id)
            setArchiveTarget(null)
            handleBackToList()
            setTab('Catalog')
          } catch (err) {
            setArchiveError(err.message || 'Could not archive this record.')
          } finally {
            setArchiving(false)
          }
        }}
        onCancel={() => { setArchiveTarget(null); setArchiveError('') }}
      />

      {archiveError && <div className="toast toast--error" role="alert">{archiveError}</div>}

      <PWABadge />
      <Footer />
    </div>
  )
}

export default App
