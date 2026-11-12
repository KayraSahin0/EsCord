import type { Unsubscribe } from '@firebase/database'
import type { RoomActiveMember } from '../firebase/models'
import {
  publishPeerSignal,
  registerSignalDisconnect,
  subscribeToPeerSignals,
  type PeerSignal,
} from '../firebase/signalingService'

export type PeerConnectionState = 'waiting' | 'connecting' | 'connected' | 'disconnected' | 'failed'

export type PeerConnectionStatus = {
  uid: string
  state: PeerConnectionState
  roundTripMs?: number
}

type PeerLink = {
  uid: string
  connectionId: string
  pairId: string
  peerConnection: RTCPeerConnection
  dataChannel: RTCDataChannel | null
  unsubscribeSignals: Unsubscribe
  cleanupSignals: (() => Promise<void>) | null
  pendingCandidates: RTCIceCandidateInit[]
  seenSignals: Set<string>
  state: PeerConnectionState
  roundTripMs?: number
  pendingPingId: string | null
  pendingPingSentAt: number | null
  pongReceived: boolean
  restartAttempts: number
  restartTimer: ReturnType<typeof setTimeout> | null
  makingOffer: boolean
  remoteStream: MediaStream | null
  closed: boolean
}

type PeerConnectionManagerOptions = {
  roomId: string
  sessionId: string
  localUid: string
  localConnectionId: string
  onChange: (statuses: PeerConnectionStatus[]) => void
  onRemoteStream: (uid: string, stream: MediaStream | null) => void
}

export type PeerConnectionManager = {
  updatePeers: (members: readonly RoomActiveMember[]) => Promise<void>
  updateLocalAudioStream: (stream: MediaStream | null) => Promise<void>
  close: () => Promise<void>
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

function pairId(firstUid: string, secondUid: string): string {
  return [firstUid, secondUid].sort().join('~')
}

function makeId(): string {
  return globalThis.crypto.randomUUID().replaceAll('-', '').toLowerCase()
}

export function createPeerConnectionManager(options: PeerConnectionManagerOptions): PeerConnectionManager {
  const links = new Map<string, PeerLink>()
  let peers = new Map<string, RoomActiveMember>()
  let localAudioStream: MediaStream | null = null
  let closed = false

  function emit() {
    if (closed) return
    const statuses: PeerConnectionStatus[] = [...peers.values()]
      .filter((peer) => peer.uid !== options.localUid)
      .map((peer) => {
        const link = links.get(peer.uid)
        if (!peer.connectionId) return { uid: peer.uid, state: 'waiting' }
        if (!link || link.connectionId !== peer.connectionId) return { uid: peer.uid, state: 'connecting' }
        return {
          uid: peer.uid,
          state: link.state,
          ...(link.roundTripMs === undefined ? {} : { roundTripMs: link.roundTripMs }),
        }
      })
    options.onChange(statuses)
  }

  function setState(link: PeerLink, state: PeerConnectionState) {
    if (link.closed || links.get(link.uid) !== link) return
    link.state = state
    emit()
  }

  async function sendDescription(link: PeerLink, description: RTCSessionDescriptionInit) {
    if (link.closed || links.get(link.uid) !== link) return
    await publishPeerSignal(options.roomId, link.pairId, {
      sessionId: options.sessionId,
      fromUid: options.localUid,
      toUid: link.uid,
      fromConnectionId: options.localConnectionId,
      toConnectionId: link.connectionId,
      kind: 'description',
      description,
    })
  }

  async function negotiate(link: PeerLink) {
    if (link.closed || links.get(link.uid) !== link || options.localUid.localeCompare(link.uid) > 0) return
    if (link.makingOffer) return
    if (link.peerConnection.signalingState !== 'stable') return
    link.makingOffer = true
    try {
      const offer = await link.peerConnection.createOffer()
      await link.peerConnection.setLocalDescription(offer)
      if (link.peerConnection.localDescription) await sendDescription(link, link.peerConnection.localDescription.toJSON())
    } catch {
      setState(link, 'failed')
    } finally {
      link.makingOffer = false
    }
  }

  async function applyLocalAudioTrack(link: PeerLink) {
    const track = localAudioStream?.getAudioTracks()[0] ?? null
    const transceiver = link.peerConnection.getTransceivers().find((item) => item.receiver.track.kind === 'audio')
    if (transceiver) await transceiver.sender.replaceTrack(track)
  }

  async function flushCandidates(link: PeerLink) {
    const candidates = link.pendingCandidates.splice(0)
    for (const candidate of candidates) {
      try {
        await link.peerConnection.addIceCandidate(candidate)
      } catch {
        // A queued candidate can belong to an ICE generation that has already been replaced.
      }
    }
  }

  async function handleSignal(link: PeerLink, signal: PeerSignal) {
    if (link.closed || links.get(link.uid) !== link || link.seenSignals.has(signal.id)) return
    if (signal.sessionId !== options.sessionId
      || signal.fromUid !== link.uid
      || signal.toUid !== options.localUid
      || signal.fromConnectionId !== link.connectionId
      || signal.toConnectionId !== options.localConnectionId) return

    link.seenSignals.add(signal.id)
    const isOfferer = options.localUid.localeCompare(link.uid) < 0

    try {
      if (signal.kind === 'description' && signal.description) {
        if (signal.description.type === 'offer') {
          if (isOfferer || link.peerConnection.signalingState !== 'stable') return
          await link.peerConnection.setRemoteDescription(signal.description)
          await flushCandidates(link)
          const answer = await link.peerConnection.createAnswer()
          await link.peerConnection.setLocalDescription(answer)
          if (link.peerConnection.localDescription) await sendDescription(link, link.peerConnection.localDescription.toJSON())
        } else if (signal.description.type === 'answer') {
          if (!isOfferer || link.peerConnection.signalingState !== 'have-local-offer') return
          await link.peerConnection.setRemoteDescription(signal.description)
          await flushCandidates(link)
        }
      } else if (signal.kind === 'candidate' && signal.candidate) {
        if (link.peerConnection.remoteDescription) {
          try {
            await link.peerConnection.addIceCandidate(signal.candidate)
          } catch {
            // A late candidate from an earlier ICE generation can be discarded safely.
          }
        } else {
          link.pendingCandidates.push(signal.candidate)
        }
      }
    } catch {
      setState(link, 'failed')
    }
  }

  async function sendCandidate(link: PeerLink, candidate: RTCIceCandidate) {
    if (link.closed || links.get(link.uid) !== link) return
    try {
      await publishPeerSignal(options.roomId, link.pairId, {
        sessionId: options.sessionId,
        fromUid: options.localUid,
        toUid: link.uid,
        fromConnectionId: options.localConnectionId,
        toConnectionId: link.connectionId,
        kind: 'candidate',
        candidate: candidate.toJSON(),
      })
    } catch {
      setState(link, 'failed')
    }
  }

  function bindDataChannel(link: PeerLink, channel: RTCDataChannel) {
    link.dataChannel = channel
    channel.onopen = () => {
      setState(link, 'connecting')
      sendPing(link, channel)
    }
    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as { type?: string; id?: string; sentAt?: number }
        if (message.type === 'ping' && message.id && channel.readyState === 'open') {
          channel.send(JSON.stringify({ type: 'pong', id: message.id, sentAt: message.sentAt }))
        } else if (message.type === 'pong' && message.id === link.pendingPingId && link.pendingPingSentAt !== null) {
          link.roundTripMs = Math.max(0, Date.now() - link.pendingPingSentAt)
          link.pendingPingId = null
          link.pendingPingSentAt = null
          link.pongReceived = true
          if (link.peerConnection.connectionState === 'connected') setState(link, 'connected')
        }
      } catch {
        setState(link, 'failed')
      }
    }
    channel.onclose = () => {
      if (link.peerConnection.connectionState !== 'closed') setState(link, 'disconnected')
    }
    channel.onerror = () => setState(link, 'failed')
  }

  function sendPing(link: PeerLink, channel: RTCDataChannel) {
    if (channel.readyState !== 'open') return
    const id = makeId()
    const sentAt = Date.now()
    link.pendingPingId = id
    link.pendingPingSentAt = sentAt
    channel.send(JSON.stringify({ type: 'ping', id, sentAt }))
  }

  async function restartIce(link: PeerLink) {
    if (link.closed || links.get(link.uid) !== link || link.restartAttempts >= 1) return
    if (options.localUid.localeCompare(link.uid) > 0) return
    if (link.peerConnection.signalingState !== 'stable') return

    link.restartAttempts += 1
    try {
      const offer = await link.peerConnection.createOffer({ iceRestart: true })
      await link.peerConnection.setLocalDescription(offer)
      if (link.peerConnection.localDescription) await sendDescription(link, link.peerConnection.localDescription.toJSON())
      setState(link, 'connecting')
    } catch {
      setState(link, 'failed')
    }
  }

  async function startLink(peer: RoomActiveMember) {
    if (!peer.connectionId || closed || links.has(peer.uid)) return

    let peerConnection: RTCPeerConnection
    try {
      peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      peerConnection.addTransceiver('audio', { direction: 'sendrecv' })
    } catch {
      options.onChange([
        ...[...peers.values()].filter((member) => member.uid !== options.localUid && !links.has(member.uid))
          .map((member) => ({ uid: member.uid, state: member.connectionId ? 'failed' as const : 'waiting' as const })),
        ...[...links.values()].map((link) => ({ uid: link.uid, state: link.state })),
      ])
      return
    }

    const link: PeerLink = {
      uid: peer.uid,
      connectionId: peer.connectionId,
      pairId: pairId(options.localUid, peer.uid),
      peerConnection,
      dataChannel: null,
      unsubscribeSignals: () => undefined,
      cleanupSignals: null,
      pendingCandidates: [],
      seenSignals: new Set(),
      state: 'connecting',
      pendingPingId: null,
      pendingPingSentAt: null,
      pongReceived: false,
      restartAttempts: 0,
      restartTimer: null,
      makingOffer: false,
      remoteStream: null,
      closed: false,
    }
    links.set(peer.uid, link)

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) void sendCandidate(link, event.candidate)
    }
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState
      if (state === 'connected') {
        if (link.dataChannel?.readyState === 'open') sendPing(link, link.dataChannel)
        setState(link, link.dataChannel?.readyState === 'open' && link.pongReceived ? 'connected' : 'connecting')
      }
      else if (state === 'failed') {
        setState(link, 'failed')
        void restartIce(link)
      } else if (state === 'disconnected') {
        setState(link, 'disconnected')
        if (link.restartTimer) clearTimeout(link.restartTimer)
        link.restartTimer = setTimeout(() => {
          if (peerConnection.connectionState === 'disconnected') void restartIce(link)
        }, 5000)
      } else if (state === 'connecting' || state === 'new') setState(link, 'connecting')
    }
    peerConnection.oniceconnectionstatechange = () => {
      if (peerConnection.iceConnectionState === 'failed') {
        setState(link, 'failed')
        void restartIce(link)
      }
    }
    peerConnection.onnegotiationneeded = () => { void negotiate(link) }
    peerConnection.ontrack = (event) => {
      if (link.closed || links.get(link.uid) !== link) return
      const stream = event.streams[0] ?? new MediaStream([event.track])
      link.remoteStream = stream
      options.onRemoteStream(link.uid, stream)
      event.track.onended = () => {
        if (!link.remoteStream?.getAudioTracks().some((track) => track.readyState === 'live')) {
          link.remoteStream = null
          options.onRemoteStream(link.uid, null)
        }
      }
    }

    const isOfferer = options.localUid.localeCompare(peer.uid) < 0
    if (isOfferer) bindDataChannel(link, peerConnection.createDataChannel('escord-connectivity-test'))
    else peerConnection.ondatachannel = (event) => bindDataChannel(link, event.channel)

    try {
      await applyLocalAudioTrack(link)
    } catch {
      setState(link, 'failed')
    }

    link.unsubscribeSignals = subscribeToPeerSignals(
      options.roomId,
      options.sessionId,
      link.pairId,
      peer.uid,
      peer.connectionId,
      (signal) => { void handleSignal(link, signal) },
      () => setState(link, 'failed'),
    )

    try {
      link.cleanupSignals = await registerSignalDisconnect(
        options.roomId, options.sessionId, link.pairId, options.localUid, options.localConnectionId,
      )
      if (closed || link.closed || links.get(peer.uid) !== link) {
        await link.cleanupSignals()
        return
      }
    } catch {
      setState(link, 'failed')
    }
    emit()
  }

  async function closeLink(link: PeerLink) {
    if (link.closed) return
    link.closed = true
    if (link.restartTimer) clearTimeout(link.restartTimer)
    link.unsubscribeSignals()
    options.onRemoteStream(link.uid, null)
    link.dataChannel?.close()
    link.peerConnection.close()
    try {
      await link.cleanupSignals?.()
    } catch {
      // onDisconnect removes the branch if the client cannot clean up while connected.
    }
  }

  return {
    updatePeers: async (members) => {
      if (closed) return
      peers = new Map(members.map((member) => [member.uid, member]))
      const removed = [...links.values()].filter((link) => peers.get(link.uid)?.connectionId !== link.connectionId)
      for (const link of removed) {
        links.delete(link.uid)
        await closeLink(link)
      }
      emit()
      for (const peer of peers.values()) {
        if (peer.uid !== options.localUid && peer.connectionId && !links.has(peer.uid)) void startLink(peer)
      }
    },
    updateLocalAudioStream: async (stream) => {
      localAudioStream = stream
      await Promise.all([...links.values()].map(async (link) => {
        try {
          await applyLocalAudioTrack(link)
        } catch {
          setState(link, 'failed')
        }
      }))
    },
    close: async () => {
      if (closed) return
      closed = true
      const existingLinks = [...links.values()]
      links.clear()
      for (const link of existingLinks) await closeLink(link)
      options.onChange([])
    },
  }
}
