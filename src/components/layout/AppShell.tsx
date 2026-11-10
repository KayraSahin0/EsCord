import { Outlet } from 'react-router-dom'
import { CreateRoomModal } from '../../features/rooms/CreateRoomModal'
import { JoinRoomModal } from '../../features/rooms/JoinRoomModal'
import { useUiStore } from '../../stores/uiStore'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell() {
  const activeModal = useUiStore((state) => state.activeModal)

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
