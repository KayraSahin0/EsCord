import {
  get,
  getDatabase,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
  type Unsubscribe,
} from '@firebase/database'
import { firebaseApp, firebaseAuth, firebaseDatabaseURL } from './app'
import { requireFirebaseService, wrapFirebaseError } from './firebaseError'
import type { RoomAccessMirror, RoomActiveMember, RoomSessionMetadata, RoomType } from './models'

export const firebaseDatabase = firebaseApp && firebaseDatabaseURL
  ? getDatabase(firebaseApp, firebaseDatabaseURL)
  : null

export async function writeRoomAccessMirror(
  roomId: string,
  memberUids: readonly string[],
  type: RoomType,
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
      type,
      members,
    } satisfies RoomAccessMirror)
  } catch (error) {
    throw wrapFirebaseError('realtime-database', 'write-room-access-mirror', error)
  }
}

export async function deleteRoomAccessMirror(roomId: string): Promise<void> {
  try {
    await remove(ref(requireFirebaseService(firebaseDatabase, 'realtime-database'), `roomAccess/${roomId}`))
  } catch (error) {
    throw wrapFirebaseError('realtime-database', 'delete-room-access-mirror', error)
  }
}

export async function readRoomSessionMetadata(roomId: string): Promise<RoomSessionMetadata | null> {
  try {
    const snapshot = await get(ref(
      requireFirebaseService(firebaseDatabase, 'realtime-database'), `roomSessions/${roomId}/metadata`,
    ))
    return snapshot.exists() ? snapshot.val() as RoomSessionMetadata : null
  } catch (error) {
    throw wrapFirebaseError('realtime-database', 'read-room-session-metadata', error)
  }
}

export async function createRoomSessionMetadata(
  roomId: string,
  metadata: Omit<RoomSessionMetadata, 'createdAt' | 'status'>,
): Promise<void> {
  try {
    const value: RoomSessionMetadata = {
      ...metadata,
      status: 'active',
      createdAt: serverTimestamp() as unknown as number,
    }
    await set(ref(
      requireFirebaseService(firebaseDatabase, 'realtime-database'), `roomSessions/${roomId}/metadata`,
    ), value)
  } catch (error) {
    throw wrapFirebaseError('realtime-database', 'create-room-session', error)
  }
}

export async function setRoomSessionType(roomId: string, type: RoomType): Promise<void> {
  try {
    await update(ref(
      requireFirebaseService(firebaseDatabase, 'realtime-database'), `roomSessions/${roomId}/metadata`,
    ), { type })
  } catch (error) {
    throw wrapFirebaseError('realtime-database', 'set-room-session-type', error)
  }
}

export function subscribeToRoomSessionMetadata(
  roomId: string,
  onValueChange: (metadata: RoomSessionMetadata | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  try {
    return onValue(
      ref(requireFirebaseService(firebaseDatabase, 'realtime-database'), `roomSessions/${roomId}/metadata`),
      (snapshot) => onValueChange(snapshot.exists() ? snapshot.val() as RoomSessionMetadata : null),
      (error) => onError(wrapFirebaseError('realtime-database', 'subscribe-room-session-metadata', error)),
    )
  } catch (error) {
    onError(wrapFirebaseError('realtime-database', 'subscribe-room-session-metadata', error))
    return () => undefined
  }
}

export function subscribeToRoomActiveMembers(
  roomId: string,
  onValueChange: (members: RoomActiveMember[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  try {
    return onValue(
      ref(requireFirebaseService(firebaseDatabase, 'realtime-database'), `roomSessions/${roomId}/activeMembers`),
      (snapshot) => {
        const memberMap = snapshot.val() as Record<string, RoomActiveMember> | null
        onValueChange(memberMap ? Object.values(memberMap) : [])
      },
      (error) => onError(wrapFirebaseError('realtime-database', 'subscribe-room-active-members', error)),
    )
  } catch (error) {
    onError(wrapFirebaseError('realtime-database', 'subscribe-room-active-members', error))
    return () => undefined
  }
}

export async function readRoomActiveMembers(roomId: string): Promise<RoomActiveMember[]> {
  try {
    const snapshot = await get(ref(
      requireFirebaseService(firebaseDatabase, 'realtime-database'), `roomSessions/${roomId}/activeMembers`,
    ))
    const memberMap = snapshot.val() as Record<string, RoomActiveMember> | null
    return memberMap ? Object.values(memberMap) : []
  } catch (error) {
    throw wrapFirebaseError('realtime-database', 'read-room-active-members', error)
  }
}

export async function joinActiveRoomSession(roomId: string, nickname: string): Promise<string> {
  const database = requireFirebaseService(firebaseDatabase, 'realtime-database')
  const uid = firebaseAuth?.currentUser?.uid
  if (!uid) throw new Error('Firebase Authentication oturumu açık değil.')

  const presenceRef = ref(database, `roomSessions/${roomId}/presence/${uid}`)
  const connectionId = globalThis.crypto.randomUUID().replaceAll('-', '').toLowerCase()
  const presenceDisconnect = onDisconnect(presenceRef)
  let memberRef: ReturnType<typeof ref> | null = null
  let memberDisconnect: ReturnType<typeof onDisconnect> | null = null

  try {
    await presenceDisconnect.remove()
    for (const slot of ['0', '1', '2', '3']) {
      const candidateRef = ref(database, `roomSessions/${roomId}/activeMembers/${slot}`)
      const result = await runTransaction(candidateRef, (current) => {
        if (current && (current as RoomActiveMember).uid !== uid) return
        const previous = current as RoomActiveMember | null
        return { uid, connectionId, nickname, joinedAt: previous?.joinedAt ?? Date.now(), microphoneEnabled: false, cameraEnabled: false }
      }, { applyLocally: false })
      if (result.committed) {
        memberRef = candidateRef
        memberDisconnect = onDisconnect(candidateRef)
        await memberDisconnect.remove()
        break
      }
    }
    if (!memberRef) throw new Error('Oda kapasitesine ulaşıldı. En fazla 4 kişi katılabilir.')
    await set(presenceRef, { uid, connected: true, lastSeenAt: Date.now() })
    return connectionId
  } catch (error) {
    await Promise.allSettled([
      memberDisconnect?.cancel() ?? Promise.resolve(),
      presenceDisconnect.cancel(),
      ...(memberRef ? [remove(memberRef)] : []),
      remove(presenceRef),
    ])
    throw wrapFirebaseError('realtime-database', 'join-room-session', error)
  }
}

export async function setActiveRoomMicrophone(
  roomId: string,
  connectionId: string,
  microphoneEnabled: boolean,
): Promise<void> {
  const uid = firebaseAuth?.currentUser?.uid
  if (!uid) throw new Error('Firebase Authentication oturumu açık değil.')
  const database = requireFirebaseService(firebaseDatabase, 'realtime-database')
  const snapshot = await get(ref(database, `roomSessions/${roomId}/activeMembers`))
  const members = snapshot.val() as Record<string, RoomActiveMember> | null
  const slot = Object.entries(members ?? {}).find(([, member]) => member.uid === uid && member.connectionId === connectionId)?.[0]
  if (slot === undefined) return

  const memberRef = ref(database, `roomSessions/${roomId}/activeMembers/${slot}`)
  const result = await runTransaction(memberRef, (current) => {
    const member = current as RoomActiveMember | null
    if (!member || member.uid !== uid || member.connectionId !== connectionId) return
    return { ...member, microphoneEnabled }
  }, { applyLocally: false })
  if (!result.committed) throw new Error('Mikrofon durumu oda katılımcılarına iletilemedi. Odayı yenileyip tekrar deneyin.')
}

export async function setActiveRoomCamera(
  roomId: string,
  connectionId: string,
  cameraEnabled: boolean,
): Promise<void> {
  const uid = firebaseAuth?.currentUser?.uid
  if (!uid) throw new Error('Firebase Authentication oturumu açık değil.')
  const database = requireFirebaseService(firebaseDatabase, 'realtime-database')
  const snapshot = await get(ref(database, `roomSessions/${roomId}/activeMembers`))
  const members = snapshot.val() as Record<string, RoomActiveMember> | null
  const slot = Object.entries(members ?? {}).find(([, member]) => member.uid === uid && member.connectionId === connectionId)?.[0]
  if (slot === undefined) return

  const memberRef = ref(database, `roomSessions/${roomId}/activeMembers/${slot}`)
  const result = await runTransaction(memberRef, (current) => {
    const member = current as RoomActiveMember | null
    if (!member || member.uid !== uid || member.connectionId !== connectionId) return
    return { ...member, cameraEnabled }
  }, { applyLocally: false })
  if (!result.committed) throw new Error('Kamera durumu oda katılımcılarına iletilemedi. Odayı yenileyip tekrar deneyin.')
}

export async function scheduleRoomHostDisconnect(roomId: string, type: RoomType): Promise<void> {
  try {
    const database = requireFirebaseService(firebaseDatabase, 'realtime-database')
    const operations = [onDisconnect(ref(database, `roomSessions/${roomId}`)).remove()]
    if (type === 'temporary') operations.push(onDisconnect(ref(database, `roomAccess/${roomId}`)).remove())
    await Promise.all(operations)
  } catch (error) {
    throw wrapFirebaseError('realtime-database', 'schedule-room-host-cleanup', error)
  }
}

export async function cancelRoomHostDisconnect(roomId: string, type: RoomType): Promise<void> {
  const database = requireFirebaseService(firebaseDatabase, 'realtime-database')
  const operations = [onDisconnect(ref(database, `roomSessions/${roomId}`)).cancel()]
  if (type === 'temporary') operations.push(onDisconnect(ref(database, `roomAccess/${roomId}`)).cancel())
  await Promise.all(operations)
}

export async function leaveActiveRoomSession(roomId: string, uid: string): Promise<void> {
  const database = requireFirebaseService(firebaseDatabase, 'realtime-database')
  try {
    await Promise.all([
      onDisconnect(ref(database, `roomSessions/${roomId}/presence/${uid}`)).cancel(),
      remove(ref(database, `roomSessions/${roomId}/presence/${uid}`)),
    ])
    await removeRoomMemberActivity(roomId, uid)
  } catch (error) {
    throw wrapFirebaseError('realtime-database', 'leave-room-session', error)
  }
}

export async function removeRoomMemberActivity(roomId: string, uid: string): Promise<void> {
  const database = requireFirebaseService(firebaseDatabase, 'realtime-database')
  try {
    await Promise.all([
      get(ref(database, `roomSessions/${roomId}/activeMembers`)).then(async (snapshot) => {
        const slots = snapshot.val() as Record<string, RoomActiveMember> | null
        await Promise.all(Object.entries(slots ?? {}).filter(([, member]) => member.uid === uid).map(([slot]) => Promise.all([
          onDisconnect(ref(database, `roomSessions/${roomId}/activeMembers/${slot}`)).cancel(),
          remove(ref(database, `roomSessions/${roomId}/activeMembers/${slot}`)),
        ])))
      }),
      remove(ref(database, `roomSessions/${roomId}/presence/${uid}`)),
    ])
  } catch (error) {
    throw wrapFirebaseError('realtime-database', 'remove-room-member-activity', error)
  }
}

export async function closeActiveRoomSession(roomId: string, type: RoomType): Promise<void> {
  const database = requireFirebaseService(firebaseDatabase, 'realtime-database')
  try {
    await cancelRoomHostDisconnect(roomId, type)
    await remove(ref(database, `roomSessions/${roomId}`))
    if (type === 'temporary') await deleteRoomAccessMirror(roomId)
  } catch (error) {
    throw wrapFirebaseError('realtime-database', 'close-room-session', error)
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
