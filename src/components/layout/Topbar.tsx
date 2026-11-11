import { Bell, Search, SlidersHorizontal } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '../ui/Button'
import { useUiStore } from '../../stores/uiStore'

const pageNames: Record<string, string> = {
  '/': 'Genel bakış',
  '/settings': 'Ayarlar',
}

export function Topbar() {
  const location = useLocation()
  const openModal = useUiStore((state) => state.openModal)
  const pageTitle = location.pathname.startsWith('/rooms/')
    ? 'Oda'
    : pageNames[location.pathname] ?? 'Genel bakış'

  return (
    <header className="topbar">
      <div className="topbar-page-title"><span className="topbar-mobile-brand">escord<span>.</span></span><span className="topbar-divider">/</span>{pageTitle}</div>
      <label className="search-field">
        <Search aria-hidden="true" size={16} />
        <input aria-label="Arama, yakında" disabled placeholder="Arama yakında" />
      </label>
      <div className="topbar-actions">
        <button aria-label="Bildirimler (yakında)" className="icon-button notification-button" disabled title="Bildirimler bu aşamada kullanılamıyor" type="button">
          <Bell size={18} /><span className="notification-dot" />
        </button>
        <Button className="topbar-create" icon={<SlidersHorizontal size={15} />} onClick={() => openModal('create-room')} variant="primary">
          Oda oluştur
        </Button>
      </div>
    </header>
  )
}
