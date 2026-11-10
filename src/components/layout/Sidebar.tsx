import {
  AudioLines,
  CircleHelp,
  Compass,
  Headphones,
  Home,
  Plus,
  Settings2,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useUiStore } from '../../stores/uiStore'

export function Sidebar() {
  const openModal = useUiStore((state) => state.openModal)

  return (
    <aside className="sidebar">
      <NavLink aria-label="EsCord ana sayfa" className="brand" to="/">
        <span className="brand-mark"><AudioLines size={21} strokeWidth={2.4} /></span>
        <span>escord<span className="brand-period">.</span></span>
      </NavLink>

      <div className="sidebar-section-label">ÇALIŞMA ALANI</div>
      <nav aria-label="Ana menü" className="sidebar-nav">
        <NavLink className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`} end to="/">
          <Home size={18} /><span>Genel bakış</span>
        </NavLink>
        <a className="nav-link" href="/#rooms">
          <Compass size={18} /><span>Oda keşfet</span>
        </a>
      </nav>

      <div className="sidebar-section-row">
        <span className="sidebar-section-label">ODALARIM</span>
        <button
          aria-label="Oda oluşturma penceresini aç"
          className="tiny-icon-button"
          onClick={() => openModal('create-room')}
          type="button"
        >
          <Plus size={15} />
        </button>
      </div>
      <div className="sidebar-empty">
        <span className="sidebar-empty-icon"><Headphones size={17} /></span>
        <span>Henüz katıldığın oda yok</span>
      </div>

      <div className="sidebar-bottom">
        <button className="nav-link sidebar-disabled-link" disabled title="Yardım merkezi henüz hazır değil" type="button">
          <CircleHelp size={18} /><span>Yardım merkezi</span>
        </button>
        <NavLink className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`} to="/settings">
          <Settings2 size={18} /><span>Ayarlar</span>
        </NavLink>
        <div className="sidebar-user">
          <div className="avatar avatar--you">E</div>
          <div className="sidebar-user-copy">
            <strong>Misafir</strong>
            <span>Profil önizlemesi</span>
          </div>
          <span className="online-dot" aria-label="Çevrimiçi" />
        </div>
      </div>
    </aside>
  )
}
