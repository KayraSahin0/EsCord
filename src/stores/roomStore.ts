import { create } from 'zustand'
import type { Unsubscribe } from '@firebase/database'
import { useAudioStore } from './audioStore'
import { useVideoStore } from './videoStore'
import { useScreenShareStore } from './screenShareStore'
import { firebaseAuth } from '../services/firebase/app'
import { getFirebaseErrorMessage } from '../services/firebase/firebaseError'
import { createPeerConnectionManager, type PeerConnectionManager, type PeerConnectionStatus } from '../services/webrtc/peerConnectionManager'
import {
  joinRoom as joinRoomService,
  leaveRoom as leaveRoomService,
  deleteFixedRoom as deleteFixedRoomService,
  listMyFixedRooms,
  pinRoom as pinRoomService,
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
  peerConnections: PeerConnectionStatus[]
  remoteMediaStreams: Record<string, MediaStream>
  remoteScreenStreams: Record<string, MediaStream>
  activeRoomStatus: ActiveRoomStatus
  activeRoomError: string | null
  loadFixedRooms: (force?: boolean) => Promise<void>
  connectToRoom: (roomId: string) => Promise<void>
  disconnectFromRoom: (roomId: string) => Promise<void>
  leaveCurrentRoom: () => Promise<void>
  pinCurrentRoom: () => Promise<void>
  setLocalAudioStream: (stream: MediaStream | null) => Promise<void>
  setLocalVideoStream: (stream: MediaStream | null) => Promise<void>
  setLocalScreenStream: (stream: MediaStream | null) => Promise<void>
  deleteFixedRoom: (roomId: string) => Promise<void>
}

type RoomLease = {
  roomId: string
  references: number
  joined: boolean
  finalized: boolean
  finalizing: boolean
  ready: Promise<void>
  unsubscribers: Unsubscribe[]
  peerManager: PeerConnectionManager | null
}

let currentLease: RoomLease | null = null
let fixedRoomsRequest: Promise<void> | null = null

export const useRoomStore = create<RoomState>((set, get) => {
  async function finalizeLease(lease: RoomLease, terminalStatus: 'idle' | 'closed' = 'idle') {
    if (lease.finalizing || lease.finalized || lease.references > 0) return
    lease.finalizing = true
    await lease.ready

    if (lease.references > 0 || lease.finalized) {
      lease.finalizing = false
      return
    }

    lease.finalized = true
    await lease.peerManager?.close()
    useAudioStore.getState().stopMicrophone()
    useVideoStore.getState().stopCamera()
    useScreenShareStore.getState().stopScreenShare()
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
      set({
        activeRoom: null,
        activeMembers: [],
        peerConnections: [],
        remoteMediaStreams: {},
        remoteScreenStreams: {},
        activeRoomStatus: terminalStatus,
        activeRoomError: terminalStatus === 'closed' ? 'Oda sahibi oturumu kapattı.' : null,
      })
    }
  }

  async function startLease(lease: RoomLease) {
    try {
      const joined = await joinRoomService(lease.roomId)
      lease.joined = true
      if (lease.finalized || currentLease !== lease) return

      set({ activeRoom: joined, activeMembers: [], peerConnections: [], remoteMediaStreams: {}, activeRoomStatus: 'ready', activeRoomError: null })
      const localUid = firebaseAuth?.currentUser?.uid
      if (!localUid) throw new Error('WebRTC bağlantısı için Firebase oturumu bulunamadı.')
      lease.peerManager = createPeerConnectionManager({
        roomId: lease.roomId,
        sessionId: joined.metadata.sessionId,
        localUid,
        localConnectionId: joined.connectionId,
        onRemoteStream: (uid, stream) => set((state) => {
          const remoteMediaStreams = { ...state.remoteMediaStreams }
          if (stream) remoteMediaStreams[uid] = stream
          else delete remoteMediaStreams[uid]
          return { remoteMediaStreams }
        }),
        onRemoteScreenStream: (uid, stream) => set((state) => {
          const remoteScreenStreams = { ...state.remoteScreenStreams }
          if (stream) remoteScreenStreams[uid] = stream
          else delete remoteScreenStreams[uid]
          return { remoteScreenStreams }
        }),
        onLocalScreenError: (message) => useScreenShareStore.getState().setScreenShareError(message),
        onChange: (peerConnections) => {
          if (currentLease === lease && !lease.finalized) set({ peerConnections })
        },
      })
      const existingMicrophoneStream = useAudioStore.getState().microphoneStream
      if (existingMicrophoneStream) await lease.peerManager.updateLocalAudioStream(existingMicrophoneStream)
      const existingCameraStream = useVideoStore.getState().cameraStream
      if (existingCameraStream) await lease.peerManager.updateLocalVideoStream(existingCameraStream)
      const existingScreenStream = useScreenShareStore.getState().screenStream
      if (existingScreenStream) await lease.peerManager.updateLocalScreenStream(existingScreenStream)
      lease.unsubscribers.push(subscribeToRoomSessionMetadata(lease.roomId, (metadata) => {
        if (!metadata) {
          lease.references = 0
          void finalizeLease(lease, 'closed')
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
        void lease.peerManager?.updatePeers(members)
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
    peerConnections: [],
    remoteMediaStreams: {},
    remoteScreenStreams: {},
    activeRoomStatus: 'idle',
    activeRoomError: null,
    loadFixedRooms: async (force = false) => {
      if (fixedRoomsRequest) {
        if (!force) return fixedRoomsRequest
        await fixedRoomsRequest
        if (fixedRoomsRequest) return fixedRoomsRequest
      }
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

      set({ activeRoom: null, activeMembers: [], peerConnections: [], remoteMediaStreams: {}, remoteScreenStreams: {}, activeRoomStatus: 'joining', activeRoomError: null })
      const lease: RoomLease = {
        roomId,
        references: 1,
        joined: false,
        finalized: false,
        finalizing: false,
        ready: Promise.resolve(),
        unsubscribers: [],
        peerManager: null,
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
    setLocalAudioStream: async (stream) => {
      await currentLease?.peerManager?.updateLocalAudioStream(stream)
    },
    setLocalVideoStream: async (stream) => {
      await currentLease?.peerManager?.updateLocalVideoStream(stream)
    },
    setLocalScreenStream: async (stream) => {
      await currentLease?.peerManager?.updateLocalScreenStream(stream)
    },
    deleteFixedRoom: async (roomId) => {
      await deleteFixedRoomService(roomId)
      set((state) => ({ fixedRooms: state.fixedRooms.filter((room) => room.id !== roomId) }))
      if (get().activeRoom?.roomId === roomId) await get().leaveCurrentRoom()
    },
  }
})

useScreenShareStore.subscribe((state, previous) => {
  if (state.screenStream !== previous.screenStream) {
    void useRoomStore.getState().setLocalScreenStream(state.screenStream)
  }
})
