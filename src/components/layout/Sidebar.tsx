import {
  AudioLines,
  CircleHelp,
  Compass,
  Headphones,
  Home,
  Plus,
  Settings2,
} from 'lucide-react'
import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useUiStore } from '../../stores/uiStore'
import { useAuthStore } from '../../stores/authStore'
import { getNicknameInitial } from '../../features/profile/nickname'
import { useRoomStore } from '../../stores/roomStore'

export function Sidebar() {
  const openModal = useUiStore((state) => state.openModal)
  const nickname = useAuthStore((state) => state.profile?.nickname ?? 'Misafir')
  const isAnonymous = useAuthStore((state) => state.profile?.isAnonymous ?? true)
  const rooms = useRoomStore((state) => state.fixedRooms)
  const activeRoom = useRoomStore((state) => state.activeRoom)
  const activeRoomStatus = useRoomStore((state) => state.activeRoomStatus)
  const loadRooms = useRoomStore((state) => state.loadFixedRooms)

  useEffect(() => { void loadRooms() }, [loadRooms])

  const roomEntries = rooms.map((room) => ({ id: room.id, name: room.name, isActive: activeRoomStatus === 'ready' && activeRoom?.roomId === room.id, isTemporary: false, isDeleting: room.isDeleting === true }))
  if (activeRoomStatus === 'ready' && activeRoom && !roomEntries.some((room) => room.id === activeRoom.roomId)) {
    roomEntries.push({ id: activeRoom.roomId, name: activeRoom.name, isActive: true, isTemporary: activeRoom.metadata.type === 'temporary', isDeleting: false })
  }

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
      <div className="sidebar-room-list">
        {roomEntries.length === 0 ? <div className="sidebar-empty"><span className="sidebar-empty-icon"><Headphones size={17} /></span><span>Henüz odan yok</span></div> : roomEntries.map((room) => <NavLink className={({ isActive }) => `sidebar-room-link${isActive || room.isActive ? ' is-active' : ''}${room.isDeleting ? ' is-disabled' : ''}`} key={room.id} onClick={(event) => { if (room.isDeleting) event.preventDefault(); else void loadRooms() }} to={`/rooms/${room.id}`}><span className="sidebar-room-dot" />{room.name}{room.isTemporary && <small>GEÇİCİ</small>}</NavLink>)}
      </div>

      <div className="sidebar-bottom">
        <button className="nav-link sidebar-disabled-link" disabled title="Yardım merkezi henüz hazır değil" type="button">
          <CircleHelp size={18} /><span>Yardım merkezi</span>
        </button>
        <NavLink className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`} to="/settings">
          <Settings2 size={18} /><span>Ayarlar</span>
        </NavLink>
        <div className="sidebar-user">
          <div className="avatar avatar--you">{getNicknameInitial(nickname)}</div>
          <div className="sidebar-user-copy">
            <strong>{nickname}</strong>
            <span>{isAnonymous ? 'Anonim hesap' : 'E-posta hesabı'}</span>
          </div>
          <span className="online-dot" aria-label="Çevrimiçi" />
        </div>
      </div>
    </aside>
  )
}
