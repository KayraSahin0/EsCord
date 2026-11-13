import { describe, expect, it } from 'vitest'
import { getExpectedYoutubeTime, parseYouTubeVideoId, youtubeErrorMessage } from '../src/services/youtube/youtubeUtils'

describe('YouTube yardımcıları', () => {
  it.each([
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?t=30', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('video kimliğini ayıklar: %s', (input, expected) => {
    expect(parseYouTubeVideoId(input)).toBe(expected)
  })

  it.each(['https://example.com/dQw4w9WgXcQ', 'https://youtube.com/watch?v=short', 'hello'])('geçersiz girdiyi reddeder: %s', (input) => {
    expect(parseYouTubeVideoId(input)).toBeNull()
  })

  it('oynarken beklenen konumu hıza göre hesaplar', () => {
    expect(getExpectedYoutubeTime({ videoId: 'dQw4w9WgXcQ', playbackState: 'playing', currentTime: 10, playbackRate: 2, updatedAt: 1_000, controllerUid: 'host' }, 3_000)).toBe(14)
  })

  it('YouTube gömme hatalarını açıklayıcı gösterir', () => {
    expect(youtubeErrorMessage(150)).toContain('izin vermiyor')
  })
})
