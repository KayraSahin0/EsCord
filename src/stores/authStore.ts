import { create } from 'zustand'
import { firebaseAuth, isFirebaseConfigured } from '../services/firebase/app'
import {
  signInAsGuest,
  signOutCurrentUser,
  subscribeToAuth,
  updateNickname as persistNickname,
  type AuthProfile,
} from '../services/firebase/authService'

export type AuthStatus = 'loading' | 'ready' | 'signed-out' | 'config-missing' | 'error'

type AuthState = {
  status: AuthStatus
  profile: AuthProfile | null
  errorMessage: string | null
  profileError: string | null
  profileSaving: boolean
  initialize: () => () => void
  retrySignIn: () => Promise<void>
  saveNickname: (nickname: string) => Promise<boolean>
  signOut: () => Promise<void>
  clearProfileError: () => void
}

function readableAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code
  if (code === 'auth/operation-not-allowed') {
    return 'Firebase Console’da Anonymous giriş yöntemini etkinleştirin.'
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Bu adres Firebase Authentication yetkili alan adlarında değil.'
  }
  if (code === 'auth/network-request-failed') {
    return 'Firebase’e bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'
  }
  if (code === 'auth/invalid-api-key') {
    return 'Firebase Web App API anahtarı geçersiz. Yapılandırmayı kontrol edin.'
  }
  return 'Kimlik doğrulama tamamlanamadı. Firebase ayarlarını ve bağlantınızı kontrol edin.'
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  profile: null,
  errorMessage: null,
  profileError: null,
  profileSaving: false,
  initialize: () => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      set({ status: 'config-missing', profile: null, errorMessage: null })
      return () => undefined
    }

    set({ status: 'loading', errorMessage: null })
    return subscribeToAuth({
      onUser: (profile) => {
        set({
          status: profile ? 'ready' : 'signed-out',
          profile,
          errorMessage: null,
        })
      },
      onError: (error) => {
        set({ status: 'error', errorMessage: readableAuthError(error) })
      },
    })
  },
  retrySignIn: async () => {
    set({ status: 'loading', errorMessage: null })
    try {
      await signInAsGuest()
    } catch (error) {
      set({ status: 'error', errorMessage: readableAuthError(error) })
    }
  },
  saveNickname: async (nickname) => {
    set({ profileSaving: true, profileError: null })
    try {
      const profile = await persistNickname(nickname)
      set({ profile, status: 'ready', profileSaving: false })
      return true
    } catch {
      set({
        profileSaving: false,
        profileError: 'Takma ad kaydedilemedi. Bağlantınızı kontrol edip yeniden deneyin.',
      })
      return false
    }
  },
  signOut: async () => {
    set({ status: 'loading', errorMessage: null })
    try {
      await signOutCurrentUser()
      set({ status: 'signed-out', profile: null })
    } catch (error) {
      set({ status: 'error', errorMessage: readableAuthError(error) })
    }
  },
  clearProfileError: () => set({ profileError: null }),
}))


