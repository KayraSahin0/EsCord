import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ListVideo, MonitorPlay, SkipForward } from 'lucide-react'
import { advanceYoutubeQueue, publishYoutubeState, queueYoutubeVideo, subscribeToYoutubeState } from '../../services/firebase/realtimeDatabaseService'
import { getFirebaseErrorMessage } from '../../services/firebase/firebaseError'
import type { RoomYoutubeState } from '../../services/firebase/models'
import { getExpectedYoutubeTime, parseYouTubeVideoId, youtubeErrorMessage } from '../../services/youtube/youtubeUtils'

type YTPlayer = {
  destroy: () => void
  getPlayerState: () => number
  getCurrentTime: () => number
  getPlaybackRate: () => number
  getVideoUrl: () => string
  loadVideoById: (videoId: string) => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  playVideo: () => void
  pauseVideo: () => void
  setPlaybackRate: (rate: number) => void
}

type YTNamespace = { Player: new (element: HTMLElement, options: Record<string, unknown>) => YTPlayer }
declare global { interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void } }

let apiPromise: Promise<void> | undefined
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  if (!apiPromise) apiPromise = new Promise<void>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { previous?.(); resolve() }
    let script = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.onerror = () => reject(new Error('YouTube oynatıcı API yüklenemedi.'))
      document.head.append(script)
    }
  }).catch((error: unknown) => { apiPromise = undefined; throw error })
  return apiPromise!
}

type Props = { roomId: string; uid: string; isHost: boolean }

export function YoutubePanel({ roomId, uid, isHost }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const playerReadyRef = useRef(false)
  const sharedStateRef = useRef<RoomYoutubeState | null>(null)
  const applyStateRef = useRef<(next: RoomYoutubeState) => void>(() => undefined)
  const applyingRemoteRef = useRef(false)
  const lastPublishedRef = useRef('')
  const [state, setState] = useState<RoomYoutubeState | null>(null)
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState(isHost ? 'Video bağlantısı bekleniyor' : 'Bir katılımcının video paylaşması bekleniyor')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    sharedStateRef.current = state
  }, [state])

  useEffect(() => subscribeToYoutubeState(roomId, (next) => {
    setState(next)
    sharedStateRef.current = next
    if (next) applyStateRef.current(next)
    if (next) setStatus(next.playbackState === 'playing' ? 'Oynatma eşitleniyor' : 'Video duraklatıldı')
  }, (cause) => setError(getFirebaseErrorMessage(cause, 'realtime-database'))), [roomId])

  useEffect(() => {
    let disposed = false
    let interval = 0
    const initialVideoId = state?.videoId
    if (!initialVideoId) return
    void loadYouTubeApi().then(() => {
      if (disposed || !mountRef.current || !window.YT) return
      playerRef.current = new window.YT.Player(mountRef.current, {
        width: '100%', height: '100%', videoId: initialVideoId,
        playerVars: { enablejsapi: 1, origin: window.location.origin, controls: isHost ? 1 : 0, playsinline: 1, rel: 0, autoplay: 1 },
        events: {
          onReady: () => {
            playerReadyRef.current = true
            const current = sharedStateRef.current
            if (current) applyState(current)
            else setStatus(isHost ? 'YouTube bağlantısı hazır. Bir video bağlantısı girin.' : 'Oda sahibinin video seçmesi bekleniyor.')
            interval = window.setInterval(() => synchronize(), 2500)
          },
          onStateChange: (event: { data: number }) => {
            if (event.data === 1) setStatus('Video oynatılıyor')
            if (event.data === 2) setStatus('Video duraklatıldı')
            if (event.data === 3) setStatus('Video yükleniyor…')
            if (event.data === 0) {
              setStatus('Video sona erdi')
              if (isHost && (sharedStateRef.current?.queue?.length ?? 0) > 0) void advanceNext()
            }
            if (applyingRemoteRef.current || !isHost || !playerRef.current) return
            if (event.data === 1 || event.data === 2) void publishFromPlayer(event.data === 1 ? 'playing' : 'paused')
          },
          onPlaybackRateChange: () => { if (!applyingRemoteRef.current && isHost) void publishFromPlayer() },
          onAutoplayBlocked: () => setStatus('Otomatik oynatma engellendi. Başlat düğmesine basın.'),
          onError: (event: { data: number }) => setError(youtubeErrorMessage(event.data)),
        },
      })
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'YouTube API yüklenemedi.'))
    applyStateRef.current = applyState
    return () => { disposed = true; window.clearInterval(interval); applyStateRef.current = () => undefined; playerReadyRef.current = false; playerRef.current?.destroy(); playerRef.current = null }

    function applyState(next: RoomYoutubeState) {
      const player = playerRef.current
      if (!player || !playerReadyRef.current) return
      applyingRemoteRef.current = true
      const currentVideoId = parseYouTubeVideoId(player.getVideoUrl())
      if (currentVideoId !== next.videoId) {
        player.loadVideoById(next.videoId)
      }
      const expected = getExpectedYoutubeTime(next)
      if (Math.abs(player.getCurrentTime() - expected) > 1.75) player.seekTo(expected, true)
      if (player.getPlaybackRate() !== next.playbackRate) player.setPlaybackRate(next.playbackRate)
      if (next.playbackState === 'playing') player.playVideo()
      else player.pauseVideo()
      window.setTimeout(() => { applyingRemoteRef.current = false }, 400)
    }

    function synchronize() {
      const current = sharedStateRef.current
      const player = playerRef.current
      if (!current || !player) return
      if (isHost) {
        const expected = getExpectedYoutubeTime(current)
        if (Math.abs(player.getCurrentTime() - expected) > 2.5) void publishFromPlayer()
      } else applyState(current)
    }

    async function publishFromPlayer(playbackState?: 'playing' | 'paused') {
      const player = playerRef.current
      const current = sharedStateRef.current
      if (!player) return
      const videoId = current?.videoId ?? parseYouTubeVideoId(player.getVideoUrl())
      if (!videoId) return
      const next = { videoId, playbackState: playbackState ?? (player.getPlayerState() === 1 ? 'playing' : 'paused'), currentTime: Math.max(0, player.getCurrentTime() || 0), playbackRate: player.getPlaybackRate() || 1, controllerUid: uid }
      const signature = JSON.stringify(next)
      if (signature === lastPublishedRef.current) return
      lastPublishedRef.current = signature
      sharedStateRef.current = { ...next, updatedAt: Date.now() }
      try { await publishYoutubeState(roomId, next); setError(null) }
      catch (cause) { setError(getFirebaseErrorMessage(cause, 'realtime-database')) }
    }

    async function advanceNext() {
      try { await advanceYoutubeQueue(roomId, uid); setError(null) }
      catch (cause) { setError(getFirebaseErrorMessage(cause, 'realtime-database')) }
    }
  }, [isHost, roomId, state?.videoId, uid])

  function submitVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const videoId = parseYouTubeVideoId(url)
    if (!videoId) { setError('Geçerli bir YouTube video bağlantısı veya 11 karakterli video kimliği girin.'); return }
    setError(null)
    setError(null)
    const current = sharedStateRef.current
    if (current?.videoId) {
      void queueYoutubeVideo(roomId, videoId, uid).then(() => {
        setUrl('')
        setStatus('Video sıraya eklendi')
      }).catch((cause: unknown) => setError(getFirebaseErrorMessage(cause, 'realtime-database')))
      return
    }
    const next = { videoId, playbackState: 'playing' as const, currentTime: 0, playbackRate: 1, updatedAt: Date.now(), controllerUid: uid }
    sharedStateRef.current = next
    setState(next)
    setUrl('')
    setStatus('Video başlatılıyor…')
    applyStateRef.current(next)
    playerRef.current?.playVideo()
    void publishYoutubeState(roomId, next).catch((cause: unknown) => setError(getFirebaseErrorMessage(cause, 'realtime-database')))
  }

  function skipToNext() {
    void advanceYoutubeQueue(roomId, uid).then(() => { setError(null); setStatus('Sıradaki video başlatılıyor…') })
      .catch((cause: unknown) => setError(getFirebaseErrorMessage(cause, 'realtime-database')))
  }

  return <section className="youtube-panel" aria-label="Eşzamanlı YouTube izleme">
    <div className="youtube-panel-heading"><div><MonitorPlay size={17} /><span><strong>YouTube birlikte izle</strong><small>{isHost ? 'Oda sahibi oynatma kontrollerini eşitler' : 'Video bağlantısını herkes paylaşabilir'}</small></span></div><span className="youtube-status">{status}</span></div>
    <form className="youtube-url-form" onSubmit={submitVideo}><input aria-label="YouTube video bağlantısı" onChange={(event) => setUrl(event.target.value)} placeholder="YouTube video bağlantısını yapıştır" value={url} /><button type="submit">Videoyu paylaş</button></form>
    {state?.queue?.length ? <div className="youtube-queue-bar"><span><ListVideo size={15} /> {state.queue.length} video sırada</span><button onClick={skipToNext} type="button"><SkipForward size={14} /> Sonraki videoya geç</button></div> : null}
    <div className="youtube-player-frame"><div ref={mountRef} /></div>
    {error && <p className="youtube-error" role="alert">{error}</p>}
  </section>
}
