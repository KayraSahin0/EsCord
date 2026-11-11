import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  type Unsubscribe,
  type User,
} from '@firebase/auth'
import { firebaseAuth } from './app'
import { requireFirebaseService, wrapFirebaseError } from './firebaseError'

export type AuthProfile = {
  uid: string
  nickname: string | null
  isAnonymous: boolean
}

type AuthListener = {
  onUser: (user: AuthProfile | null) => void
  onError: (error: unknown) => void
}

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
  return requireFirebaseService(firebaseAuth, 'auth')
}

function toAuthProfile(user: User): AuthProfile {
  return {
    uid: user.uid,
    nickname: user.displayName?.trim() || null,
    isAnonymous: user.isAnonymous,
  }
}

export function subscribeToAuth(listener: AuthListener): Unsubscribe {
  const auth = requireAuth()

  return onAuthStateChanged(
    auth,
    (user) => {
      if (user) {
        userSignedOut = false
        writeSignedOutPreference(false)
        listener.onUser(toAuthProfile(user))
      } else if (userSignedOut) {
        listener.onUser(null)
      } else {
        listener.onUser(null)
      }
    },
    (error) => listener.onError(wrapFirebaseError('auth', 'observe-auth-state', error)),
  )
}

export async function signInAsGuest(): Promise<void> {
  userSignedOut = false
  writeSignedOutPreference(false)
  try {
    await signInAnonymously(requireAuth())
  } catch (error) {
    throw wrapFirebaseError('auth', 'anonymous-sign-in', error)
  }
}

export async function signInWithEmail(email: string, password: string, createAccount: boolean): Promise<void> {
  userSignedOut = false
  writeSignedOutPreference(false)
  try {
    const auth = requireAuth()
    if (createAccount) await createUserWithEmailAndPassword(auth, email, password)
    else await signInWithEmailAndPassword(auth, email, password)
  } catch (error) {
    throw wrapFirebaseError('auth', createAccount ? 'create-email-account' : 'sign-in-email', error)
  }
}

export async function updateNickname(nickname: string): Promise<AuthProfile> {
  const auth = requireAuth()
  const user = auth.currentUser
  if (!user) throw new Error('Aktif kullanıcı oturumu bulunamadı.')

  try {
    await updateProfile(user, { displayName: nickname })
    return toAuthProfile(user)
  } catch (error) {
    throw wrapFirebaseError('auth', 'update-nickname', error)
  }
}

export async function signOutCurrentUser(): Promise<void> {
  userSignedOut = true
  writeSignedOutPreference(true)
  try {
    await signOut(requireAuth())
  } catch (error) {
    userSignedOut = false
    throw wrapFirebaseError('auth', 'sign-out', error)
  }
}
