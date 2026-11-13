import { createHashRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { HomePage } from '../features/rooms/HomePage'
import { RoomPage } from '../features/rooms/RoomPage'
import { SettingsPage } from '../features/profile/SettingsPage'

export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/rooms/:roomId', element: <RoomPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <HomePage /> },
    ],
  },
])
