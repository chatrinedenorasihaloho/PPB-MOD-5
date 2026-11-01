import { useState, useMemo, useEffect, useRef } from 'react'
import {
  RefreshCw,
  Plus,
  Loader,
  AlertCircle,
  PackageOpen,
  ChevronLeft,
  ChevronRight,
  Archive,
  RotateCcw,
} from 'lucide-react'
import { useGuns } from '../hooks/useGuns'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'
import GunDetail from '../components/gun/GunDetail'
import AdvancedFilter from '../components/common/AdvancedFilter'
import ConfirmModal from '../components/modals/ConfirmModal'
import gunService from '../services/gunService'
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
} from '../utils/helpers'

const PAGE_SIZE = 6

/**
 * Catalog page — the main product listing.
 *
 * Data source priority:
 *   1. Live API via useGuns()
 *   2. Local static array (GUNS_LOCAL) when the API is unreachable
 *
 * Features: search, category filter, sort, CRUD actions, detail modal.
 */
export default function Catalog({ onNavigate }) {
  // ---- API data ----
  const [showArchived, setShowArchived] = useState(false)
  const { guns: apiGuns, loading, error, refetch } = useGuns({
    limit: 50,
    archived: showArchived,
  })
  const [useLocal, setUseLocal] = useState(false)
  const isShowingLocalCatalog = useLocal || (error && apiGuns.length === 0)

  // Decide data source
  const rawGuns = useMemo(() => {
    if (isShowingLocalCatalog) {
      // Enrich local data with synthetic ids so FavoriteButton and detail work
      return GUNS_LOCAL.map((g, i) => ({ ...g, id: g.id || `local-${i}` }))
    }
    return apiGuns
  }, [apiGuns, isShowingLocalCatalog])

  // ---- filters / sort ----
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const loadMoreRef = useRef(null)

  const categories = useMemo(() => extractCategories(rawGuns), [rawGuns])

  const filteredGuns = useMemo(() => {
    let result = rawGuns.filter(
      (g) => matchesSearch(g, search) && matchesCategory(g, activeCategory),
    )
    return sortItems(result, sortKey, sortOrder)
  }, [rawGuns, search, activeCategory, sortKey, sortOrder])

  const pageCount = Math.ceil(filteredGuns.length / PAGE_SIZE)
  const visiblePage = Math.min(currentPage, Math.max(pageCount, 1))
  const visibleGuns = useMemo(
    () => filteredGuns.slice(0, visiblePage * PAGE_SIZE),
    [filteredGuns, visiblePage],
  )
  const hasMore = visibleGuns.length < filteredGuns.length

  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel || !hasMore || loading || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCurrentPage((page) => Math.min(page + 1, pageCount))
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, pageCount])

  // ---- detail view ----
  const [selectedGun, setSelectedGun] = useState(null)

  // ---- delete ----
  const [actionTarget, setActionTarget] = useState(null)
  const [pendingAction, setPendingAction] = useState('archive')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const handleConfirmAction = async () => {
    if (!actionTarget) return
    try {
      setActionLoading(true)
      setActionError('')
      if (pendingAction === 'archive') {
        await gunService.archiveGun(actionTarget.id)
      } else {
        await gunService.permanentlyDeleteGun(actionTarget.id)
      }
      setActionTarget(null)
      refetch()
    } catch (err) {
      setActionError(err.message || 'Could not update this catalog item.')
    } finally {
      setActionLoading(false)
    }
  }

  const requestArchive = (gun) => {
    setPendingAction('archive')
    setActionTarget(gun)
    setActionError('')
  }

  const requestPermanentDelete = (gun) => {
    setPendingAction('permanent-delete')
    setActionTarget(gun)
    setActionError('')
  }

  const handleRestore = async (gun) => {
    try {
      setActionError('')
      await gunService.restoreGun(gun.id)
      refetch()
    } catch (err) {
      setActionError(err.message || 'Could not restore this catalog item.')
    }
  }

  // ---- If viewing a single product detail ----
  if (selectedGun) {
    return (
      <GunDetail
        gun={selectedGun}
        archived={showArchived}
        onBack={() => setSelectedGun(null)}
        onEdit={(g) => onNavigate && onNavigate('Edit', g)}
        onArchive={(g) => { setSelectedGun(null); requestArchive(g) }}
        onRestore={(g) => { setSelectedGun(null); handleRestore(g) }}
        onPermanentDelete={(g) => {
          setSelectedGun(null)
          requestPermanentDelete(g)
        }}
      />
    )
  }

  // ---- Main catalog view ----
  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          A small armory of pistols, rifles, and shotguns. Every piece listed
          with its type, caliber, and price — nothing else.
        </p>
      </section>

      <section>
        <div className="list-head">
          <h2>{showArchived ? 'Archived stock' : 'Current stock'}</h2>
          <div className="list-head-right">
            <span className="count">
              {filteredGuns.length} piece{filteredGuns.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              className={`btn btn--outline btn--sm${showArchived ? ' catalog-view-toggle--active' : ''}`}
              onClick={() => {
                setShowArchived((archived) => !archived)
                setCurrentPage(1)
                setSelectedGun(null)
              }}
              disabled={isShowingLocalCatalog}
              aria-pressed={showArchived}
            >
              {showArchived ? <RotateCcw size={15} /> : <Archive size={15} />}
              {showArchived ? 'View Active' : 'View Archive'}
            </button>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Add
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <AdvancedFilter
          search={search}
          onSearch={(value) => { setSearch(value); setCurrentPage(1) }}
          categories={categories}
          activeCategory={activeCategory}
          onCategory={(category) => { setActiveCategory(category); setCurrentPage(1) }}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={({ key, order }) => {
            setSortKey(key)
            setSortOrder(order)
            setCurrentPage(1)
          }}
        />

        {/* States */}
        {loading && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading products…</p>
          </div>
        )}

        {!loading && error && !useLocal && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{error}</p>
            <div className="state-box__actions">
              <button type="button" className="btn btn--outline" onClick={refetch}>
                <RefreshCw size={16} /> Retry
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setUseLocal(true)}
              >
                View Local Catalog
              </button>
            </div>
          </div>
        )}

        {!loading && filteredGuns.length === 0 && !error && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>{showArchived ? 'No archived products found.' : 'No products match your search.'}</p>
          </div>
        )}

        {/* Product grid */}
        {visibleGuns.length > 0 && (
          <ul className="stock">
            {visibleGuns.map((gun) => (
              <GunCard
                key={gun.id || gun.name}
                gun={gun}
                onSelect={setSelectedGun}
                onEdit={onNavigate ? (g) => onNavigate('Edit', g) : undefined}
                archived={showArchived}
                onArchive={!showArchived && !isShowingLocalCatalog ? requestArchive : undefined}
                onRestore={showArchived && !isShowingLocalCatalog ? handleRestore : undefined}
                onPermanentDelete={showArchived && !isShowingLocalCatalog ? requestPermanentDelete : undefined}
              />
            ))}
          </ul>
        )}

        {hasMore && (
          <div className="lazy-load-sentinel" ref={loadMoreRef} aria-hidden="true">
            <Loader size={20} className="spin" />
          </div>
        )}

        {pageCount > 1 && (
          <nav className="pagination" aria-label="Catalog pagination">
            <p className="pagination__summary">
              Showing {visibleGuns.length} of {filteredGuns.length} products
            </p>
            <div className="pagination__controls">
              <button
                type="button"
                className="pagination__button"
                onClick={() => setCurrentPage(visiblePage - 1)}
                disabled={visiblePage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`pagination__button pagination__number${visiblePage === page ? ' pagination__button--active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                  aria-label={`Page ${page}`}
                  aria-current={visiblePage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                className="pagination__button"
                onClick={() => setCurrentPage(visiblePage + 1)}
                disabled={visiblePage === pageCount}
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </nav>
        )}

        {isShowingLocalCatalog && (
          <p className="local-notice">
            Showing local catalog (server unavailable).{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => { setUseLocal(false); refetch() }}
            >
              Retry server
            </button>
          </p>
        )}
      </section>

      {/* Archive / permanent delete confirmation */}
      <ConfirmModal
        open={!!actionTarget}
        title={pendingAction === 'archive' ? 'Archive Product' : 'Permanently Delete Product'}
        message={pendingAction === 'archive'
          ? `Archive "${actionTarget?.name}"? It will be hidden from the active catalog and can be restored later.`
          : `Permanently delete "${actionTarget?.name}"? This action cannot be undone.`}
        confirmLabel={pendingAction === 'archive' ? 'Archive' : 'Delete Permanently'}
        danger={pendingAction === 'permanent-delete'}
        loading={actionLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => { setActionTarget(null); setActionError('') }}
      />
      {actionError && (
        <div className="toast toast--error" role="alert">{actionError}</div>
      )}
    </>
  )
}
