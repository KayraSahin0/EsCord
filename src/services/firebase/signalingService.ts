import {
  onChildAdded,
  onDisconnect,
  push,
  ref,
  remove,
  set,
  serverTimestamp,
  type Unsubscribe,
} from '@firebase/database'
import { firebaseAuth } from './app'
import { firebaseDatabase } from './realtimeDatabaseService'
import { requireFirebaseService, wrapFirebaseError } from './firebaseError'

export type PeerSignal = {
  id: string
  sessionId: string
  fromUid: string
  toUid: string
  fromConnectionId: string
  toConnectionId: string
  kind: 'description' | 'candidate'
  description?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
}

function signalPath(
  roomId: string,
  sessionId: string,
  pairId: string,
  senderUid: string,
  senderConnectionId: string,
): string {
  return `roomSessions/${roomId}/signaling/${sessionId}/${pairId}/${senderUid}/${senderConnectionId}`
}

export async function registerSignalDisconnect(
  roomId: string,
  sessionId: string,
  pairId: string,
  senderUid: string,
  senderConnectionId: string,
): Promise<() => Promise<void>> {
  const database = requireFirebaseService(firebaseDatabase, 'realtime-database')
  const signalRef = ref(database, signalPath(roomId, sessionId, pairId, senderUid, senderConnectionId))
  const disconnect = onDisconnect(signalRef)

  try {
    await disconnect.remove()
    return async () => {
      await Promise.all([disconnect.cancel(), remove(signalRef)])
    }
  } catch (error) {
    throw wrapFirebaseError('realtime-database', 'register-signaling-cleanup', error)
  }
}

export async function publishPeerSignal(
  roomId: string,
  pairId: string,
  signal: Omit<PeerSignal, 'id'>,
): Promise<void> {
  try {
    const senderUid = firebaseAuth?.currentUser?.uid
    if (!senderUid || senderUid !== signal.fromUid) throw new Error('Signaling göndereni oturum kullanıcısıyla eşleşmiyor.')
    const database = requireFirebaseService(firebaseDatabase, 'realtime-database')
    const path = signalPath(roomId, signal.sessionId, pairId, signal.fromUid, signal.fromConnectionId)
    const signalRef = push(ref(database, path))
    if (!signalRef.key) throw new Error('Signaling kimliği üretilemedi.')

    await set(signalRef, {
      sessionId: signal.sessionId,
      fromUid: signal.fromUid,
      toUid: signal.toUid,
      fromConnectionId: signal.fromConnectionId,
      toConnectionId: signal.toConnectionId,
      kind: signal.kind,
      ...(signal.description ? { description: signal.description } : {}),
      ...(signal.candidate ? { candidate: signal.candidate } : {}),
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    throw wrapFirebaseError('realtime-database', 'publish-peer-signal', error)
  }
}

export function subscribeToPeerSignals(
  roomId: string,
  sessionId: string,
  pairId: string,
  senderUid: string,
  senderConnectionId: string,
  onSignal: (signal: PeerSignal) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  try {
    const signalsRef = ref(requireFirebaseService(firebaseDatabase, 'realtime-database'), signalPath(
      roomId, sessionId, pairId, senderUid, senderConnectionId,
    ))
    return onChildAdded(signalsRef, (snapshot) => {
      if (!snapshot.key) return
      onSignal({ ...snapshot.val() as Omit<PeerSignal, 'id'>, id: snapshot.key })
    }, (error) => onError(wrapFirebaseError('realtime-database', 'listen-peer-signals', error)))
  } catch (error) {
    onError(wrapFirebaseError('realtime-database', 'listen-peer-signals', error))
    return () => undefined
  }
}
