import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Camera, CameraOff, Check, Copy, LockKeyhole, MessageCircle, Mic, MicOff, MonitorStop, MonitorUp, Send, ShieldCheck, UsersRound } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../stores/authStore'
import { useRoomStore } from '../../stores/roomStore'
import { sendRoomMessage, subscribeToRoomMessages, type ChatMessage } from '../../services/firebase/chatService'
import { getFirebaseErrorMessage } from '../../services/firebase/firebaseError'
import { getNicknameInitial } from '../profile/nickname'
import { useAudioStore } from '../../stores/audioStore'
import { RemoteAudioPlayer } from './RemoteAudioPlayer'
import { ParticipantVideo } from './ParticipantVideo'
import { setActiveRoomCamera, setActiveRoomMicrophone } from '../../services/firebase/realtimeDatabaseService'
import { useVideoStore } from '../../stores/videoStore'
import { useScreenShareStore } from '../../stores/screenShareStore'
import { YoutubePanel } from './YoutubePanel'

export function RoomPage() {
  const { roomId = '' } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const isAnonymous = profile?.isAnonymous ?? true
  const room = useRoomStore((state) => state.activeRoom)
  const members = useRoomStore((state) => state.activeMembers)
  const peerConnections = useRoomStore((state) => state.peerConnections)
  const remoteMediaStreams = useRoomStore((state) => state.remoteMediaStreams)
  const remoteScreenStreams = useRoomStore((state) => state.remoteScreenStreams)
  const setLocalAudioStream = useRoomStore((state) => state.setLocalAudioStream)
  const setLocalVideoStream = useRoomStore((state) => state.setLocalVideoStream)
  const microphoneStream = useAudioStore((state) => state.microphoneStream)
  const microphoneError = useAudioStore((state) => state.microphoneError)
  const startMicrophone = useAudioStore((state) => state.startMicrophone)
  const stopMicrophone = useAudioStore((state) => state.stopMicrophone)
  const cameraStream = useVideoStore((state) => state.cameraStream)
  const cameraError = useVideoStore((state) => state.cameraError)
  const startCamera = useVideoStore((state) => state.startCamera)
  const stopCamera = useVideoStore((state) => state.stopCamera)
  const screenStream = useScreenShareStore((state) => state.screenStream)
  const screenShareError = useScreenShareStore((state) => state.screenShareError)
  const startScreenShare = useScreenShareStore((state) => state.startScreenShare)
  const stopScreenShare = useScreenShareStore((state) => state.stopScreenShare)
  const status = useRoomStore((state) => state.activeRoomStatus)
  const error = useRoomStore((state) => state.activeRoomError)
  const leave = useRoomStore((state) => state.leaveCurrentRoom)
  const pin = useRoomStore((state) => state.pinCurrentRoom)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [youtubeOpen, setYoutubeOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [chatState, setChatState] = useState<{ key: string; messages: ChatMessage[] }>({ key: '', messages: [] })
  const [draft, setDraft] = useState('')
  const [chatError, setChatError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const chatRoomKey = room ? `${room.roomId}:${room.metadata.type}` : ''
  const messages = chatState.key === chatRoomKey ? chatState.messages : []
  const activeRoomId = room?.roomId
  const activeConnectionId = room?.connectionId
  const screenShares = [
    ...(screenStream ? [{ uid: profile?.uid ?? 'local', nickname: profile?.nickname ?? 'Sen', stream: screenStream, isLocal: true }] : []),
    ...members.flatMap((member) => {
      const stream = remoteScreenStreams[member.uid]
      return member.uid !== profile?.uid && stream?.getVideoTracks().some((track) => track.readyState === 'live')
        ? [{ uid: member.uid, nickname: member.nickname, stream, isLocal: false }]
        : []
    }),
  ]

  useEffect(() => {
    void setLocalAudioStream(microphoneStream)
  }, [microphoneStream, setLocalAudioStream])

  useEffect(() => {
    void setLocalVideoStream(cameraStream)
  }, [cameraStream, setLocalVideoStream])

  useEffect(() => {
    if (!activeRoomId || !activeConnectionId || activeRoomId !== roomId || status !== 'ready') return
    void setActiveRoomMicrophone(activeRoomId, activeConnectionId, !!microphoneStream).catch((cause: unknown) => {
      setActionError(getFirebaseErrorMessage(cause, 'realtime-database'))
    })
  }, [activeConnectionId, activeRoomId, microphoneStream, roomId, status])

  useEffect(() => {
    if (!activeRoomId || !activeConnectionId || activeRoomId !== roomId || status !== 'ready') return
    void setActiveRoomCamera(activeRoomId, activeConnectionId, !!cameraStream).catch((cause: unknown) => {
      setActionError(getFirebaseErrorMessage(cause, 'realtime-database'))
    })
  }, [activeConnectionId, activeRoomId, cameraStream, roomId, status])

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
    stopMicrophone()
    stopCamera()
    stopScreenShare()
    await leave()
    navigate('/')
  }

  async function toggleMicrophone() {
    if (microphoneStream) {
      stopMicrophone()
      return
    }
    try {
      await startMicrophone()
    } catch {
      // The audio store exposes a user-facing permission/device error.
    }
  }

  async function toggleCamera() {
    if (cameraStream) {
      stopCamera()
      return
    }
    try {
      await startCamera()
    } catch {
      // The video store exposes a user-facing permission/device error.
    }
  }

  async function toggleScreenShare() {
    if (screenStream) {
      stopScreenShare()
      return
    }
    try {
      await startScreenShare()
    } catch {
      // The screen share store exposes a user-facing permission/device error.
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL}#/rooms/${roomId}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setActionError('Bağlantı panoya kopyalanamadı. Adres çubuğundaki URL’yi kopyalayın.')
    }
  }

  async function togglePin() {
    setActionError(null)
    try {
      await pin()
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Oda ayarı kaydedilemedi.')
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
          <Button aria-expanded={youtubeOpen} aria-label={youtubeOpen ? 'YouTube panelini kapat' : 'YouTube panelini aç'} className="youtube-toggle-button" icon={<svg aria-hidden="true" className="youtube-brand-icon" viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" /></svg>} onClick={() => setYoutubeOpen((open) => !open)} variant="secondary">YouTube</Button>
          <Button aria-expanded={chatOpen} aria-label={chatOpen ? 'Sohbeti kapat' : 'Sohbeti aç'} icon={<MessageCircle size={15} />} onClick={() => setChatOpen((open) => !open)} variant="secondary">{chatOpen ? 'Sohbeti kapat' : 'Sohbeti aç'}</Button>
          {isHost && room.metadata.type === 'temporary' && !isAnonymous && <Button icon={<LockKeyhole size={15} />} onClick={() => void togglePin()} variant="secondary">Sabitle</Button>}
        </div>
      </div>

      <div className={`room-layout${chatOpen ? '' : ' room-layout--chat-closed'}`}>
        <section aria-label="Katılımcılar" className="room-stage">
          <div className="stage-topline"><span><span className="stage-live-dot" /> ODA OTURUMU</span><span><UsersRound size={14} /> {members.length} / 4 kişi</span></div>
          {screenShares.length > 0 && <div aria-label="Ekran paylaşımı" className="screen-share-grid">
            {screenShares.map((share) => <article className="screen-share-card" key={share.uid}>
              <div className="screen-share-title"><MonitorUp size={14} /><strong>{share.isLocal ? 'Ekranını paylaşıyorsun' : `${share.nickname} ekranını paylaşıyor`}</strong></div>
              <div className="screen-share-view"><ParticipantVideo initial={getNicknameInitial(share.nickname)} label={`${share.nickname} ekranı`} showVideo stream={share.stream} /></div>
            </article>)}
          </div>}
          <div className="participant-grid">
            {members.map((member) => {
              const host = member.uid === room.metadata.hostUid
              const self = member.uid === profile?.uid
              const peerConnection = peerConnections.find((connection) => connection.uid === member.uid)
              const connectionLabel = peerConnection?.state === 'connected'
                ? `P2P bağlı${peerConnection.roundTripMs === undefined ? '' : ` · ${peerConnection.roundTripMs} ms`}`
                : peerConnection?.state === 'failed'
                  ? peerConnection.error || 'P2P bağlantısı kurulamadı'
                  : peerConnection?.state === 'disconnected'
                    ? 'P2P bağlantısı kesildi'
                    : peerConnection?.state === 'waiting'
                      ? 'Yeniden katılım bekleniyor'
                      : 'P2P bağlanıyor…'
              return <article className={`participant-card${self ? ' participant-card--local' : ''}`} key={member.uid}>
                <ParticipantVideo initial={getNicknameInitial(member.nickname)} label={self ? 'Sen' : member.nickname} showVideo={self ? !!cameraStream : !!member.cameraEnabled} stream={self ? cameraStream ?? undefined : remoteMediaStreams[member.uid]} />
                <div className="participant-label"><span><strong>{self ? 'Sen' : member.nickname}</strong><small>{member.nickname}</small>{!self && <small className={`participant-connection participant-connection--${peerConnection?.state ?? 'connecting'}`} title={peerConnection?.error}>{connectionLabel}</small>}</span><span className="participant-media-icons"><span aria-label={member.microphoneEnabled ? 'Mikrofon açık' : 'Mikrofon kapalı'} className={`participant-mic${member.microphoneEnabled ? ' participant-mic--on' : ''}`}>{member.microphoneEnabled ? <Mic size={15} /> : <MicOff size={15} />}</span><span aria-label={member.cameraEnabled ? 'Kamera açık' : 'Kamera kapalı'} className={`participant-mic${member.cameraEnabled ? ' participant-mic--on' : ''}`}>{member.cameraEnabled ? <Camera size={15} /> : <CameraOff size={15} />}</span></span></div>
                {host && <span className="host-tag"><ShieldCheck size={12} /> Oda sahibi</span>}
                {!self && <RemoteAudioPlayer uid={member.uid} stream={remoteMediaStreams[member.uid]} />}
              </article>
            })}
            {Array.from({ length: Math.max(0, 4 - members.length) }, (_, index) => <article className="participant-card participant-card--empty" key={`empty-${index}`}><span className="empty-seat-icon"><UsersRound size={21} /></span><strong>Boş koltuk</strong><small>Odaya katılmayı bekliyor</small></article>)}
          </div>
          <div className="room-control-bar">
            <button aria-pressed={!!microphoneStream} className={`voice-control${microphoneStream ? ' voice-control--active' : ''}`} onClick={() => void toggleMicrophone()} type="button">
              {microphoneStream ? <Mic size={18} /> : <MicOff size={18} />}<span>{microphoneStream ? 'Mikrofon açık' : 'Mikrofon kapalı'}</span>
            </button>
            <button aria-pressed={!!cameraStream} className={`voice-control${cameraStream ? ' voice-control--active' : ''}`} onClick={() => void toggleCamera()} type="button">
              {cameraStream ? <Camera size={18} /> : <CameraOff size={18} />}<span>{cameraStream ? 'Kamera açık' : 'Kamera kapalı'}</span>
            </button>
            <button aria-pressed={!!screenStream} className={`voice-control${screenStream ? ' voice-control--active' : ''}`} onClick={() => void toggleScreenShare()} type="button">
              {screenStream ? <MonitorStop size={18} /> : <MonitorUp size={18} />}<span>{screenStream ? 'Paylaşımı durdur' : 'Ekran paylaş'}</span>
            </button>
            <span className="control-divider" />
            <button className="leave-button" onClick={() => void leaveRoom()} type="button"><ArrowLeft size={16} /><span>Odadan ayrıl</span></button>
          </div>
          {microphoneError && <p className="auth-form-error room-microphone-error" role="alert">{microphoneError}</p>}
          {cameraError && <p className="auth-form-error room-microphone-error" role="alert">{cameraError}</p>}
          {screenShareError && <p className="auth-form-error room-microphone-error" role="alert">{screenShareError}</p>}
          <p className="stage-footnote"><span className="stage-lock"><ShieldCheck size={14} /></span>{peerConnections.some((connection) => connection.state === 'connected') ? 'Ses ve görüntü peer cihazlarına P2P aktarılır; Firebase medya taşımaz.' : 'Medya gönderimi için önce diğer katılımcıyla P2P bağlantısı kuruluyor.'}</p>
        </section>

        {chatOpen && <aside aria-label="Oda sohbeti" className="chat-panel">
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
            {actionError && <p className="auth-form-error" role="alert">{actionError}</p>}
            <p className="room-info-note"><Check size={14} /> {room.metadata.type === 'fixed' ? 'Oda koduna sahip oturum açmış kullanıcılar katılabilir. Host yeniden katılana kadar oda kapalıdır.' : 'Geçici oda host ayrılınca kapanır.'}</p>
          </div>
        </aside>}
      </div>

      {youtubeOpen && profile?.uid && <YoutubePanel isHost={isHost} roomId={roomId} uid={profile.uid} />}

      <section className="room-preview-notice"><span className="preview-note-icon"><MonitorUp size={17} /></span><p><strong>Ekran paylaşımı P2P ile aktarılır</strong><span>Ekran, kamera ve mikrofon ayrı akışlardır. Tarayıcının paylaşım çubuğundan durdurman da algılanır.</span></p><span className="preview-note-mark">PHASE 09</span></section>
    </div>
  )
}
