import { create } from 'zustand'

type AudioDeviceState = {
  inputDevices: MediaDeviceInfo[]
  outputDevices: MediaDeviceInfo[]
  inputDeviceId: string
  outputDeviceId: string
  microphoneSensitivity: number
  microphoneStream: MediaStream | null
  microphoneError: string | null
  remoteVolumes: Record<string, number>
  enumerateDevices: () => Promise<void>
  startMicrophone: () => Promise<void>
  stopMicrophone: () => void
  setInputDeviceId: (deviceId: string) => Promise<void>
  setOutputDeviceId: (deviceId: string) => void
  setMicrophoneSensitivity: (sensitivity: number) => void
  setRemoteVolume: (uid: string, volume: number) => void
}

const INPUT_KEY = 'escord.audio.input-device'
const OUTPUT_KEY = 'escord.audio.output-device'
const SENSITIVITY_KEY = 'escord.audio.sensitivity'
let microphoneSource: MediaStream | null = null
let microphoneContext: AudioContext | null = null
let microphoneGain: GainNode | null = null

function readPreference(key: string): string {
  try { return localStorage.getItem(key) ?? '' } catch { return '' }
}

function readSensitivity(): number {
  const stored = readPreference(SENSITIVITY_KEY)
  if (!stored) return 100
  const parsed = Number(stored)
  return Number.isFinite(parsed) ? Math.min(200, Math.max(0, parsed)) : 100
}

async function requestMicrophone(deviceId: string): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Bu tarayıcı mikrofon erişimini desteklemiyor. HTTPS veya localhost üzerinden açın.')
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false,
    })
  } catch (error) {
    const name = error instanceof DOMException ? error.name : ''
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new Error('Mikrofon izni verilmedi. Tarayıcı site izinlerinden mikrofon erişimini açın.')
    if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new Error('Seçilen mikrofon bulunamadı. Ayarlar’dan başka bir giriş cihazı seçin.')
    if (name === 'NotReadableError' || name === 'AbortError') throw new Error('Mikrofon kullanılamıyor. Başka bir uygulama cihazı kullanıyor olabilir.')
    throw new Error('Mikrofon açılamadı. Cihazı ve tarayıcı izinlerini kontrol edip yeniden deneyin.')
  }
}

export const useAudioStore = create<AudioDeviceState>((set, get) => ({
  inputDevices: [],
  outputDevices: [],
  inputDeviceId: readPreference(INPUT_KEY),
  outputDeviceId: readPreference(OUTPUT_KEY),
  microphoneSensitivity: readSensitivity(),
  microphoneStream: null,
  microphoneError: null,
  remoteVolumes: {},
  enumerateDevices: async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      set({
        inputDevices: devices.filter((device) => device.kind === 'audioinput'),
        outputDevices: devices.filter((device) => device.kind === 'audiooutput'),
      })
    } catch {
      set({ inputDevices: [], outputDevices: [] })
    }
  },
  startMicrophone: async () => {
    set({ microphoneError: null })
    try {
      const sourceStream = await requestMicrophone(get().inputDeviceId)
      let stream = sourceStream
      let nextContext: AudioContext | null = null
      let nextGain: GainNode | null = null
      if (window.AudioContext) {
        try {
          nextContext = new AudioContext()
          const source = nextContext.createMediaStreamSource(sourceStream)
          nextGain = nextContext.createGain()
          nextGain.gain.value = get().microphoneSensitivity / 100
          const destination = nextContext.createMediaStreamDestination()
          source.connect(nextGain).connect(destination)
          stream = destination.stream
          await nextContext.resume()
        } catch {
          await nextContext?.close()
          nextContext = null
          nextGain = null
          stream = sourceStream
        }
      }
      get().microphoneStream?.getTracks().forEach((track) => track.stop())
      microphoneSource?.getTracks().forEach((track) => track.stop())
      if (microphoneContext && microphoneContext !== nextContext) void microphoneContext.close()
      microphoneSource = sourceStream
      microphoneContext = nextContext
      microphoneGain = nextGain
      set({ microphoneStream: stream, microphoneError: null })
      await get().enumerateDevices()
    } catch (error) {
      set({ microphoneError: error instanceof Error ? error.message : 'Mikrofon açılamadı.' })
      throw error
    }
  },
  stopMicrophone: () => {
    get().microphoneStream?.getTracks().forEach((track) => track.stop())
    microphoneSource?.getTracks().forEach((track) => track.stop())
    if (microphoneContext) void microphoneContext.close()
    microphoneSource = null
    microphoneContext = null
    microphoneGain = null
    set({ microphoneStream: null, microphoneError: null })
  },
  setInputDeviceId: async (deviceId) => {
    const previousDeviceId = get().inputDeviceId
    try { localStorage.setItem(INPUT_KEY, deviceId) } catch { /* Device preference remains in memory. */ }
    set({ inputDeviceId: deviceId, microphoneError: null })
    if (get().microphoneStream) {
      try {
        await get().startMicrophone()
      } catch {
        const microphoneError = get().microphoneError
        try { localStorage.setItem(INPUT_KEY, previousDeviceId) } catch { /* Device preference remains in memory. */ }
        set({ inputDeviceId: previousDeviceId, microphoneError })
      }
    }
  },
  setOutputDeviceId: (deviceId) => {
    try { localStorage.setItem(OUTPUT_KEY, deviceId) } catch { /* Device preference remains in memory. */ }
    set({ outputDeviceId: deviceId })
  },
  setMicrophoneSensitivity: (sensitivity) => {
    const value = Math.min(200, Math.max(0, Math.round(sensitivity)))
    try { localStorage.setItem(SENSITIVITY_KEY, String(value)) } catch { /* Keep the preference in memory. */ }
    if (microphoneGain) microphoneGain.gain.setTargetAtTime(value / 100, microphoneContext?.currentTime ?? 0, 0.015)
    set({ microphoneSensitivity: value })
  },
  setRemoteVolume: (uid, volume) => set((state) => ({
    remoteVolumes: { ...state.remoteVolumes, [uid]: Math.min(1, Math.max(0, volume)) },
  })),
}))
