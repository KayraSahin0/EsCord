import { create } from 'zustand'

type VideoDeviceState = {
  cameraDevices: MediaDeviceInfo[]
  cameraDeviceId: string
  cameraStream: MediaStream | null
  cameraError: string | null
  enumerateCameras: () => Promise<void>
  startCamera: () => Promise<void>
  stopCamera: () => void
  setCameraDeviceId: (deviceId: string) => Promise<void>
}

const CAMERA_KEY = 'escord.video.camera-device'

function readCameraPreference(): string {
  try { return localStorage.getItem(CAMERA_KEY) ?? '' } catch { return '' }
}

async function requestCamera(deviceId: string): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Bu tarayıcı kamera erişimini desteklemiyor. HTTPS veya localhost üzerinden açın.')
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 24, max: 30 },
      },
    })
  } catch (error) {
    const name = error instanceof DOMException ? error.name : ''
    if (name === 'NotAllowedError' || name === 'SecurityError') throw new Error('Kamera izni verilmedi. Tarayıcı site izinlerinden kamera erişimini açın.')
    if (name === 'NotFoundError' || name === 'OverconstrainedError') throw new Error('Seçilen kamera bulunamadı. Ayarlar’dan başka bir cihaz seçin.')
    if (name === 'NotReadableError' || name === 'AbortError') throw new Error('Kamera kullanılamıyor. Başka bir uygulama cihazı kullanıyor olabilir.')
    throw new Error('Kamera açılamadı. Cihazı ve tarayıcı izinlerini kontrol edip yeniden deneyin.')
  }
}

export const useVideoStore = create<VideoDeviceState>((set, get) => ({
  cameraDevices: [],
  cameraDeviceId: readCameraPreference(),
  cameraStream: null,
  cameraError: null,
  enumerateCameras: async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      set({ cameraDevices: devices.filter((device) => device.kind === 'videoinput') })
    } catch {
      set({ cameraDevices: [] })
    }
  },
  startCamera: async () => {
    const oldStream = get().cameraStream
    set({ cameraError: null })
    try {
      const stream = await requestCamera(get().cameraDeviceId)
      oldStream?.getTracks().forEach((track) => track.stop())
      set({ cameraStream: stream, cameraError: null })
      await get().enumerateCameras()
    } catch (error) {
      set({ cameraError: error instanceof Error ? error.message : 'Kamera açılamadı.' })
      throw error
    }
  },
  stopCamera: () => {
    get().cameraStream?.getTracks().forEach((track) => track.stop())
    set({ cameraStream: null, cameraError: null })
  },
  setCameraDeviceId: async (deviceId) => {
    const previousDeviceId = get().cameraDeviceId
    try { localStorage.setItem(CAMERA_KEY, deviceId) } catch { /* Device preference remains in memory. */ }
    set({ cameraDeviceId: deviceId, cameraError: null })
    if (!get().cameraStream) return
    try {
      await get().startCamera()
    } catch {
      const cameraError = get().cameraError
      try { localStorage.setItem(CAMERA_KEY, previousDeviceId) } catch { /* Device preference remains in memory. */ }
      set({ cameraDeviceId: previousDeviceId, cameraError })
    }
  },
}))
