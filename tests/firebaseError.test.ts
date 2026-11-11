import { describe, expect, it } from 'vitest'
import { FirebaseServiceError, getFirebaseErrorMessage } from '../src/services/firebase/firebaseError'

describe('Firebase hata eşleme', () => {
  it('Anonymous Authentication ayar hatasını açıklar', () => {
    const error = Object.assign(new Error('blocked'), { code: 'auth/operation-not-allowed' })
    expect(getFirebaseErrorMessage(error)).toContain('Anonymous giriş yöntemini etkinleştirin')
  })

  it('Firestore ve RTDB izin hatalarını ortak mesajla eşler', () => {
    expect(getFirebaseErrorMessage({ code: 'permission-denied' }, 'firestore'))
      .toBe('Bu Firebase verisine erişim izniniz yok.')
    expect(getFirebaseErrorMessage({ code: 'PERMISSION_DENIED' }, 'realtime-database'))
      .toBe('Bu Firebase verisine erişim izniniz yok.')
  })

  it('servis ve işlem bağlamını hata nesnesinde tutar', () => {
    const error = new FirebaseServiceError('firestore', 'read-fixed-room', { code: 'permission-denied' })
    expect(error.service).toBe('firestore')
    expect(error.operation).toBe('read-fixed-room')
    expect(error.code).toBe('permission-denied')
  })
})
