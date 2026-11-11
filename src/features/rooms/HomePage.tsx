import { useEffect } from 'react'
import { ArrowUpRight, AudioLines, Check, Clock3, LockKeyhole, Plus, Radio, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useUiStore } from '../../stores/uiStore'
import { useRoomStore } from '../../stores/roomStore'

export function HomePage() {
  const navigate = useNavigate()
  const openModal = useUiStore((state) => state.openModal)
  const rooms = useRoomStore((state) => state.fixedRooms)
  const status = useRoomStore((state) => state.fixedRoomsStatus)
  const error = useRoomStore((state) => state.fixedRoomsError)
  const loadRooms = useRoomStore((state) => state.loadFixedRooms)

  useEffect(() => { void loadRooms() }, [loadRooms])

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
          <div className="welcome-assurance"><Check size={14} /><span>Ücretsiz · En fazla 4 kişi · Medya bağlantıları sonraki aşamada</span></div>
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
        <div className="quick-stat"><span className="stat-icon stat-icon--blue"><Clock3 size={17} /></span><div><strong>Üyelik kontrollü</strong><span>Sabit odalara yetkili erişim</span></div><span className="stat-index">03</span></div>
      </section>

      <section className="rooms-section" id="rooms">
        <div className="section-heading">
          <div><p className="eyebrow">KALICI ODALAR</p><h2>Odalarım</h2><p className="section-subtitle">Sana yetki verilmiş sabit odalar burada görünür.</p></div>
          <Button icon={<ArrowUpRight size={15} />} onClick={() => openModal('create-room')} variant="subtle">Yeni oda</Button>
        </div>
        {status === 'loading' && <p className="section-subtitle" role="status">Oda listesi yükleniyor…</p>}
        {status === 'error' && <p className="auth-form-error" role="alert">{error} <button className="text-action" onClick={() => void loadRooms(true)} type="button">Yeniden dene</button></p>}
        {status === 'ready' && rooms.length === 0 && <div className="room-empty-state">Henüz sabit bir odaya yetkin yok. Davet koduyla geçici bir odaya katılabilir veya yeni oda oluşturabilirsin.</div>}
        <div className="room-grid">
          {rooms.map((room, index) => (
            <button className="room-card" key={room.id} onClick={() => navigate(`/rooms/${room.id}`)} type="button">
              <div className={`room-card-icon room-card-icon--${index % 2 ? 'mint' : 'violet'}`}><LockKeyhole size={19} /></div>
              <div className="room-card-main"><span className="room-status"><i />{room.isPinned ? 'Sabitleşti' : 'Sabit oda'}</span><h3>{room.name}</h3><p>Sabit oda <span>·</span> Yetkili üye</p></div>
              <div className="room-card-footer"><span><UsersRound size={14} /> Odaya katıl</span><span>›</span></div>
            </button>
          ))}
          <button className="room-card room-card--add" onClick={() => openModal('create-room')} type="button">
            <span className="add-room-mark"><Plus size={20} /></span><strong>Yeni oda oluştur</strong><span className="add-room-caption">Geçici veya sabit oda başlat</span>
          </button>
        </div>
      </section>
    </div>
  )
}
