import {
  ArrowDownRight,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronRight,
  Clock3,
  Headphones,
  LockKeyhole,
  Plus,
  Radio,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useUiStore } from '../../stores/uiStore'

const sampleRooms = [
  { id: 'aksam-sohbeti', name: 'Akşam sohbeti', type: 'Geçici oda', icon: Radio, color: 'violet', status: 'Örnek oda' },
  { id: 'oyun-arasi', name: 'Oyun arası', type: 'Sabit oda', icon: LockKeyhole, color: 'mint', status: 'Örnek oda' },
  { id: 'muzik-kosesi', name: 'Müzik köşesi', type: 'Geçici oda', icon: Headphones, color: 'blue', status: 'Örnek oda' },
]

export function HomePage() {
  const navigate = useNavigate()
  const openModal = useUiStore((state) => state.openModal)

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
          <div className="welcome-assurance"><Check size={14} /><span>Ücretsiz · En fazla 4 kişi · Uçtan uca P2P</span></div>
        </div>
        <div aria-hidden="true" className="welcome-art">
          <div className="orbit orbit--outer" /><div className="orbit orbit--inner" />
          <div className="art-glow" />
          <div className="sound-bars"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
          <div className="art-core"><AudioLines size={43} strokeWidth={1.5} /></div>
          <div className="floating-bubble bubble--one"><span className="avatar avatar--mint">D</span><span>Deniz katıldı</span><i /></div>
          <div className="floating-bubble bubble--two"><span className="bubble-mic"><Headphones size={15} /></span><span>ses bağlantısı</span></div>
        </div>
        <div className="banner-grain" />
      </section>

      <section aria-label="Oda özellikleri" className="quick-stats">
        <div className="quick-stat"><span className="stat-icon stat-icon--purple"><UsersRound size={17} /></span><div><strong>4 kişiye kadar</strong><span>Küçük gruplar için tasarlandı</span></div><span className="stat-index">01</span></div>
        <div className="quick-stat"><span className="stat-icon stat-icon--green"><Radio size={17} /></span><div><strong>Doğrudan bağlantı</strong><span>Ses ve görüntü P2P aktarılır</span></div><span className="stat-index">02</span></div>
        <div className="quick-stat"><span className="stat-icon stat-icon--blue"><Clock3 size={17} /></span><div><strong>İstediğin kadar kal</strong><span>Geçici ya da sabit oda seç</span></div><span className="stat-index">03</span></div>
      </section>

      <section className="rooms-section" id="rooms">
        <div className="section-heading">
          <div><p className="eyebrow">BAŞLAMAK İÇİN</p><h2>Odalar</h2><p className="section-subtitle">Bir örnek ekranı incele veya yeni bir oda oluştur.</p></div>
          <Button icon={<ArrowUpRight size={15} />} onClick={() => openModal('create-room')} variant="subtle">Yeni oda</Button>
        </div>

        <div className="room-grid">
          {sampleRooms.map((room, index) => {
            const RoomIcon = room.icon
            return (
              <button className="room-card" key={room.id} onClick={() => navigate(`/rooms/${room.id}`)} type="button">
                <div className={`room-card-icon room-card-icon--${room.color}`}><RoomIcon size={19} /></div>
                <div className="room-card-main"><span className="room-status"><i />{room.status}</span><h3>{room.name}</h3><p>{room.type} <span>·</span> Ekran önizlemesi</p></div>
                <div className="room-card-footer"><span><UsersRound size={14} /> Oda görünümünü aç</span><ChevronRight size={16} /></div>
                <span className="room-card-number">0{index + 1}</span>
              </button>
            )
          })}
          <button className="room-card room-card--add" onClick={() => openModal('create-room')} type="button">
            <span className="add-room-mark"><Plus size={20} /></span><strong>Kendi odanı oluştur</strong><span className="add-room-caption">Oda oluşturma akışı taslak durumda</span><span className="add-room-arrow"><ArrowDownRight size={16} /></span>
          </button>
        </div>
      </section>

      <section className="preview-note"><span className="preview-note-icon"><Sparkles size={17} /></span><p><strong>Tasarım önizlemesi</strong><span>Bu ekrandaki oda örnekleri statiktir. Gerçek oda oluşturma, katılma ve medya kontrolleri ilgili sonraki aşamalarda etkinleştirilecektir.</span></p><span className="preview-note-mark">PHASE 01</span></section>
    </div>
  )
}
