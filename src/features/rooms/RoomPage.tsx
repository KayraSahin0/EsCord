import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  Copy,
  Ellipsis,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  Send,
  ShieldCheck,
  Smile,
  UsersRound,
  Video,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'

const disabledControl = 'Bu kontrol medya aşamasında etkinleşecek'

export function RoomPage() {
  const { roomId } = useParams()
  const roomName = (roomId ?? 'oda').replaceAll('-', ' ').replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('tr-TR'))

  return (
    <div className="room-page">
      <div className="room-page-heading">
        <div>
          <Link className="back-link" to="/"><ArrowLeft size={15} /> Genel bakış</Link>
          <div className="room-title-row"><h1>{roomName}</h1><span className="preview-pill"><i /> Ekran önizlemesi</span></div>
          <p>Oda görünümü ve kontrollerin statik taslağı.</p>
        </div>
        <div className="room-heading-actions">
          <Button disabled icon={<Copy size={15} />} title="Davet bağlantısı PHASE 04 kapsamında etkinleşecek" variant="secondary">Davet et</Button>
          <button aria-label="Diğer oda seçenekleri (yakında)" className="icon-button" disabled title="Oda seçenekleri yakında" type="button"><MoreHorizontal size={19} /></button>
        </div>
      </div>

      <div className="room-layout">
        <section aria-label="Katılımcılar" className="room-stage">
          <div className="stage-topline"><span><span className="stage-live-dot" /> SES ODASI</span><span><UsersRound size={14} /> 1 / 4 koltuk</span></div>
          <div className="participant-grid">
            <article className="participant-card participant-card--local">
              <div className="participant-orb participant-orb--you">E</div>
              <div className="participant-label"><span><strong>Sen</strong><small>Misafir</small></span><span className="participant-mic"><MicOff size={15} /></span></div>
              <span className="host-tag"><ShieldCheck size={12} /> Oda sahibi</span>
            </article>
            {[1, 2, 3].map((seat) => (
              <article className="participant-card participant-card--empty" key={seat}>
                <span className="empty-seat-icon"><UsersRound size={21} /></span>
                <strong>Boş koltuk</strong>
                <small>Bir arkadaşını davet et</small>
              </article>
            ))}
          </div>
          <div className="room-control-bar">
            <button aria-label="Mikrofon (yakında)" className="control-button" disabled title={disabledControl} type="button"><Mic size={18} /><span>Mikrofon</span><ChevronDown size={13} /></button>
            <button aria-label="Kamera (yakında)" className="control-button" disabled title={disabledControl} type="button"><Video size={18} /><span>Kamera</span><ChevronDown size={13} /></button>
            <button aria-label="Ekran paylaşımı (yakında)" className="control-button" disabled title={disabledControl} type="button"><MonitorUp size={18} /><span>Ekran paylaş</span></button>
            <span className="control-divider" />
            <button aria-label="Odadan ayrıl (yakında)" className="leave-button" disabled title="Odaya katılma henüz etkin değil" type="button"><ArrowLeft size={16} /><span>Ayrıl</span></button>
          </div>
          <p className="stage-footnote"><span className="stage-lock"><ShieldCheck size={14} /></span>Ses ve video bağlantıları henüz başlatılmıyor.</p>
        </section>

        <aside aria-label="Yazılı sohbet önizlemesi" className="chat-panel">
          <div className="chat-panel-heading"><div><h2>Sohbet</h2><span>Oda mesajları</span></div><button aria-label="Sohbet seçenekleri (yakında)" className="icon-button" disabled title="Sohbet ayarları yakında" type="button"><Ellipsis size={18} /></button></div>
          <div className="chat-empty-state"><span className="chat-empty-icon"><Send size={19} /></span><strong>Henüz mesaj yok</strong><p>Odaya katıldığında sohbet burada görünür.</p></div>
          <div className="chat-composer-wrap">
            <div className="chat-disabled-note"><span><Check size={13} /></span> Sohbet sonraki aşamada açılacak</div>
            <div className="chat-composer"><input aria-label="Mesaj alanı, yakında" disabled placeholder="Mesaj yaz..." /><button aria-label="Emoji (yakında)" disabled type="button"><Smile size={17} /></button><button aria-label="Mesaj gönder (yakında)" className="send-button" disabled type="button"><Send size={16} /></button></div>
          </div>
        </aside>
      </div>

      <section className="room-preview-notice"><span className="preview-note-icon"><Camera size={17} /></span><p><strong>Bu bir arayüz önizlemesidir</strong><span>Mikrofon, kamera, ekran paylaşımı ve sohbet kontrolleri etkin değildir. Gerçek oda ve medya bağlantıları sonraki aşamalarda eklenecek.</span></p><span className="preview-note-mark">PHASE 01</span></section>
    </div>
  )
}
