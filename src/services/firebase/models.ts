import type { Timestamp } from '@firebase/firestore'

export type UserProfileDocument = {
  uid: string
  nickname: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type FixedRoomDocument = {
  name: string
  hostUid: string
  isPinned: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type FixedRoomMemberDocument = {
  uid: string
  authorizedBy: string
  authorizedAt: Timestamp
}

/** RTDB mirror of Firestore fixed-room membership; it is not atomic with Firestore. */
export type RoomAccessMirror = {
  hostUid: string
  members: Record<string, true>
}

export type RoomType = 'temporary' | 'fixed'

export type RoomSessionMetadata = {
  type: RoomType
  hostUid: string
  status: 'active' | 'closed'
  sessionId: string
  createdAt: number
  name?: string
}

export type RoomActiveMember = {
  uid: string
  nickname: string
  joinedAt: number
}

export type FixedRoomSummary = FixedRoomDocument & { id: string }

export type RealtimePresenceRecord = {
  uid: string
  nickname: string
  connected: boolean
  lastSeenAt: number
}
