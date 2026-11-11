export type FirebaseServiceName = 'auth' | 'firestore' | 'realtime-database'

export class FirebaseServiceError extends Error {
  readonly code: string | null
  readonly service: FirebaseServiceName
  readonly operation: string

  constructor(
    service: FirebaseServiceName,
    operation: string,
    cause: unknown,
  ) {
    const code = readErrorCode(cause)
    super(errorMessage(service, code), { cause })
    this.name = 'FirebaseServiceError'
    this.service = service
    this.operation = operation
    this.code = code
  }
}

function readErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : null
}

function errorMessage(service: FirebaseServiceName, code: string | null): string {
  if (code === 'auth/operation-not-allowed') {
    return 'Firebase Console’da Anonymous giriş yöntemini etkinleştirin.'
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Bu adres Firebase Authentication yetkili alan adlarında değil.'
  }
  if (code === 'auth/invalid-api-key') {
    return 'Firebase Web App API anahtarı geçersiz. Yapılandırmayı kontrol edin.'
  }
  if (code === 'auth/network-request-failed') {
    return 'Firebase’e bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'
  }
  if (code?.includes('permission-denied') || code?.includes('PERMISSION_DENIED')) {
    return 'Bu Firebase verisine erişim izniniz yok.'
  }
  if (code?.includes('unavailable') || code?.includes('NETWORK_ERROR')) {
    return 'Firebase hizmetine ulaşılamıyor. Bağlantınızı kontrol edip yeniden deneyin.'
  }
  if (service === 'realtime-database' && code?.includes('disconnected')) {
    return 'Realtime Database bağlantısı kesildi.'
  }
  return 'Firebase işlemi tamamlanamadı. Ayarları ve bağlantıyı kontrol edip yeniden deneyin.'
}

export function getFirebaseErrorMessage(
  error: unknown,
  service: FirebaseServiceName = 'auth',
): string {
  return error instanceof FirebaseServiceError
    ? error.message
    : errorMessage(service, readErrorCode(error))
}

export function wrapFirebaseError(
  service: FirebaseServiceName,
  operation: string,
  cause: unknown,
): FirebaseServiceError {
  return cause instanceof FirebaseServiceError
    ? cause
    : new FirebaseServiceError(service, operation, cause)
}

export function requireFirebaseService<T>(value: T | null, service: FirebaseServiceName): T {
  if (value) return value
  throw new FirebaseServiceError(service, 'configuration', new Error('Firebase yapılandırması eksik.'))
}
