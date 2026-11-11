import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from '@firebase/firestore'
import { getFirestore } from '@firebase/firestore'
import { firebaseApp, firebaseAuth } from './app'
import { requireFirebaseService, wrapFirebaseError, type FirebaseServiceError } from './firebaseError'
import type { FixedRoomDocument, FixedRoomMemberDocument, UserProfileDocument } from './models'

const firebaseFirestore = firebaseApp ? getFirestore(firebaseApp) : null

function currentUid(): string {
  const uid = firebaseAuth?.currentUser?.uid
  if (!uid) throw new Error('Firebase Authentication oturumu açık değil.')
  return uid
}

export async function readUserProfile(uid: string): Promise<UserProfileDocument | null> {
  try {
    const snapshot = await getDoc(doc(requireFirebaseService(firebaseFirestore, 'firestore'), 'profiles', uid))
    return snapshot.exists() ? snapshot.data() as UserProfileDocument : null
  } catch (error) {
    throw wrapFirebaseError('firestore', 'read-user-profile', error)
  }
}

export async function saveUserProfile(nickname: string): Promise<void> {
  try {
    const uid = currentUid()
    const database = requireFirebaseService(firebaseFirestore, 'firestore')
    const profileRef = doc(database, 'profiles', uid)
    await runTransaction(database, async (transaction) => {
      const existing = await transaction.get(profileRef)
      transaction.set(profileRef, {
        uid,
        nickname,
        createdAt: existing.data()?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
  } catch (error) {
    throw wrapFirebaseError('firestore', 'save-user-profile', error)
  }
}

export async function readFixedRoom(roomId: string): Promise<FixedRoomDocument | null> {
  try {
    const snapshot = await getDoc(doc(requireFirebaseService(firebaseFirestore, 'firestore'), 'fixedRooms', roomId))
    return snapshot.exists() ? snapshot.data() as FixedRoomDocument : null
  } catch (error) {
    throw wrapFirebaseError('firestore', 'read-fixed-room', error)
  }
}

export function subscribeToFixedRoom(
  roomId: string,
  onRoom: (room: FixedRoomDocument | null) => void,
  onError: (error: FirebaseServiceError) => void,
): Unsubscribe {
  try {
    const roomRef = doc(requireFirebaseService(firebaseFirestore, 'firestore'), 'fixedRooms', roomId)
    return onSnapshot(roomRef, (snapshot) => {
      onRoom(snapshot.exists() ? snapshot.data() as FixedRoomDocument : null)
    }, (error) => onError(wrapFirebaseError('firestore', 'subscribe-fixed-room', error)))
  } catch (error) {
    onError(wrapFirebaseError('firestore', 'subscribe-fixed-room', error))
    return () => undefined
  }
}

export async function createFixedRoom(roomId: string, name: string): Promise<void> {
  try {
    const hostUid = currentUid()
    const database = requireFirebaseService(firebaseFirestore, 'firestore')
    const roomRef = doc(database, 'fixedRooms', roomId)
    const batch = writeBatch(database)
    batch.set(roomRef, {
      name,
      hostUid,
      isPinned: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    batch.set(doc(database, 'fixedRooms', roomId, 'members', hostUid), {
      uid: hostUid,
      authorizedBy: hostUid,
      authorizedAt: serverTimestamp(),
    })
    await batch.commit()
  } catch (error) {
    throw wrapFirebaseError('firestore', 'create-fixed-room', error)
  }
}

export async function readFixedRoomMembers(roomId: string): Promise<FixedRoomMemberDocument[]> {
  try {
    const snapshot = await getDocs(collection(
      requireFirebaseService(firebaseFirestore, 'firestore'), 'fixedRooms', roomId, 'members',
    ))
    return snapshot.docs.map((member) => member.data() as FixedRoomMemberDocument)
  } catch (error) {
    throw wrapFirebaseError('firestore', 'read-fixed-room-members', error)
  }
}

export async function authorizeFixedRoomMember(roomId: string, memberUid: string): Promise<void> {
  try {
    const authorizedBy = currentUid()
    await setDoc(doc(
      requireFirebaseService(firebaseFirestore, 'firestore'), 'fixedRooms', roomId, 'members', memberUid,
    ), {
      uid: memberUid,
      authorizedBy,
      authorizedAt: serverTimestamp(),
    })
  } catch (error) {
    throw wrapFirebaseError('firestore', 'authorize-fixed-room-member', error)
  }
}

export async function revokeFixedRoomMember(roomId: string, memberUid: string): Promise<void> {
  try {
    await deleteDoc(doc(
      requireFirebaseService(firebaseFirestore, 'firestore'), 'fixedRooms', roomId, 'members', memberUid,
    ))
  } catch (error) {
    throw wrapFirebaseError('firestore', 'revoke-fixed-room-member', error)
  }
}
