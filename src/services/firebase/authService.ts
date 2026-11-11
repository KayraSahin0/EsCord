import {
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  updateProfile,
  type Unsubscribe,
  type User,
  type UserCredential,
} from '@firebase/auth'
import { firebaseAuth } from './app'

export type AuthProfile = {
  uid: string
  nickname: string | null
  isAnonymous: boolean
}

type AuthListener = {
  onUser: (user: AuthProfile | null) => void
  onError: (error: unknown) => void
}

let signInPromise: Promise<UserCredential> | null = null
const signedOutStorageKey = 'escord.auth.signed-out'
let userSignedOut = readSignedOutPreference()

function readSignedOutPreference() {
  try {
    return localStorage.getItem(signedOutStorageKey) === 'true'
  } catch {
    return false
  }
}

function writeSignedOutPreference(signedOut: boolean) {
  try {
    if (signedOut) localStorage.setItem(signedOutStorageKey, 'true')
    else localStorage.removeItem(signedOutStorageKey)
  } catch {
    // Firebase Auth still signs out; only reload persistence of this UI choice is unavailable.
  }
}

function requireAuth() {
  if (!firebaseAuth) {
    throw new Error('Firebase web app yapılandırması eksik.')
  }
  return firebaseAuth
}

function toAuthProfile(user: User): AuthProfile {
  return {
    uid: user.uid,
    nickname: user.displayName?.trim() || null,
    isAnonymous: user.isAnonymous,
  }
}

function startAnonymousSignIn(onError: AuthListener['onError']) {
  if (signInPromise) return

  signInPromise = signInAnonymously(requireAuth())
  void signInPromise.catch((error: unknown) => {
    signInPromise = null
    onError(error)
  })
}

export function subscribeToAuth(listener: AuthListener): Unsubscribe {
  const auth = requireAuth()

  return onAuthStateChanged(
    auth,
    (user) => {
      if (user) {
        userSignedOut = false
        writeSignedOutPreference(false)
        signInPromise = null
        listener.onUser(toAuthProfile(user))
      } else if (userSignedOut) {
        listener.onUser(null)
      } else {
        startAnonymousSignIn(listener.onError)
      }
    },
    listener.onError,
  )
}

export async function signInAsGuest(): Promise<void> {
  userSignedOut = false
  writeSignedOutPreference(false)
  signInPromise = null
  await signInAnonymously(requireAuth())
}

export async function updateNickname(nickname: string): Promise<AuthProfile> {
  const auth = requireAuth()
  const user = auth.currentUser
  if (!user) throw new Error('Aktif kullanıcı oturumu bulunamadı.')

  await updateProfile(user, { displayName: nickname })
  return toAuthProfile(user)
}

export async function signOutCurrentUser(): Promise<void> {
  userSignedOut = true
  writeSignedOutPreference(true)
  signInPromise = null
  try {
    await signOut(requireAuth())
  } catch (error) {
    userSignedOut = false
    throw error
  }
}
