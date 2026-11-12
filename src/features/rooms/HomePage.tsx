import { useEffect } from 'react'
import { ArrowUpRight, AudioLines, Check, Clock3, LockKeyhole, Plus, Radio, Trash2, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useUiStore } from '../../stores/uiStore'
import { useRoomStore } from '../../stores/roomStore'
import { useAuthStore } from '../../stores/authStore'
import type { RoomType } from '../../services/firebase/models'

export function HomePage() {
  const navigate = useNavigate()
  const openModal = useUiStore((state) => state.openModal)
  const rooms = useRoomStore((state) => state.fixedRooms)
  const activeRoom = useRoomStore((state) => state.activeRoom)
  const activeRoomStatus = useRoomStore((state) => state.activeRoomStatus)
  const deleteFixedRoom = useRoomStore((state) => state.deleteFixedRoom)
  const currentUid = useAuthStore((state) => state.profile?.uid)
  const status = useRoomStore((state) => state.fixedRoomsStatus)
  const error = useRoomStore((state) => state.fixedRoomsError)
  const loadRooms = useRoomStore((state) => state.loadFixedRooms)
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const roomCards: Array<{ id: string; name: string; type: RoomType; isActive: boolean; isDeleting: boolean; canDelete: boolean }> = rooms.map((room) => ({
    id: room.id,
    name: room.name,
    type: 'fixed',
    isActive: activeRoomStatus === 'ready' && activeRoom?.roomId === room.id,
    isDeleting: room.isDeleting === true,
    canDelete: room.hostUid === currentUid,
  }))
  if (activeRoomStatus === 'ready' && activeRoom && !roomCards.some((room) => room.id === activeRoom.roomId)) {
    roomCards.unshift({
      id: activeRoom.roomId,
      name: activeRoom.name,
      type: activeRoom.metadata.type,
      isActive: true,
      isDeleting: false,
      canDelete: false,
    })
  }

  useEffect(() => { void loadRooms() }, [loadRooms])

  async function handleDeleteRoom(room: (typeof roomCards)[number]) {
    const confirmation = room.isDeleting
      ? `“${room.name}” odasının silme işlemi yarım kalmış. Kalan verileri silmeye devam edilsin mi?`
      : `“${room.name}” odası ve kayıtlı sohbet geçmişi kalıcı olarak silinecek. Devam edilsin mi?`
    if (!window.confirm(confirmation)) return
    setDeletingRoomId(room.id)
    setDeleteError(null)
    try {
      await deleteFixedRoom(room.id)
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Oda silinemedi. Yeniden deneyin.')
      await loadRooms(true)
    } finally {
      setDeletingRoomId(null)
    }
  }

  return (
    <div className="page-stack">
      <section className="welcome-banner">
        <div className="welcome-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> ARKADAŞLARINLA AYNI DALGADA</p>
          <h1>Bir araya gelmek<br /><span>iyi hissettirir.</span></h1>
          <p className="welcome-description">Kendi odanı aç, arkadaşlarını çağır. Ses, görüntü ve sohbet tek bir yerde.</p>
          <div className="welcome-actions">
            <Button icon={<Plus size={16} />} onClick={() => openModal('create-room')} variant="primary">Oda oluştur</Button>
            <Button onClick={() => openModal('join-room')} variant="secondary">Davet koduyla katıl</Button>
          </div>
          <div className="welcome-assurance"><Check size={14} /><span>Ücretsiz · En fazla 4 kişi · P2P ses ve kamera</span></div>
        </div>
        <div aria-hidden="true" className="welcome-art">
          <div className="orbit orbit--outer" /><div className="orbit orbit--inner" /><div className="art-glow" />
          <div className="sound-bars"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
          <div className="art-core"><AudioLines size={43} strokeWidth={1.5} /></div>
        </div>
        <div className="banner-grain" />
      </section>

      <section aria-label="Oda özellikleri" className="quick-stats">
        <div className="quick-stat"><span className="stat-icon stat-icon--purple"><UsersRound size={17} /></span><div><strong>4 kişiye kadar</strong><span>Bir odada aynı anda</span></div><span className="stat-index">01</span></div>
        <div className="quick-stat"><span className="stat-icon stat-icon--green"><Radio size={17} /></span><div><strong>Geçici veya sabit</strong><span>Oda yaşam döngüsü</span></div><span className="stat-index">02</span></div>
        <div className="quick-stat"><span className="stat-icon stat-icon--blue"><Clock3 size={17} /></span><div><strong>Davet koduyla katılım</strong><span>Oda kodu olanlar katılabilir</span></div><span className="stat-index">03</span></div>
      </section>

      <section className="rooms-section" id="rooms">
        <div className="section-heading">
          <div><p className="eyebrow">ODALARIN</p><h2>Odalarım</h2><p className="section-subtitle">Sabit odaların ve şu an katıldığın oda burada görünür.</p></div>
          <Button icon={<ArrowUpRight size={15} />} onClick={() => openModal('create-room')} variant="subtle">Yeni oda</Button>
        </div>
        {status === 'loading' && <p className="section-subtitle" role="status">Oda listesi yükleniyor…</p>}
        {status === 'error' && <p className="auth-form-error" role="alert">{error} <button className="text-action" onClick={() => void loadRooms(true)} type="button">Yeniden dene</button></p>}
        {deleteError && <p className="auth-form-error" role="alert">{deleteError}</p>}
        {status === 'ready' && roomCards.length === 0 && <div className="room-empty-state">Henüz sabit bir odan yok ve şu anda katıldığın bir oda bulunmuyor. Yeni oda oluşturabilir veya davet koduyla katılabilirsin.</div>}
        <div className="room-grid">
          {roomCards.map((room, index) => (
            <article className={`room-card${room.isDeleting ? ' room-card--deleting' : ''}`} key={room.id}>
              <button aria-label={`${room.name} odasını aç`} className="room-card-open" disabled={room.isDeleting} onClick={() => navigate(`/rooms/${room.id}`)} type="button">
                <div className={`room-card-icon room-card-icon--${index % 2 ? 'mint' : 'violet'}`}><LockKeyhole size={19} /></div>
                <div className="room-card-main"><span className="room-status"><i />{room.isDeleting ? 'Silme işlemi bekliyor' : room.isActive ? 'Şu an katıldığın oda' : room.type === 'fixed' ? 'Sabit oda' : 'Geçici oda'}</span><h3>{room.name}</h3><p>{room.type === 'fixed' ? 'Sabit oda' : 'Geçici oda'} <span>·</span> {room.isActive ? 'Oturum açık' : 'Oda koduyla katılım'}</p></div>
                <div className="room-card-footer"><span><UsersRound size={14} /> {room.isDeleting ? 'Silme işlemini bekliyor' : room.isActive ? 'Odaya dön' : 'Odaya katıl'}</span><span>›</span></div>
              </button>
              {room.canDelete && <button aria-label={`${room.name} odasını sil`} className="room-delete-button" disabled={deletingRoomId === room.id} onClick={() => void handleDeleteRoom(room)} title={room.isDeleting ? 'Silme işlemini sürdür' : 'Odayı ve sohbet geçmişini sil'} type="button"><Trash2 size={15} /></button>}
            </article>
          ))}
          <button className="room-card room-card--add" onClick={() => openModal('create-room')} type="button">
            <span className="add-room-mark"><Plus size={20} /></span><strong>Yeni oda oluştur</strong><span className="add-room-caption">Geçici veya sabit oda başlat</span>
          </button>
        </div>
      </section>
    </div>
  )
}
