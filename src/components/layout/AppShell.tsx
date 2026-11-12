import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { CreateRoomModal } from '../../features/rooms/CreateRoomModal'
import { JoinRoomModal } from '../../features/rooms/JoinRoomModal'
import { useUiStore } from '../../stores/uiStore'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useRoomStore } from '../../stores/roomStore'

export function AppShell() {
  const activeModal = useUiStore((state) => state.activeModal)
  const { pathname } = useLocation()
  const connectToRoom = useRoomStore((state) => state.connectToRoom)
  const leaveCurrentRoom = useRoomStore((state) => state.leaveCurrentRoom)

  useEffect(() => {
    const roomMatch = pathname.match(/^\/rooms\/([^/]+)$/)
    if (roomMatch) {
      void connectToRoom(decodeURIComponent(roomMatch[1]))
    } else if (pathname !== '/settings' && pathname !== '/') {
      void leaveCurrentRoom()
    }
  }, [connectToRoom, leaveCurrentRoom, pathname])

  return (
    <div className="app-frame">
      <Sidebar />
      <div className="workspace">
        <Topbar />
        <main className="main-content"><Outlet /></main>
      </div>
      {activeModal === 'create-room' && <CreateRoomModal />}
      {activeModal === 'join-room' && <JoinRoomModal />}
    </div>
  )
}
