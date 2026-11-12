import { firebaseAuth } from './app'
import {
  listFixedRoomsForCurrentUser,
  deleteFixedRoomWithHistory,
  readFixedRoom,
  saveFixedRoom,
} from './firestoreService'
import { FirebaseServiceError } from './firebaseError'
import {
  closeActiveRoomSession,
  createRoomSessionMetadata,
  deleteRoomAccessMirror,
  joinActiveRoomSession,
  leaveActiveRoomSession,
  readRoomSessionMetadata,
  scheduleRoomHostDisconnect,
  setRoomSessionType,
  writeRoomAccessMirror,
} from './realtimeDatabaseService'
import type { FixedRoomDocument, FixedRoomSummary, RoomSessionMetadata, RoomType } from './models'

export type CreateRoomInput = {
  name: string
  type: RoomType
}

export type JoinedRoom = {
  roomId: string
  connectionId: string
  metadata: RoomSessionMetadata
  name: string
  isPinned: boolean
}

function currentUser() {
  const user = firebaseAuth?.currentUser
  if (!user) throw new Error('Oturum açmanız gerekiyor.')
  return user
}

export function normalizeRoomName(name: string): string {
  return name.trim()
}

export function validateRoomName(name: string): string | null {
  const normalized = normalizeRoomName(name)
  if (normalized.length === 0) return 'Oda adı gerekli.'
  if (normalized.length > 80) return 'Oda adı en fazla 80 karakter olabilir.'
  return null
}

export function normalizeRoomId(roomId: string): string {
  return roomId.trim().toLowerCase()
}

export function validateRoomId(roomId: string): string | null {
  if (!/^[a-f\d]{32}$/i.test(roomId.trim())) return 'Oda kodu 32 karakterli geçerli bir oda kimliği olmalı.'
  return null
}

function newRoomId(): string {
  return globalThis.crypto.randomUUID().replaceAll('-', '').toLowerCase()
}

function newSessionId(): string {
  return globalThis.crypto.randomUUID().replaceAll('-', '').toLowerCase()
}

export async function createRoom(input: CreateRoomInput): Promise<string> {
  const name = normalizeRoomName(input.name)
  const validationError = validateRoomName(name)
  if (validationError) throw new Error(validationError)

  const user = currentUser()
  const roomId = newRoomId()
  const hostUid = user.uid
  if (input.type === 'fixed' && user.isAnonymous) {
    throw new Error('Sabit oda oluşturmak için e-posta ve şifreyle giriş yapın.')
  }

  try {
    if (input.type === 'fixed') {
      await saveFixedRoom(roomId, name, false)
    }
    await writeRoomAccessMirror(roomId, [hostUid], input.type)
    await scheduleRoomHostDisconnect(roomId, input.type)
    await createRoomSessionMetadata(roomId, {
      type: input.type,
      hostUid,
      sessionId: newSessionId(),
      ...(input.type === 'temporary' ? { name } : {}),
    })
    return roomId
  } catch (error) {
    if (input.type === 'temporary') {
      try {
        await closeActiveRoomSession(roomId, 'temporary')
      } catch {
        // Keep the original creation failure; the room can be retried or removed by host cleanup.
      }
    }
    throw error
  }
}

async function openFixedRoomForHost(roomId: string, hostUid: string): Promise<RoomSessionMetadata> {
  await writeRoomAccessMirror(roomId, [hostUid], 'fixed')
  await scheduleRoomHostDisconnect(roomId, 'fixed')
  await createRoomSessionMetadata(roomId, {
    type: 'fixed',
    hostUid,
    sessionId: newSessionId(),
  })
  const metadata = await readRoomSessionMetadata(roomId)
  if (!metadata) throw new Error('Sabit oda oturumu oluşturulamadı.')
  return metadata
}

export async function joinRoom(roomIdInput: string): Promise<JoinedRoom> {
  const validationError = validateRoomId(roomIdInput)
  if (validationError) throw new Error(validationError)

  const user = currentUser()
  const roomId = normalizeRoomId(roomIdInput)
  let metadata = await readRoomSessionMetadata(roomId)
  let fixedRoom: FixedRoomDocument | null = null

  if (metadata?.type === 'fixed') {
    try {
      fixedRoom = await readFixedRoom(roomId)
    } catch (error) {
      if (error instanceof FirebaseServiceError && error.code?.includes('permission-denied')) {
        throw new Error('Sabit odaya erişim reddedildi. Güncel Firestore ve Realtime Database kurallarını yayımlayıp tekrar deneyin.')
      }
      throw error
    }
    if (!fixedRoom) throw new Error('Sabit oda kaydı bulunamadı.')
    if (fixedRoom.hostUid !== metadata.hostUid) throw new Error('Sabit oda oturumunun sahibi eşleşmiyor.')
  } else if (!metadata) {
    try {
      fixedRoom = await readFixedRoom(roomId)
    } catch (error) {
      if (error instanceof FirebaseServiceError && error.code?.includes('permission-denied')) {
        throw new Error('Oda bulunamadı veya bu odaya erişim yetkiniz yok.')
      }
      throw error
    }

    if (!fixedRoom) throw new Error('Oda bulunamadı veya oturum kapatılmış.')
    if (fixedRoom.hostUid !== user.uid) {
      throw new Error('Sabit oda şu anda kapalı. Oda sahibi yeniden açtığında katılabilirsiniz.')
    }
    metadata = await openFixedRoomForHost(roomId, user.uid)
  }

  if (!metadata) throw new Error('Oda bulunamadı veya oturum kapatılmış.')
  if (metadata.status !== 'active') {
    if (metadata.type !== 'fixed' || metadata.hostUid !== user.uid) {
      throw new Error('Oda oturumu kapalı. Katılmak için oda sahibinin yeniden açması gerekiyor.')
    }
    await closeActiveRoomSession(roomId, 'fixed')
    fixedRoom ??= await readFixedRoom(roomId)
    if (!fixedRoom) throw new Error('Sabit oda kaydı bulunamadı.')
    metadata = await openFixedRoomForHost(roomId, user.uid)
  }

  if (metadata.hostUid === user.uid) {
    await scheduleRoomHostDisconnect(roomId, metadata.type)
  }
  const nickname = user.displayName?.trim() || 'Misafir'
  const connectionId = await joinActiveRoomSession(roomId, nickname)

  if (metadata.type === 'fixed') {
    fixedRoom ??= await readFixedRoom(roomId)
  }

  return {
    roomId,
    connectionId,
    metadata,
    name: fixedRoom?.name ?? metadata.name ?? 'Oda',
    isPinned: fixedRoom?.isPinned ?? false,
  }
}

export async function leaveRoom(roomId: string): Promise<void> {
  const user = currentUser()
  const metadata = await readRoomSessionMetadata(roomId)
  if (!metadata) return

  if (metadata.hostUid === user.uid) {
    await closeActiveRoomSession(roomId, metadata.type)
    return
  }

  await leaveActiveRoomSession(roomId, user.uid)
}

export async function pinRoom(roomId: string): Promise<boolean> {
  const user = currentUser()
  const metadata = await readRoomSessionMetadata(roomId)
  if (!metadata) throw new Error('Oda oturumu açık değil.')
  if (metadata.hostUid !== user.uid) throw new Error('Yalnızca oda sahibi odayı sabitleyebilir.')

  if (metadata.type === 'temporary') {
    if (user.isAnonymous) throw new Error('Sabit odaya dönüştürmek için e-posta ve şifreyle giriş yapın.')
    if (!metadata.name) throw new Error('Geçici odanın adı bulunamadı.')
    await saveFixedRoom(roomId, metadata.name, true)
    await writeRoomAccessMirror(roomId, [metadata.hostUid], 'fixed')
    await setRoomSessionType(roomId, 'fixed')
    return true
  }

  throw new Error('Sabit oda zaten kalıcıdır; sabitleme yalnızca geçici odalarda kullanılabilir.')
}

export async function listMyFixedRooms(): Promise<FixedRoomSummary[]> {
  return listFixedRoomsForCurrentUser()
}

export async function deleteFixedRoom(roomId: string): Promise<void> {
  const user = currentUser()
  if (user.isAnonymous) throw new Error('Sabit oda silmek için e-posta ve şifreyle giriş yapın.')
  await closeActiveRoomSession(roomId, 'fixed')
  await deleteRoomAccessMirror(roomId)
  await deleteFixedRoomWithHistory(roomId)
}
