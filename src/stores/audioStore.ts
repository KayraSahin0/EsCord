import { create } from 'zustand'

type AudioDeviceState = {
  inputDevices: MediaDeviceInfo[]
  outputDevices: MediaDeviceInfo[]
  inputDeviceId: string
  outputDeviceId: string
  microphoneStream: MediaStream | null
  microphoneError: string | null
  remoteVolumes: Record<string, number>
  enumerateDevices: () => Promise<void>
  startMicrophone: () => Promise<void>
  stopMicrophone: () => void
  setInputDeviceId: (deviceId: string) => Promise<void>
  setOutputDeviceId: (deviceId: string) => void
  setRemoteVolume: (uid: string, volume: number) => void
}

const INPUT_KEY = 'escord.audio.input-device'
const OUTPUT_KEY = 'escord.audio.output-device'

function readPreference(key: string): string {
  try { return localStorage.getItem(key) ?? '' } catch { return '' }
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
    const oldStream = get().microphoneStream
    set({ microphoneError: null })
    try {
      const stream = await requestMicrophone(get().inputDeviceId)
      oldStream?.getTracks().forEach((track) => track.stop())
      set({ microphoneStream: stream, microphoneError: null })
      await get().enumerateDevices()
    } catch (error) {
      set({ microphoneError: error instanceof Error ? error.message : 'Mikrofon açılamadı.' })
      throw error
    }
  },
  stopMicrophone: () => {
    get().microphoneStream?.getTracks().forEach((track) => track.stop())
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
  setRemoteVolume: (uid, volume) => set((state) => ({
    remoteVolumes: { ...state.remoteVolumes, [uid]: Math.min(1, Math.max(0, volume)) },
  })),
}))
