import {
  onChildAdded,
  orderByChild,
  push,
  query as databaseQuery,
  ref,
  serverTimestamp as databaseTimestamp,
  set as setDatabaseValue,
  type Unsubscribe,
} from '@firebase/database'
import {
  collection as firestoreCollection,
  doc as firestoreDoc,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type Timestamp,
  type Unsubscribe as FirestoreUnsubscribe,
} from '@firebase/firestore'
import { firebaseApp, firebaseAuth } from './app'
import { requireFirebaseService, wrapFirebaseError, type FirebaseServiceError } from './firebaseError'
import type { RoomType } from './models'
import { getDatabase } from '@firebase/database'
import { getFirestore } from '@firebase/firestore'

export type ChatMessage = {
  id: string
  senderUid: string
  senderNickname: string
  text: string
  createdAt: number
  sequence?: number
}

const database = firebaseApp ? getDatabase(firebaseApp) : null
const firestore = firebaseApp ? getFirestore(firebaseApp) : null

export function validateMessageText(text: string): string | null {
  const normalized = text.trim()
  if (!normalized) return 'Boş mesaj gönderilemez.'
  if (normalized.length > 1000) return 'Mesaj en fazla 1000 karakter olabilir.'
  return null
}

function currentSender() {
  const user = firebaseAuth?.currentUser
  if (!user) throw new Error('Mesaj göndermek için giriş yapın.')
  return { uid: user.uid, nickname: user.displayName?.trim() || 'Misafir' }
}

export async function sendRoomMessage(roomId: string, type: RoomType, text: string): Promise<void> {
  const normalized = text.trim()
  const validationError = validateMessageText(normalized)
  if (validationError) throw new Error(validationError)
  const sender = currentSender()

  if (type === 'temporary') {
    try {
      const messagesRef = ref(requireFirebaseService(database, 'realtime-database'), `roomSessions/${roomId}/messages`)
      const messageRef = push(messagesRef)
      if (!messageRef.key) throw new Error('Mesaj kimliği üretilemedi.')
      await setDatabaseValue(messageRef, {
        senderUid: sender.uid,
        senderNickname: sender.nickname,
        text: normalized,
        createdAt: databaseTimestamp(),
      })
    } catch (error) {
      throw wrapFirebaseError('realtime-database', 'send-temporary-message', error)
    }
    return
  }

  try {
    const db = requireFirebaseService(firestore, 'firestore')
    const roomPath = `fixedRooms/${roomId}`
    const stateRef = firestoreDoc(db, roomPath, 'chatMeta', 'state')
    const messages = firestoreCollection(db, roomPath, 'messages')
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        await runTransaction(db, async (transaction) => {
          const stateSnapshot = await transaction.get(stateRef)
          const state = stateSnapshot.exists() ? stateSnapshot.data() as { sequence: number; nextSlot: number } : { sequence: 0, nextSlot: 0 }
          const sequence = state.sequence + 1
          const slot = state.nextSlot
          const messageRef = firestoreDoc(messages, String(slot))
          transaction.set(stateRef, { sequence, nextSlot: (slot + 1) % 100 })
          transaction.set(messageRef, {
            senderUid: sender.uid,
            senderNickname: sender.nickname,
            text: normalized,
            sequence,
            slot,
            createdAt: serverTimestamp(),
          })
        })
        return
      } catch (error) {
        const code = typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : ''
        if (!code.includes('permission-denied') || attempt === 7) throw error
        await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)))
      }
    }
  } catch (error) {
    throw wrapFirebaseError('firestore', 'send-fixed-message', error)
  }
}

export function subscribeToRoomMessages(
  roomId: string,
  type: RoomType,
  onMessages: (messages: ChatMessage[]) => void,
  onMessage: (message: ChatMessage) => void,
  onError: (error: FirebaseServiceError) => void,
): Unsubscribe | FirestoreUnsubscribe {
  if (type === 'temporary') {
    try {
      const messagesQuery = databaseQuery(
        ref(requireFirebaseService(database, 'realtime-database'), `roomSessions/${roomId}/messages`),
        orderByChild('createdAt'),
      )
      return onChildAdded(messagesQuery, (snapshot) => {
        const value = snapshot.val() as Omit<ChatMessage, 'id' | 'createdAt'> & { createdAt: number }
        onMessage({ ...value, id: snapshot.key ?? '', createdAt: Number(value.createdAt) || 0 })
      }, (error) => onError(wrapFirebaseError('realtime-database', 'listen-temporary-messages', error)))
    } catch (error) {
      onError(wrapFirebaseError('realtime-database', 'listen-temporary-messages', error))
      return () => undefined
    }
  }

  try {
    const db = requireFirebaseService(firestore, 'firestore')
    const messagesQuery = query(
      firestoreCollection(db, `fixedRooms/${roomId}/messages`),
      orderBy('sequence', 'asc'),
      firestoreLimit(100),
    )
    return onSnapshot(messagesQuery, (snapshot) => {
      onMessages(snapshot.docs.map((message) => {
        const value = message.data() as Omit<ChatMessage, 'id' | 'createdAt'> & { createdAt: Timestamp }
        return { ...value, id: message.id, createdAt: value.createdAt?.toMillis?.() ?? 0 }
      }))
    }, (error) => onError(wrapFirebaseError('firestore', 'listen-fixed-messages', error)))
  } catch (error) {
    onError(wrapFirebaseError('firestore', 'listen-fixed-messages', error))
    return () => undefined
  }
}
