import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  query,
  where,
  writeBatch,
  updateDoc,
  type Unsubscribe,
} from '@firebase/firestore'
import { getFirestore } from '@firebase/firestore'
import { firebaseApp, firebaseAuth } from './app'
import { requireFirebaseService, wrapFirebaseError, type FirebaseServiceError } from './firebaseError'
import type { FixedRoomDocument, FixedRoomSummary, UserProfileDocument } from './models'

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

export async function listFixedRoomsForCurrentUser(): Promise<FixedRoomSummary[]> {
  try {
    const uid = currentUid()
    const database = requireFirebaseService(firebaseFirestore, 'firestore')
    const rooms = await getDocs(query(
      collection(database, 'fixedRooms'),
      where('hostUid', '==', uid),
    ))
    return rooms.docs.map((room) => ({ id: room.id, ...room.data() as FixedRoomDocument }))
  } catch (error) {
    throw wrapFirebaseError('firestore', 'list-owned-fixed-rooms', error)
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

export async function saveFixedRoom(
  roomId: string,
  name: string,
  isPinned = false,
): Promise<void> {
  try {
    const hostUid = currentUid()
    const database = requireFirebaseService(firebaseFirestore, 'firestore')
    const roomRef = doc(database, 'fixedRooms', roomId)
    const batch = writeBatch(database)

    // New room IDs are generated client-side. Avoid reading a not-yet-created
    // room because the create path is authorized by the atomic write itself.
    batch.set(roomRef, {
      name,
      hostUid,
      isPinned,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    await batch.commit()
  } catch (error) {
    throw wrapFirebaseError('firestore', 'save-fixed-room', error)
  }
}

export async function deleteFixedRoomWithHistory(roomId: string): Promise<void> {
  try {
    const database = requireFirebaseService(firebaseFirestore, 'firestore')
    const roomRef = doc(database, 'fixedRooms', roomId)

    // The rule permits only the email/password room owner to mark it for deletion.
    // This also blocks new chat reads/writes while the known subcollections are removed.
    await updateDoc(roomRef, { isDeleting: true, updatedAt: serverTimestamp() })

    const [messagesSnapshot, legacyMembersSnapshot] = await Promise.all([
      getDocs(collection(database, 'fixedRooms', roomId, 'messages')),
      getDocs(collection(database, 'fixedRooms', roomId, 'members')),
    ])
    const documents = [
      ...messagesSnapshot.docs.map((snapshot) => snapshot.ref),
      ...legacyMembersSnapshot.docs.map((snapshot) => snapshot.ref),
      doc(database, 'fixedRooms', roomId, 'chatMeta', 'state'),
    ]

    // Keep each Firestore batch below the 500-write limit.
    for (let offset = 0; offset < documents.length; offset += 450) {
      const batch = writeBatch(database)
      for (const document of documents.slice(offset, offset + 450)) batch.delete(document)
      await batch.commit()
    }
    await deleteDoc(roomRef)
  } catch (error) {
    throw wrapFirebaseError('firestore', 'delete-fixed-room-with-history', error)
  }
}
