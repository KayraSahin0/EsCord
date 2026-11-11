import { readFileSync } from 'node:fs'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collectionGroup, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { get, ref, runTransaction, set } from 'firebase/database'

const projectId = 'demo-escord'
const roomId = 'room-test'
let testEnvironment: RulesTestEnvironment

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
      hostUid: 'host', members: { host: true, member: true },
    })
    await set(ref(context.database(), `roomSessions/${roomId}/metadata`), {
      type: 'fixed', hostUid: 'host', status: 'active', sessionId: 'seed', createdAt: Date.now(), name: 'Test Room',
    })
    await set(ref(context.database(), `roomSessions/${roomId}/activeMembers/0`), {
      uid: 'host', nickname: 'Host', joinedAt: Date.now(),
    })
    await set(ref(context.database(), `roomSessions/${roomId}/activeMembers/1`), {
      uid: 'member', nickname: 'Member', joinedAt: Date.now(),
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

  it('sabit oda metadata ve üye kayıtlarını oda üyeliğine ve host yetkisine bağlar', async () => {
    await seedRoomData()
    const member = testEnvironment.authenticatedContext('member').firestore()
    const stranger = testEnvironment.authenticatedContext('stranger').firestore()
    const host = testEnvironment.authenticatedContext('host').firestore()

    await assertSucceeds(getDoc(doc(member, 'fixedRooms', roomId)))
    await assertFails(getDoc(doc(stranger, 'fixedRooms', roomId)))
    await assertFails(getDoc(doc(testEnvironment.unauthenticatedContext().firestore(), 'fixedRooms', roomId)))
    await assertFails(setDoc(doc(stranger, 'fixedRooms', roomId, 'members', 'stranger'), {
      uid: 'stranger', authorizedBy: 'stranger', authorizedAt: serverTimestamp(),
    }))
    await assertSucceeds(setDoc(doc(host, 'fixedRooms', roomId, 'members', 'guest'), {
      uid: 'guest', authorizedBy: 'host', authorizedAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(doc(member, 'fixedRooms', roomId), { isPinned: true, updatedAt: serverTimestamp() }))
  })

  it('RTDB oda oturumunu aynadaki üyelerle sınırlar ve host yazımını korur', async () => {
    await seedRoomData()
    const member = testEnvironment.authenticatedContext('member').database()
    const stranger = testEnvironment.authenticatedContext('stranger').database()
    const unauthenticated = testEnvironment.unauthenticatedContext().database()
    const sessionPath = `roomSessions/${roomId}/activeMembers`

    await assertSucceeds(get(ref(member, sessionPath)))
    await assertFails(get(ref(stranger, sessionPath)))
    await assertFails(get(ref(unauthenticated, sessionPath)))
    await assertFails(set(ref(member, `${sessionPath}/0`), { uid: 'stranger', nickname: 'Other', joinedAt: Date.now() }))
    await assertSucceeds(set(ref(member, `${sessionPath}/2`), { uid: 'member', nickname: 'Member', joinedAt: Date.now() }))
    await assertFails(set(ref(stranger, `${sessionPath}/3`), { uid: 'stranger', nickname: 'Stranger', joinedAt: Date.now() }))
    await assertSucceeds(set(ref(testEnvironment.authenticatedContext('host').database(), `${sessionPath}/3`), { uid: 'host', nickname: 'Host', joinedAt: Date.now() }))
    await assertFails(set(ref(member, `roomAccess/${roomId}/members/guest`), true))
    await assertSucceeds(set(ref(testEnvironment.authenticatedContext('host').database(), `roomAccess/${roomId}/members/guest`), true))
  })

  it('Spark istemci aynasının bilinen sınırını gösterir: oturum açmış istemci boş RTDB kimliğini ilk sahiplenebilir', async () => {
    const client = testEnvironment.authenticatedContext('self-appointed-host').database()
    await expect(set(ref(client, 'roomAccess/unclaimed-room'), {
      hostUid: 'self-appointed-host',
      members: { 'self-appointed-host': true },
    })).resolves.toBeUndefined()
  })

  it('Firestore oda ve host üyeliğinin aynı batch içinde kurulmasına izin verir', async () => {
    const host = testEnvironment.authenticatedContext('new-host').firestore()
    const batch = writeBatch(host)
    batch.set(doc(host, 'fixedRooms', 'new-room'), {
      name: 'New Room', hostUid: 'new-host', isPinned: false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    batch.set(doc(host, 'fixedRooms', 'new-room', 'members', 'new-host'), {
      uid: 'new-host', authorizedBy: 'new-host', authorizedAt: serverTimestamp(),
    })

    await assertSucceeds(batch.commit())
  })

  it('sabit oda listesi yalnızca sorguyu yapan UID için üyelik döndürür', async () => {
    await seedRoomData()
    const member = testEnvironment.authenticatedContext('member').firestore()
    const stranger = testEnvironment.authenticatedContext('stranger').firestore()
    const memberResults = await getDocs(query(collectionGroup(member, 'members'), where('uid', '==', 'member')))
    expect(memberResults.size).toBe(1)
    await assertFails(getDocs(query(collectionGroup(stranger, 'members'), where('uid', '==', 'member'))))
  })

  it('dört slot paralel katılımda sınırı aşmaz ve beşinci kullanıcıyı reddeder', async () => {
    const room = 'capacity-room'
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await set(ref(context.database(), `roomAccess/${room}`), { hostUid: 'owner', members: { owner: true } })
      await set(ref(context.database(), `roomSessions/${room}/metadata`), {
        type: 'temporary', hostUid: 'owner', status: 'active', sessionId: 'session', createdAt: Date.now(), name: 'Capacity',
      })
      await set(ref(context.database(), `roomSessions/${room}/activeMembers/0`), {
        uid: 'owner', nickname: 'Owner', joinedAt: Date.now(),
      })
    })

    const attempts = ['one', 'two', 'three', 'four'].map(async (uid) => {
      const database = testEnvironment.authenticatedContext(uid).database()
      for (const slot of ['1', '2', '3']) {
        const result = await runTransaction(ref(database, `roomSessions/${room}/activeMembers/${slot}`), (current) => {
          if (current) return
          return { uid, nickname: uid, joinedAt: Date.now() }
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
})
