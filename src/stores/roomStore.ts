import { create } from 'zustand'
import type { Unsubscribe } from '@firebase/database'
import { getFirebaseErrorMessage } from '../services/firebase/firebaseError'
import {
  authorizeRoomMember as authorizeRoomMemberService,
  joinRoom as joinRoomService,
  leaveRoom as leaveRoomService,
  listMyFixedRooms,
  pinRoom as pinRoomService,
  unpinRoom as unpinRoomService,
  type JoinedRoom,
} from '../services/firebase/roomService'
import {
  subscribeToRoomActiveMembers,
  subscribeToRoomSessionMetadata,
} from '../services/firebase/realtimeDatabaseService'
import type { FixedRoomSummary, RoomActiveMember } from '../services/firebase/models'

type RoomLoadStatus = 'idle' | 'loading' | 'ready' | 'error'
type ActiveRoomStatus = 'idle' | 'joining' | 'ready' | 'closed' | 'error'

type RoomState = {
  fixedRooms: FixedRoomSummary[]
  fixedRoomsStatus: RoomLoadStatus
  fixedRoomsError: string | null
  activeRoom: JoinedRoom | null
  activeMembers: RoomActiveMember[]
  activeRoomStatus: ActiveRoomStatus
  activeRoomError: string | null
  loadFixedRooms: (force?: boolean) => Promise<void>
  connectToRoom: (roomId: string) => Promise<void>
  disconnectFromRoom: (roomId: string) => Promise<void>
  leaveCurrentRoom: () => Promise<void>
  pinCurrentRoom: () => Promise<void>
  unpinCurrentRoom: () => Promise<void>
  authorizeCurrentRoomMember: (uid: string) => Promise<void>
}

type RoomLease = {
  roomId: string
  references: number
  joined: boolean
  finalized: boolean
  finalizing: boolean
  ready: Promise<void>
  unsubscribers: Unsubscribe[]
}

let currentLease: RoomLease | null = null
let fixedRoomsRequest: Promise<void> | null = null

export const useRoomStore = create<RoomState>((set, get) => {
  async function finalizeLease(lease: RoomLease) {
    if (lease.finalizing || lease.finalized || lease.references > 0) return
    lease.finalizing = true
    await lease.ready

    if (lease.references > 0 || lease.finalized) {
      lease.finalizing = false
      return
    }

    lease.finalized = true
    for (const unsubscribe of lease.unsubscribers) unsubscribe()
    if (lease.joined) {
      try {
        await leaveRoomService(lease.roomId)
      } catch {
        // onDisconnect remains registered as the fallback if an explicit leave cannot reach RTDB.
      }
    }
    if (currentLease === lease) {
      currentLease = null
      set({ activeRoom: null, activeMembers: [], activeRoomStatus: 'idle', activeRoomError: null })
    }
  }

  async function startLease(lease: RoomLease) {
    try {
      const joined = await joinRoomService(lease.roomId)
      lease.joined = true
      if (lease.finalized || currentLease !== lease) return

      set({ activeRoom: joined, activeRoomStatus: 'ready', activeRoomError: null })
      lease.unsubscribers.push(subscribeToRoomSessionMetadata(lease.roomId, (metadata) => {
        if (!metadata) {
          set({ activeRoomStatus: 'closed', activeRoomError: 'Oda sahibi oturumu kapattı.' })
          return
        }
        set((state) => state.activeRoom?.roomId === lease.roomId
          ? { activeRoom: { ...state.activeRoom, metadata }, activeRoomStatus: 'ready', activeRoomError: null }
          : {})
      }, (error) => {
        set({ activeRoomStatus: 'error', activeRoomError: getFirebaseErrorMessage(error, 'realtime-database') })
      }))

      lease.unsubscribers.push(subscribeToRoomActiveMembers(lease.roomId, (members) => {
        set({ activeMembers: members.sort((a, b) => a.joinedAt - b.joinedAt) })
      }, (error) => {
        set({ activeRoomStatus: 'error', activeRoomError: getFirebaseErrorMessage(error, 'realtime-database') })
      }))
    } catch (error) {
      set({ activeRoomStatus: 'error', activeRoomError: getFirebaseErrorMessage(error, 'realtime-database') })
    }
  }

  return {
    fixedRooms: [],
    fixedRoomsStatus: 'idle',
    fixedRoomsError: null,
    activeRoom: null,
    activeMembers: [],
    activeRoomStatus: 'idle',
    activeRoomError: null,
    loadFixedRooms: async (force = false) => {
      if (fixedRoomsRequest) return fixedRoomsRequest
      if (!force && get().fixedRoomsStatus === 'ready') return

      set({ fixedRoomsStatus: 'loading', fixedRoomsError: null })
      fixedRoomsRequest = listMyFixedRooms()
        .then((rooms) => {
          const sorted = rooms.sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || a.name.localeCompare(b.name))
          set({ fixedRooms: sorted, fixedRoomsStatus: 'ready', fixedRoomsError: null })
        })
        .catch((error: unknown) => {
          set({ fixedRoomsStatus: 'error', fixedRoomsError: getFirebaseErrorMessage(error, 'firestore') })
        })
        .finally(() => { fixedRoomsRequest = null })
      return fixedRoomsRequest
    },
    connectToRoom: async (roomId) => {
      if (currentLease?.roomId === roomId && !currentLease.finalized) {
        currentLease.references += 1
        await currentLease.ready
        return
      }

      if (currentLease && !currentLease.finalized) {
        currentLease.references = 0
        await finalizeLease(currentLease)
      }

      set({ activeRoom: null, activeMembers: [], activeRoomStatus: 'joining', activeRoomError: null })
      const lease: RoomLease = {
        roomId,
        references: 1,
        joined: false,
        finalized: false,
        finalizing: false,
        ready: Promise.resolve(),
        unsubscribers: [],
      }
      currentLease = lease
      lease.ready = startLease(lease)
      await lease.ready
    },
    disconnectFromRoom: async (roomId) => {
      const lease = currentLease
      if (!lease || lease.roomId !== roomId || lease.finalized) return
      lease.references = Math.max(0, lease.references - 1)
      if (lease.references === 0) {
        queueMicrotask(() => { void finalizeLease(lease) })
      }
    },
    leaveCurrentRoom: async () => {
      const lease = currentLease
      if (!lease) return
      lease.references = 0
      await finalizeLease(lease)
    },
    pinCurrentRoom: async () => {
      const room = get().activeRoom
      if (!room) return
      try {
        const isPinned = await pinRoomService(room.roomId)
        const updated = { ...room, isPinned }
        set({ activeRoom: updated, activeRoomError: null })
        await get().loadFixedRooms(true)
      } catch (error) {
        set({ activeRoomError: getFirebaseErrorMessage(error, 'firestore') })
        throw error
      }
    },
    unpinCurrentRoom: async () => {
      const room = get().activeRoom
      if (!room) return
      try {
        await unpinRoomService(room.roomId)
        set({ activeRoom: { ...room, isPinned: false }, activeRoomError: null })
        await get().loadFixedRooms(true)
      } catch (error) {
        set({ activeRoomError: getFirebaseErrorMessage(error, 'firestore') })
        throw error
      }
    },
    authorizeCurrentRoomMember: async (uid) => {
      const room = get().activeRoom
      if (!room) return
      try {
        await authorizeRoomMemberService(room.roomId, uid)
        set({ activeRoomError: null })
        await get().loadFixedRooms(true)
      } catch (error) {
        set({ activeRoomError: getFirebaseErrorMessage(error, 'firestore') })
        throw error
      }
    },
  }
})
