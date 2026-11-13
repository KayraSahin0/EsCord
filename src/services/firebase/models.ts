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
  isDeleting?: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type RoomType = 'temporary' | 'fixed'

/** RTDB room metadata mirror; the legacy host member key is retained for schema validation only. */
export type RoomAccessMirror = {
  hostUid: string
  type: RoomType
  members: Record<string, true>
}

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
  connectionId: string
  nickname: string
  joinedAt: number
  microphoneEnabled?: boolean
  cameraEnabled?: boolean
}

export type RoomYoutubeState = {
  videoId: string
  playbackState: 'playing' | 'paused'
  currentTime: number
  playbackRate: number
  updatedAt: number
  controllerUid: string
  queue?: string[]
}

export type FixedRoomSummary = FixedRoomDocument & { id: string }

export type RealtimePresenceRecord = {
  uid: string
  nickname: string
  connected: boolean
  lastSeenAt: number
}
