import type { RoomYoutubeState } from '../firebase/models'

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

export function parseYouTubeVideoId(input: string): string | null {
  const value = input.trim()
  if (YOUTUBE_ID.test(value)) return value

  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    let id: string | null = null
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? null
    else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v')
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split('/')[2] ?? null
    }
    return id && YOUTUBE_ID.test(id) ? id : null
  } catch {
    return null
  }
}

export function getExpectedYoutubeTime(state: RoomYoutubeState, now = Date.now()): number {
  if (state.playbackState !== 'playing' || !Number.isFinite(state.updatedAt)) return state.currentTime
  return Math.max(0, state.currentTime + Math.max(0, now - state.updatedAt) / 1000 * state.playbackRate)
}

export function youtubeErrorMessage(code: number): string {
  if (code === 2) return 'YouTube video kimliği geçersiz.'
  if (code === 5) return 'Video HTML5 oynatıcıda oynatılamıyor.'
  if (code === 100) return 'Video bulunamadı veya kaldırılmış.'
  if (code === 101 || code === 150) return 'Video sahibi bu videonun gömülü oynatılmasına izin vermiyor.'
  if (code === 153) return 'YouTube oynatıcısı HTTP Referer bilgisini alamadı. Sayfayı HTTPS veya localhost üzerinden açın.'
  return `YouTube oynatıcı hatası (${code}).`
}
