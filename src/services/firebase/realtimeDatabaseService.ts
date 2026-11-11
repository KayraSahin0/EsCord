import { getDatabase, onValue, ref, set, type Unsubscribe } from '@firebase/database'
import { firebaseApp, firebaseAuth, firebaseDatabaseURL } from './app'
import { requireFirebaseService, wrapFirebaseError } from './firebaseError'
import type { RoomAccessMirror } from './models'

const firebaseDatabase = firebaseApp && firebaseDatabaseURL
  ? getDatabase(firebaseApp, firebaseDatabaseURL)
  : null

export async function writeRoomAccessMirror(
  roomId: string,
  memberUids: readonly string[],
): Promise<void> {
  try {
    const hostUid = firebaseAuth?.currentUser?.uid
    if (!hostUid) throw new Error('Firebase Authentication oturumu açık değil.')
    if (!memberUids.includes(hostUid)) {
      throw new Error('Oda sahibi aynalanan üye listesinde bulunmalıdır.')
    }

    const members = Object.fromEntries(memberUids.map((uid) => [uid, true])) as RoomAccessMirror['members']
    await set(ref(requireFirebaseService(firebaseDatabase, 'realtime-database'), `roomAccess/${roomId}`), {
      hostUid,
      members,
    } satisfies RoomAccessMirror)
  } catch (error) {
    throw wrapFirebaseError('realtime-database', 'write-room-access-mirror', error)
  }
}

export function subscribeToRoomAccessMirror(
  roomId: string,
  onValueChange: (mirror: RoomAccessMirror | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  try {
    return onValue(
      ref(requireFirebaseService(firebaseDatabase, 'realtime-database'), `roomAccess/${roomId}`),
      (snapshot) => onValueChange(snapshot.exists() ? snapshot.val() as RoomAccessMirror : null),
      (error) => onError(wrapFirebaseError('realtime-database', 'subscribe-room-access-mirror', error)),
    )
  } catch (error) {
    onError(wrapFirebaseError('realtime-database', 'subscribe-room-access-mirror', error))
    return () => undefined
  }
}

export function subscribeToRoomSession<T>(
  roomId: string,
  onValueChange: (session: T | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  try {
    return onValue(
      ref(requireFirebaseService(firebaseDatabase, 'realtime-database'), `roomSessions/${roomId}`),
      (snapshot) => onValueChange(snapshot.exists() ? snapshot.val() as T : null),
      (error) => onError(wrapFirebaseError('realtime-database', 'subscribe-room-session', error)),
    )
  } catch (error) {
    onError(wrapFirebaseError('realtime-database', 'subscribe-room-session', error))
    return () => undefined
  }
}

export function subscribeToDatabaseConnection(
  onConnectionChange: (connected: boolean) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  try {
    return onValue(
      ref(requireFirebaseService(firebaseDatabase, 'realtime-database'), '.info/connected'),
      (snapshot) => onConnectionChange(snapshot.val() === true),
      (error) => onError(wrapFirebaseError('realtime-database', 'observe-connection', error)),
    )
  } catch (error) {
    onError(wrapFirebaseError('realtime-database', 'observe-connection', error))
    return () => undefined
  }
}
