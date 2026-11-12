import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

type ParticipantVideoProps = {
  stream: MediaStream | undefined
  showVideo: boolean
  initial: string
  label: string
}

export function ParticipantVideo({ stream, showVideo, initial, label }: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState<string | null>(null)
  const hasVideo = !!showVideo && !!stream?.getVideoTracks().some((track) => track.readyState === 'live')
  const supportsFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = hasVideo ? stream ?? null : null
    if (hasVideo) void video.play().catch(() => undefined)
    return () => { video.srcObject = null }
  }, [hasVideo, stream])

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === frameRef.current)
    document.addEventListener('fullscreenchange', updateFullscreen)
    return () => document.removeEventListener('fullscreenchange', updateFullscreen)
  }, [])

  async function toggleFullscreen() {
    const frame = frameRef.current
    if (!frame) return
    setFullscreenError(null)
    try {
      if (document.fullscreenElement === frame) await document.exitFullscreen()
      else await frame.requestFullscreen()
    } catch {
      setFullscreenError('Görüntü tam ekrana alınamadı. Tarayıcı izinlerini kontrol edin.')
    }
  }

  return hasVideo
    ? <div className="participant-video-frame" ref={frameRef}>
      <video aria-label={`${label} kamerası`} className="participant-video" autoPlay muted playsInline ref={videoRef} />
      {supportsFullscreen && <button aria-label={isFullscreen ? `${label} görüntüsünü tam ekrandan çıkar` : `${label} görüntüsünü tam ekran yap`} className="participant-video-expand" onClick={() => void toggleFullscreen()} type="button">{isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>}
      {fullscreenError && <span className="participant-video-error" role="alert">{fullscreenError}</span>}
    </div>
    : <div aria-label={`${label} avatarı`} className="participant-orb participant-orb--you">{initial}</div>
}
