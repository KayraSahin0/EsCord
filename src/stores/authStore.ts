import { create } from 'zustand'
import { firebaseAuth, isFirebaseConfigured } from '../services/firebase/app'
import { getFirebaseErrorMessage } from '../services/firebase/firebaseError'
import {
  signInAsGuest,
  signInWithEmail as authenticateEmail,
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
  signInWithEmail: (email: string, password: string, createAccount: boolean) => Promise<boolean>
  saveNickname: (nickname: string) => Promise<boolean>
  signOut: () => Promise<void>
  clearProfileError: () => void
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
        set({ status: 'error', errorMessage: getFirebaseErrorMessage(error, 'auth') })
      },
    })
  },
  retrySignIn: async () => {
    set({ status: 'loading', errorMessage: null })
    try {
      await signInAsGuest()
    } catch (error) {
      set({ status: 'error', errorMessage: getFirebaseErrorMessage(error, 'auth') })
    }
  },
  signInWithEmail: async (email, password, createAccount) => {
    set({ status: 'loading', errorMessage: null })
    try {
      await authenticateEmail(email.trim(), password, createAccount)
      return true
    } catch (error) {
      set({ status: 'signed-out', errorMessage: getFirebaseErrorMessage(error, 'auth') })
      return false
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
      set({ status: 'error', errorMessage: getFirebaseErrorMessage(error, 'auth') })
    }
  },
  clearProfileError: () => set({ profileError: null }),
}))


