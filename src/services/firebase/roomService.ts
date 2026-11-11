import { firebaseAuth } from './app'
import {
  authorizeFixedRoomMember,
  listFixedRoomsForCurrentUser,
  readFixedRoom,
  readFixedRoomMembership,
  readFixedRoomMembers,
  revokeFixedRoomMember,
  saveFixedRoom,
  setFixedRoomPinned,
} from './firestoreService'
import { FirebaseServiceError } from './firebaseError'
import {
  closeActiveRoomSession,
  createRoomSessionMetadata,
  joinActiveRoomSession,
  leaveActiveRoomSession,
  removeRoomMemberActivity,
  readRoomActiveMembers,
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

  try {
    if (input.type === 'fixed') {
      await saveFixedRoom(roomId, name, [hostUid], false)
    }
    await writeRoomAccessMirror(roomId, [hostUid])
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
  const members = await readFixedRoomMembers(roomId)
  const memberUids = [...new Set([hostUid, ...members.map((member) => member.uid)])]
  await writeRoomAccessMirror(roomId, memberUids)
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
        throw new Error('Bu sabit odaya daha önce yetkilendirilmemişsiniz.')
      }
      throw error
    }
    if (!fixedRoom) throw new Error('Sabit oda kaydı bulunamadı.')
    if (fixedRoom.hostUid !== metadata.hostUid) throw new Error('Sabit oda oturumunun sahibi eşleşmiyor.')
    if (!await readFixedRoomMembership(roomId, user.uid)) {
      throw new Error('Bu sabit odaya daha önce yetkilendirilmemişsiniz.')
    }
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
    if (!await readFixedRoomMembership(roomId, user.uid)) {
      throw new Error('Bu sabit odaya daha önce yetkilendirilmemişsiniz.')
    }
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
  await joinActiveRoomSession(roomId, nickname)

  if (metadata.type === 'fixed') {
    fixedRoom ??= await readFixedRoom(roomId)
  }

  return {
    roomId,
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
    if (!metadata.name) throw new Error('Geçici odanın adı bulunamadı.')
    const activeMembers = await readRoomActiveMembers(roomId)
    const memberUids = [...new Set([metadata.hostUid, ...activeMembers.map((member) => member.uid)])]
    await saveFixedRoom(roomId, metadata.name, memberUids, true)
    await writeRoomAccessMirror(roomId, memberUids)
    await setRoomSessionType(roomId, 'fixed')
    return true
  }

  await setFixedRoomPinned(roomId, true)
  return true
}

export async function unpinRoom(roomId: string): Promise<void> {
  const user = currentUser()
  const metadata = await readRoomSessionMetadata(roomId)
  if (!metadata || metadata.type !== 'fixed') throw new Error('Sabit oda kaydı bulunamadı.')
  if (metadata.hostUid !== user.uid) throw new Error('Yalnızca oda sahibi sabitlemeyi kaldırabilir.')
  await setFixedRoomPinned(roomId, false)
}

export async function authorizeRoomMember(roomId: string, memberUidInput: string): Promise<void> {
  const user = currentUser()
  const memberUid = memberUidInput.trim()
  if (!memberUid || ['.', '#', '$', '[', ']', '/'].some((character) => memberUid.includes(character))) {
    throw new Error('Geçerli bir Firebase UID girin.')
  }

  const metadata = await readRoomSessionMetadata(roomId)
  if (!metadata || metadata.type !== 'fixed') throw new Error('Bu işlem yalnızca sabit odalarda kullanılabilir.')
  if (metadata.hostUid !== user.uid) throw new Error('Yalnızca oda sahibi yeni üye yetkilendirebilir.')

  await authorizeFixedRoomMember(roomId, memberUid)
  const members = await readFixedRoomMembers(roomId)
  const memberUids = [...new Set([metadata.hostUid, ...members.map((member) => member.uid)])]
  await writeRoomAccessMirror(roomId, memberUids)
}

export async function revokeRoomMember(roomId: string, memberUid: string): Promise<void> {
  const user = currentUser()
  const metadata = await readRoomSessionMetadata(roomId)
  if (!metadata || metadata.type !== 'fixed') throw new Error('Bu işlem yalnızca sabit odalarda kullanılabilir.')
  if (metadata.hostUid !== user.uid) throw new Error('Yalnızca oda sahibi üye yetkisini kaldırabilir.')
  if (memberUid === metadata.hostUid) throw new Error('Oda sahibinin yetkisi kaldırılamaz.')

  const members = await readFixedRoomMembers(roomId)
  const remainingUids = [...new Set([metadata.hostUid, ...members
    .map((member) => member.uid)
    .filter((uid) => uid !== memberUid)])]
  await writeRoomAccessMirror(roomId, remainingUids)

  await removeRoomMemberActivity(roomId, memberUid)
  await revokeFixedRoomMember(roomId, memberUid)
}

export async function listMyFixedRooms(): Promise<FixedRoomSummary[]> {
  return listFixedRoomsForCurrentUser()
}
