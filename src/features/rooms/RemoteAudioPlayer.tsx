import { useEffect, useRef, useState } from 'react'
import { useAudioStore } from '../../stores/audioStore'

type RemoteAudioPlayerProps = {
  uid: string
  stream: MediaStream | undefined
}

export function RemoteAudioPlayer({ uid, stream }: RemoteAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const volume = useAudioStore((state) => state.remoteVolumes[uid] ?? 1)
  const outputDeviceId = useAudioStore((state) => state.outputDeviceId)
  const setVolume = useAudioStore((state) => state.setRemoteVolume)
  const [activity, setActivity] = useState<{ stream: MediaStream | undefined; speaking: boolean }>({ stream: undefined, speaking: false })
  const speaking = activity.stream === stream && activity.speaking

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.srcObject = stream ?? null
    if (stream) void audio.play().catch(() => undefined)
    return () => { audio.srcObject = null }
  }, [stream])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    if (outputDeviceId && 'setSinkId' in audio) {
      void (audio as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(outputDeviceId).catch(() => undefined)
    }
  }, [outputDeviceId, volume])

  useEffect(() => {
    if (!stream) return
    const AudioContextConstructor = window.AudioContext
    if (!AudioContextConstructor) return
    const context = new AudioContextConstructor()
    const analyser = context.createAnalyser()
    analyser.fftSize = 512
    const source = context.createMediaStreamSource(stream)
    source.connect(analyser)
    const samples = new Uint8Array(analyser.fftSize)
    let frame = 0
    let live = true
    let previousSpeaking: boolean | null = null
    const inspect = () => {
      if (!live) return
      analyser.getByteTimeDomainData(samples)
      let sum = 0
      for (const sample of samples) {
        const normalized = (sample - 128) / 128
        sum += normalized * normalized
      }
      const isSpeaking = Math.sqrt(sum / samples.length) > 0.035
      if (isSpeaking !== previousSpeaking) {
        previousSpeaking = isSpeaking
        setActivity({ stream, speaking: isSpeaking })
      }
      frame = window.requestAnimationFrame(inspect)
    }
    void context.resume().then(inspect).catch(() => undefined)
    return () => {
      live = false
      window.cancelAnimationFrame(frame)
      source.disconnect()
      analyser.disconnect()
      void context.close()
    }
  }, [stream])

  useEffect(() => {
    const unlockPlayback = () => { void audioRef.current?.play().catch(() => undefined) }
    document.addEventListener('pointerdown', unlockPlayback)
    document.addEventListener('keydown', unlockPlayback)
    return () => {
      document.removeEventListener('pointerdown', unlockPlayback)
      document.removeEventListener('keydown', unlockPlayback)
    }
  }, [])

  return (
    <div className="remote-audio-controls" aria-label={`${uid} ses ayarları`}>
      <audio autoPlay playsInline ref={audioRef} />
      <span className={`participant-audio-state${stream && speaking ? ' is-speaking' : ''}`} aria-label={stream && speaking ? 'Konuşuyor' : 'Sessiz'} />
      <label className="remote-volume-control">
        <span className="sr-only">{uid} ses seviyesi</span>
        <input aria-label={`${uid} ses seviyesi`} max="1" min="0" onChange={(event) => setVolume(uid, Number(event.target.value))} step="0.05" type="range" value={volume} />
      </label>
    </div>
  )
}
