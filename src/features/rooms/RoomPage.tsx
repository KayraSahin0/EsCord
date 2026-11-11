import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Camera, Check, Copy, LockKeyhole, MicOff, Radio, Send, ShieldCheck, UsersRound } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../stores/authStore'
import { useRoomStore } from '../../stores/roomStore'
import { sendRoomMessage, subscribeToRoomMessages, type ChatMessage } from '../../services/firebase/chatService'
import { getFirebaseErrorMessage } from '../../services/firebase/firebaseError'
import { getNicknameInitial } from '../profile/nickname'

export function RoomPage() {
  const { roomId = '' } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const isAnonymous = profile?.isAnonymous ?? true
  const room = useRoomStore((state) => state.activeRoom)
  const members = useRoomStore((state) => state.activeMembers)
  const status = useRoomStore((state) => state.activeRoomStatus)
  const error = useRoomStore((state) => state.activeRoomError)
  const connect = useRoomStore((state) => state.connectToRoom)
  const disconnect = useRoomStore((state) => state.disconnectFromRoom)
  const leave = useRoomStore((state) => state.leaveCurrentRoom)
  const pin = useRoomStore((state) => state.pinCurrentRoom)
  const unpin = useRoomStore((state) => state.unpinCurrentRoom)
  const authorize = useRoomStore((state) => state.authorizeCurrentRoomMember)
  const [memberUid, setMemberUid] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [chatState, setChatState] = useState<{ key: string; messages: ChatMessage[] }>({ key: '', messages: [] })
  const [draft, setDraft] = useState('')
  const [chatError, setChatError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const chatRoomKey = room ? `${room.roomId}:${room.metadata.type}` : ''
  const messages = chatState.key === chatRoomKey ? chatState.messages : []

  useEffect(() => {
    void connect(roomId)
    return () => { void disconnect(roomId) }
  }, [connect, disconnect, roomId])

  useEffect(() => {
    if (!room || room.roomId !== roomId || status !== 'ready') return
    const roomKey = `${room.roomId}:${room.metadata.type}`
    return subscribeToRoomMessages(
      roomId,
      room.metadata.type,
      (nextMessages) => setChatState({ key: roomKey, messages: nextMessages }),
      (message) => setChatState((current) => {
        const messages = current.key === roomKey ? current.messages : []
        return current.key === roomKey && messages.some((item) => item.id === message.id)
          ? current
          : { key: roomKey, messages: [...messages, message].sort((left, right) => left.createdAt - right.createdAt) }
      }),
      (cause) => setChatError(getFirebaseErrorMessage(cause, room.metadata.type === 'fixed' ? 'firestore' : 'realtime-database')),
    )
  }, [room, roomId, status])

  useEffect(() => { messageEndRef.current?.scrollIntoView({ block: 'end' }) }, [chatState])

  async function leaveRoom() {
    await leave()
    navigate('/')
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/rooms/${roomId}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setActionError('Bağlantı panoya kopyalanamadı. Adres çubuğundaki URL’yi kopyalayın.')
    }
  }

  async function togglePin() {
    setActionError(null)
    try {
      if (room?.isPinned) await unpin()
      else await pin()
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Oda ayarı kaydedilemedi.')
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    try {
      await authorize(memberUid)
      setMemberUid('')
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Üye yetkilendirilemedi.')
    }
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!room || sending) return
    setSending(true)
    setChatError(null)
    try {
      await sendRoomMessage(room.roomId, room.metadata.type, draft)
      setDraft('')
    } catch (cause) {
      setChatError(cause instanceof Error ? cause.message : 'Mesaj gönderilemedi.')
    } finally {
      setSending(false)
    }
  }

  const isHost = room?.metadata.hostUid === profile?.uid
  const title = room?.name ?? 'Oda'

  if (status === 'joining' || status === 'idle') return <div className="room-state" role="status">Odaya bağlanılıyor…</div>
  if (status === 'error' || status === 'closed' || !room) {
    return <div className="room-state room-state--error"><h1>Odaya katılınamadı</h1><p>{error ?? 'Oda bilgisi yüklenemedi.'}</p><Link className="back-link" to="/"><ArrowLeft size={15} /> Ana sayfaya dön</Link></div>
  }

  return (
    <div className="room-page">
      <div className="room-page-heading">
        <div>
          <Link className="back-link" to="/"><ArrowLeft size={15} /> Genel bakış</Link>
          <div className="room-title-row"><h1>{title}</h1><span className="preview-pill"><i /> {room.metadata.type === 'fixed' ? 'Sabit oda' : 'Geçici oda'}</span></div>
          <p>Oda kodu: <code>{roomId}</code></p>
        </div>
        <div className="room-heading-actions">
          <Button icon={<Copy size={15} />} onClick={() => void copyInvite()} variant="secondary">{copied ? 'Kopyalandı' : 'Davet bağlantısı'}</Button>
          {isHost && !isAnonymous && <Button icon={<LockKeyhole size={15} />} onClick={() => void togglePin()} variant="secondary">{room.isPinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}</Button>}
        </div>
      </div>

      <div className="room-layout">
        <section aria-label="Katılımcılar" className="room-stage">
          <div className="stage-topline"><span><span className="stage-live-dot" /> ODA OTURUMU</span><span><UsersRound size={14} /> {members.length} / 4 kişi</span></div>
          <div className="participant-grid">
            {members.map((member) => {
              const host = member.uid === room.metadata.hostUid
              const self = member.uid === profile?.uid
              return <article className={`participant-card${self ? ' participant-card--local' : ''}`} key={member.uid}>
                <div className="participant-orb participant-orb--you">{getNicknameInitial(member.nickname)}</div>
                <div className="participant-label"><span><strong>{self ? 'Sen' : member.nickname}</strong><small>{member.nickname}</small></span><span className="participant-mic"><MicOff size={15} /></span></div>
                {host && <span className="host-tag"><ShieldCheck size={12} /> Oda sahibi</span>}
              </article>
            })}
            {Array.from({ length: Math.max(0, 4 - members.length) }, (_, index) => <article className="participant-card participant-card--empty" key={`empty-${index}`}><span className="empty-seat-icon"><UsersRound size={21} /></span><strong>Boş koltuk</strong><small>Odaya katılmayı bekliyor</small></article>)}
          </div>
          <div className="room-control-bar">
            <span className="control-button" title="Medya özellikleri PHASE 07–09’da gelecek"><Radio size={18} /><span>Medya kapalı</span></span>
            <span className="control-divider" />
            <button className="leave-button" onClick={() => void leaveRoom()} type="button"><ArrowLeft size={16} /><span>Odadan ayrıl</span></button>
          </div>
          <p className="stage-footnote"><span className="stage-lock"><ShieldCheck size={14} /></span>Ses ve görüntü bağlantısı henüz etkin değil.</p>
        </section>

        <aside aria-label="Oda sohbeti" className="chat-panel">
          <div className="chat-panel-heading"><div><h2>Sohbet</h2><span>{room.metadata.type === 'fixed' ? 'Son 100 mesaj saklanır' : 'Geçici oda mesajları'}</span></div><LockKeyhole size={16} /></div>
          <div aria-live="polite" className="chat-message-list" role="log">
            {messages.length === 0 && <div className="chat-empty-state"><span className="chat-empty-icon"><Send size={19} /></span><strong>Henüz mesaj yok</strong><p>İlk mesajı göndererek sohbeti başlat.</p></div>}
            {messages.map((message) => <article className={`chat-message${message.senderUid === profile?.uid ? ' chat-message--own' : ''}`} key={message.id}>
              <div className="chat-message-meta"><strong>{message.senderUid === profile?.uid ? 'Sen' : message.senderNickname}</strong><time dateTime={new Date(message.createdAt).toISOString()}>{message.createdAt ? new Date(message.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'şimdi'}</time></div>
              <p>{message.text}</p>
            </article>)}
            <div ref={messageEndRef} />
          </div>
          <div className="chat-composer-wrap">
            {chatError && <p className="auth-form-error" role="alert">{chatError}</p>}
            <form className="chat-composer" onSubmit={(event) => void submitMessage(event)}>
              <input aria-label="Mesaj yaz" autoComplete="off" maxLength={1000} onChange={(event) => setDraft(event.target.value)} placeholder="Mesaj yaz…" value={draft} />
              <button aria-label="Mesaj gönder" className="send-button" disabled={sending || !draft.trim()} type="submit"><Send size={16} /></button>
            </form>
          </div>
          <div className="room-info-content room-info-compact">
            <strong>{title}</strong><code>{roomId}</code>
            <span>{members.length} aktif katılımcı · kapasite 4</span>
            {isHost && room.metadata.type === 'fixed' && <form className="room-member-form" onSubmit={(event) => void addMember(event)}>
              <label className="field-label" htmlFor="member-uid">Üye UID yetkilendir</label>
              <input className="text-input" id="member-uid" onChange={(event) => setMemberUid(event.target.value)} placeholder="Firebase UID" value={memberUid} />
              <Button disabled={!memberUid.trim()} type="submit" variant="secondary">Üyeyi ekle</Button>
            </form>}
            {actionError && <p className="auth-form-error" role="alert">{actionError}</p>}
            <p className="room-info-note"><Check size={14} /> {room.metadata.type === 'fixed' ? 'Sabit oda, host yeniden katılana kadar kapalı kalır.' : 'Geçici oda host ayrılınca kapanır.'}</p>
          </div>
        </aside>
      </div>

      <section className="room-preview-notice"><span className="preview-note-icon"><Camera size={17} /></span><p><strong>Yazılı sohbet etkin</strong><span>Ses, kamera ve ekran paylaşımı sonraki aşamalarda etkinleşecek.</span></p><span className="preview-note-mark">PHASE 05</span></section>
    </div>
  )
}
