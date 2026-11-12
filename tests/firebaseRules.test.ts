import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, query, runTransaction as runFirestoreTransaction, serverTimestamp, setDoc, updateDoc, where, writeBatch, type Firestore } from 'firebase/firestore'
import { get, ref, runTransaction, set } from 'firebase/database'

const projectId = 'demo-escord'
const roomId = 'room-test'
let testEnvironment: RulesTestEnvironment

function passwordContext(uid: string) {
  const email = `${uid}@example.com`
  return testEnvironment.authenticatedContext(uid, {
    email,
    firebase: { sign_in_provider: 'password', identities: { email: [email] } },
  })
}

function readRuleFile(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

async function seedRoomData() {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore()
    await setDoc(doc(database, 'profiles', 'member'), {
      uid: 'member', nickname: 'Member', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    await setDoc(doc(database, 'fixedRooms', roomId), {
      name: 'Test Room', hostUid: 'host', isPinned: false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    await setDoc(doc(database, 'fixedRooms', roomId, 'members', 'host'), {
      uid: 'host', authorizedBy: 'host', authorizedAt: serverTimestamp(),
    })
    await setDoc(doc(database, 'fixedRooms', roomId, 'members', 'member'), {
      uid: 'member', authorizedBy: 'host', authorizedAt: serverTimestamp(),
    })
    await set(ref(context.database(), `roomAccess/${roomId}`), {
      hostUid: 'host', type: 'fixed', members: { host: true, member: true },
    })
    await set(ref(context.database(), `roomSessions/${roomId}/metadata`), {
      type: 'fixed', hostUid: 'host', status: 'active', sessionId: 'seed', createdAt: Date.now(), name: 'Test Room',
    })
    await set(ref(context.database(), `roomSessions/${roomId}/activeMembers/0`), {
      uid: 'host', connectionId: 'host-connection-0001', nickname: 'Host', joinedAt: Date.now(),
    })
    await set(ref(context.database(), `roomSessions/${roomId}/activeMembers/1`), {
      uid: 'member', connectionId: 'member-connection-0001', nickname: 'Member', joinedAt: Date.now(),
    })
  })
}

describe('Firebase Security Rules emülatör testleri', () => {
  beforeAll(async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId,
      firestore: { rules: readRuleFile('../firestore.rules') },
      database: {
        host: '127.0.0.1',
        port: 9000,
        rules: readRuleFile('../database.rules.json'),
      },
    })
  })

  afterEach(async () => {
    await testEnvironment.clearFirestore()
    await testEnvironment.clearDatabase()
  })

  afterAll(async () => {
    await testEnvironment.cleanup()
  })

  it('profil belgelerini yalnızca sahibi okuyup değiştirebilir', async () => {
    await seedRoomData()
    const owner = testEnvironment.authenticatedContext('member').firestore()
    const stranger = testEnvironment.authenticatedContext('stranger').firestore()
    const unauthenticated = testEnvironment.unauthenticatedContext().firestore()

    await assertSucceeds(getDoc(doc(owner, 'profiles', 'member')))
    await assertFails(getDoc(doc(stranger, 'profiles', 'member')))
    await assertFails(getDoc(doc(unauthenticated, 'profiles', 'member')))
    await assertFails(updateDoc(doc(stranger, 'profiles', 'member'), { nickname: 'Other' }))
  })

  it('sabit oda kodu oturum açmış kullanıcılara erişim verir, yönetimi host ile sınırlar', async () => {
    await seedRoomData()
    const member = testEnvironment.authenticatedContext('member').firestore()
    const stranger = testEnvironment.authenticatedContext('stranger').firestore()
    const host = passwordContext('host').firestore()

    await assertSucceeds(getDoc(doc(member, 'fixedRooms', roomId)))
    await assertSucceeds(getDoc(doc(stranger, 'fixedRooms', roomId)))
    await assertFails(getDoc(doc(testEnvironment.unauthenticatedContext().firestore(), 'fixedRooms', roomId)))
    await assertFails(updateDoc(doc(member, 'fixedRooms', roomId), { isPinned: true, updatedAt: serverTimestamp() }))
    await assertSucceeds(updateDoc(doc(host, 'fixedRooms', roomId), { isPinned: true, updatedAt: serverTimestamp() }))
  })

  it('RTDB sabit odaya oda kodunu bilen oturum açmış kullanıcıyı alır, host yazımını korur', async () => {
    await seedRoomData()
    const member = testEnvironment.authenticatedContext('member').database()
    const stranger = testEnvironment.authenticatedContext('stranger').database()
    const unauthenticated = testEnvironment.unauthenticatedContext().database()
    const sessionPath = `roomSessions/${roomId}/activeMembers`

    await assertSucceeds(get(ref(member, sessionPath)))
    await assertSucceeds(get(ref(stranger, sessionPath)))
    await assertFails(get(ref(unauthenticated, sessionPath)))
    await assertFails(set(ref(member, `${sessionPath}/0`), { uid: 'stranger', nickname: 'Other', joinedAt: Date.now() }))
    await assertSucceeds(set(ref(member, `${sessionPath}/2`), { uid: 'member', connectionId: 'member-connection-0002', nickname: 'Member', joinedAt: Date.now() }))
    await assertSucceeds(set(ref(stranger, `${sessionPath}/3`), { uid: 'stranger', connectionId: 'stranger-connection-0001', nickname: 'Stranger', joinedAt: Date.now() }))
    await assertFails(set(ref(member, `roomAccess/${roomId}/members/guest`), true))
    await assertSucceeds(set(ref(passwordContext('host').database(), `roomAccess/${roomId}/members/guest`), true))
  })

  it('Spark istemci aynasının bilinen sınırını gösterir: oturum açmış istemci boş RTDB kimliğini ilk sahiplenebilir', async () => {
    const client = testEnvironment.authenticatedContext('self-appointed-host').database()
    await expect(set(ref(client, 'roomAccess/unclaimed-room'), {
      hostUid: 'self-appointed-host',
      type: 'temporary',
      members: { 'self-appointed-host': true },
    })).resolves.toBeUndefined()
  })

  it('Firestore sabit oda kaydının tek başına oluşturulmasına izin verir', async () => {
    const host = passwordContext('new-host').firestore()
    const batch = writeBatch(host)
    batch.set(doc(host, 'fixedRooms', 'new-room'), {
      name: 'New Room', hostUid: 'new-host', isPinned: false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    await assertSucceeds(batch.commit())
  })

  it('yalnızca e-posta ve şifre hesabı sabit oda kurabilir', async () => {
    const anonymous = testEnvironment.authenticatedContext('anonymous-owner').firestore()
    const emailUser = passwordContext('email-owner').firestore()
    const makeRoom = (database: Firestore, id: string) => {
      const batch = writeBatch(database)
      batch.set(doc(database, 'fixedRooms', id), {
        name: 'Fixed Room', hostUid: id.startsWith('anonymous') ? 'anonymous-owner' : 'email-owner', isPinned: false,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })
      return batch.commit()
    }

    await assertFails(makeRoom(anonymous, 'anonymous-fixed-room'))
    await assertSucceeds(makeRoom(emailUser, 'email-fixed-room'))
  })

  it('RTDB sabit oda aynasını yalnızca e-posta/şifre hesabı oluşturabilir', async () => {
    const anonymous = testEnvironment.authenticatedContext('anonymous-owner').database()
    const emailUser = passwordContext('email-owner').database()
    const mirror = (uid: string) => ({ hostUid: uid, type: 'fixed', members: { [uid]: true } })
    await assertFails(set(ref(anonymous, 'roomAccess/anonymous-fixed'), mirror('anonymous-owner')))
    await assertSucceeds(set(ref(emailUser, 'roomAccess/email-fixed'), mirror('email-owner')))
  })

  it('signaling yalnızca aktif oda bağlantıları arasında ve doğru connectionId ile yazılabilir', async () => {
    await seedRoomData()
    const host = passwordContext('host').database()
    const member = testEnvironment.authenticatedContext('member').database()
    const stranger = testEnvironment.authenticatedContext('stranger').database()
    const pairPath = `roomSessions/${roomId}/signaling/seed/host~member`
    const offer = {
      sessionId: 'seed',
      fromUid: 'host',
      toUid: 'member',
      fromConnectionId: 'host-connection-0001',
      toConnectionId: 'member-connection-0001',
      kind: 'description',
      description: { type: 'offer', sdp: 'test-sdp' },
      createdAt: Date.now(),
    }

    await assertSucceeds(set(ref(host, `${pairPath}/host/host-connection-0001/offer-one`), offer))
    await assertSucceeds(get(ref(member, pairPath)))
    await assertFails(get(ref(stranger, pairPath)))
    await assertFails(set(ref(host, `${pairPath}/host/host-connection-0001/stale-offer`), {
      ...offer,
      toConnectionId: 'stale-member-connection',
    }))
    await assertFails(set(ref(host, `roomSessions/${roomId}/signaling/old-session/host~member/host/host-connection-0001/old`), offer))
  })

  it('sabit oda listesi yalnızca oda sahibinin hostUid sorgusuyla listelenebilir', async () => {
    await seedRoomData()
    const host = passwordContext('host').firestore()
    const stranger = testEnvironment.authenticatedContext('stranger').firestore()
    const hostResults = await getDocs(query(collection(host, 'fixedRooms'), where('hostUid', '==', 'host')))
    expect(hostResults.size).toBe(1)
    await assertFails(getDocs(query(collection(stranger, 'fixedRooms'), where('hostUid', '==', 'host'))))
  })

  it('dört slot paralel katılımda sınırı aşmaz ve beşinci kullanıcıyı reddeder', async () => {
    const room = 'capacity-room'
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await set(ref(context.database(), `roomAccess/${room}`), { hostUid: 'owner', members: { owner: true } })
      await set(ref(context.database(), `roomSessions/${room}/metadata`), {
        type: 'temporary', hostUid: 'owner', status: 'active', sessionId: 'session', createdAt: Date.now(), name: 'Capacity',
      })
      await set(ref(context.database(), `roomSessions/${room}/activeMembers/0`), {
        uid: 'owner', connectionId: 'owner-connection-0001', nickname: 'Owner', joinedAt: Date.now(),
      })
    })

    const attempts = ['one', 'two', 'three', 'four'].map(async (uid) => {
      const database = testEnvironment.authenticatedContext(uid).database()
      for (const slot of ['1', '2', '3']) {
        const result = await runTransaction(ref(database, `roomSessions/${room}/activeMembers/${slot}`), (current) => {
          if (current) return
          return { uid, connectionId: `${uid}-connection-0001`, nickname: uid, joinedAt: Date.now() }
        }, { applyLocally: false })
        if (result.committed) return true
      }
      return false
    })
    const outcomes = await Promise.all(attempts)
    expect(outcomes.filter(Boolean)).toHaveLength(3)
    const snapshot = await get(ref(testEnvironment.authenticatedContext('owner').database(), `roomSessions/${room}/activeMembers`))
    expect(Object.keys(snapshot.val())).toHaveLength(4)
  })

  it('host oturumları kapatabilir; sabit oda üyeliği ve aynası korunur', async () => {
    await seedRoomData()
    const host = testEnvironment.authenticatedContext('host').database()
    const member = testEnvironment.authenticatedContext('member').database()
    await assertFails(set(ref(member, `roomSessions/${roomId}`), null))
    await assertSucceeds(set(ref(host, `roomSessions/${roomId}`), null))
    await assertSucceeds(get(ref(member, `roomAccess/${roomId}`)))
    await assertSucceeds(getDoc(doc(testEnvironment.authenticatedContext('member').firestore(), 'fixedRooms', roomId)))
  })

  it('geçici mesajı yalnızca aktif üye kendi UIDsiyle yazar ve oda kapanınca kayıt silinir', async () => {
    const temporaryRoom = 'temporary-chat'
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await set(ref(context.database(), `roomAccess/${temporaryRoom}`), {
        hostUid: 'host', type: 'temporary', members: { host: true },
      })
      await set(ref(context.database(), `roomSessions/${temporaryRoom}/metadata`), {
        type: 'temporary', hostUid: 'host', status: 'active', sessionId: 'active', createdAt: Date.now(), name: 'Temporary',
      })
      await set(ref(context.database(), `roomSessions/${temporaryRoom}/activeMembers/0`), {
        uid: 'member', connectionId: 'member-connection-0001', nickname: 'Member', joinedAt: Date.now(),
      })
    })
    const member = testEnvironment.authenticatedContext('member').database()
    const stranger = testEnvironment.authenticatedContext('stranger').database()
    const message = { senderUid: 'member', senderNickname: 'Member', text: '<script>plain text</script>', createdAt: Date.now() }
    await assertSucceeds(set(ref(member, `roomSessions/${temporaryRoom}/messages/message-one`), message))
    await assertFails(set(ref(stranger, `roomSessions/${temporaryRoom}/messages/message-two`), { ...message, senderUid: 'stranger' }))
    await assertFails(set(ref(member, `roomSessions/${temporaryRoom}/messages/message-three`), { ...message, senderUid: 'someone-else' }))
    await assertFails(get(ref(stranger, `roomSessions/${temporaryRoom}/messages`)))
  })

  it('sabit sohbette 101. mesaj en eski yuvayı atomik olarak değiştirir', async () => {
    await seedRoomData()
    const database = passwordContext('host').firestore()
    const stateRef = doc(database, 'fixedRooms', roomId, 'chatMeta', 'state')
    const messagesRef = collection(database, 'fixedRooms', roomId, 'messages')
    // Fixed room codes are invitation capabilities: any signed-in user who
    // knows the code can read the room's shared chat.
    const invitedMessages = collection(testEnvironment.authenticatedContext('stranger').firestore(), 'fixedRooms', roomId, 'messages')
    await assertSucceeds(getDocs(invitedMessages))
    for (let index = 0; index < 101; index += 1) {
      await runFirestoreTransaction(database, async (transaction) => {
        const stateSnapshot = await transaction.get(stateRef)
        const state = stateSnapshot.exists() ? stateSnapshot.data() as { sequence: number; nextSlot: number } : { sequence: 0, nextSlot: 0 }
        const sequence = state.sequence + 1
        const slot = state.nextSlot
        transaction.set(stateRef, { sequence, nextSlot: (slot + 1) % 100 })
        transaction.set(doc(messagesRef, String(slot)), {
          senderUid: 'host', senderNickname: 'Host', text: `Message ${sequence}`, sequence, slot, createdAt: serverTimestamp(),
        })
      })
    }
    const savedMessages = await getDocs(messagesRef)
    expect(savedMessages.size).toBe(100)
    const sequences = savedMessages.docs.map((message) => message.data().sequence as number).sort((a, b) => a - b)
    expect(sequences[0]).toBe(2)
    expect(sequences[99]).toBe(101)
    expect((await getDoc(stateRef)).data()?.sequence).toBe(101)
  })

  it('eşzamanlı sabit mesaj işlemleri sequence numarasını çakıştırmaz', async () => {
    await seedRoomData()
    const database = passwordContext('host').firestore()
    const stateRef = doc(database, 'fixedRooms', roomId, 'chatMeta', 'state')
    const messagesRef = collection(database, 'fixedRooms', roomId, 'messages')
    await Promise.all(Array.from({ length: 4 }, async (_, index) => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          await runFirestoreTransaction(database, async (transaction) => {
            const stateSnapshot = await transaction.get(stateRef)
            const state = stateSnapshot.exists() ? stateSnapshot.data() as { sequence: number; nextSlot: number } : { sequence: 0, nextSlot: 0 }
            const sequence = state.sequence + 1
            const slot = state.nextSlot
            transaction.set(stateRef, { sequence, nextSlot: (slot + 1) % 100 })
            transaction.set(doc(messagesRef, String(slot)), {
              senderUid: 'host', senderNickname: 'Host', text: `Concurrent ${index}`, sequence, slot, createdAt: serverTimestamp(),
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
    }))
    const savedMessages = await getDocs(messagesRef)
    expect(savedMessages.size).toBe(4)
    expect(savedMessages.docs.map((message) => message.data().sequence).sort()).toEqual([1, 2, 3, 4])
  })
})
