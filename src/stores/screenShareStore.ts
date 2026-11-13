import { create } from 'zustand'

type ScreenShareState = {
  screenStream: MediaStream | null
  screenShareError: string | null
  setScreenShareError: (error: string | null) => void
  startScreenShare: () => Promise<void>
  stopScreenShare: () => void
}

function getCaptureError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError') return 'Ekran seçimi iptal edildi veya paylaşım izni verilmedi.'
  if (name === 'NotFoundError') return 'Paylaşılabilecek ekran veya pencere bulunamadı.'
  if (name === 'NotReadableError') return 'Ekran yakalanamadı. İşletim sistemi paylaşımı engellemiş olabilir.'
  if (name === 'InvalidStateError') return 'Ekran paylaşımını başlatmak için bu sayfada bir kez tıklayın.'
  if (name === 'SecurityError') return 'Tarayıcı bu sayfada ekran paylaşımına izin vermiyor. HTTPS veya localhost kullanın.'
  return 'Ekran paylaşımı başlatılamadı. Tarayıcı ve işletim sistemi izinlerini kontrol edin.'
}

export const useScreenShareStore = create<ScreenShareState>((set, get) => ({
  screenStream: null,
  screenShareError: null,
  startScreenShare: async () => {
    if (get().screenStream) return
    if (!navigator.mediaDevices?.getDisplayMedia) {
      const error = 'Bu tarayıcı ekran paylaşımını desteklemiyor. HTTPS veya localhost üzerinden açın.'
      set({ screenShareError: error })
      throw new Error(error)
    }

    set({ screenShareError: null })
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
          frameRate: { ideal: 15, max: 30 },
        },
        audio: false,
      })
      const track = stream.getVideoTracks()[0]
      if (!track) {
        stream.getTracks().forEach((item) => item.stop())
        throw new Error('Tarayıcı ekran görüntüsü track’i döndürmedi.')
      }

      track.onended = () => {
        if (get().screenStream === stream) set({ screenStream: null, screenShareError: null })
      }
      set({ screenStream: stream, screenShareError: null })
    } catch (cause) {
      const error = cause instanceof Error && cause.message === 'Tarayıcı ekran görüntüsü track’i döndürmedi.'
        ? cause.message
        : getCaptureError(cause)
      set({ screenShareError: error })
      throw new Error(error)
    }
  },
  stopScreenShare: () => {
    get().screenStream?.getTracks().forEach((track) => track.stop())
    set({ screenStream: null, screenShareError: null })
  },
  setScreenShareError: (screenShareError) => set({ screenShareError }),
}))
