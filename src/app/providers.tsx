import { StrictMode } from 'react'
import { useEffect } from 'react'
import { App } from './App'
import { useAuthStore } from '../stores/authStore'

export function AppProviders() {
  return (
    <StrictMode>
      <AuthBootstrap />
    </StrictMode>
  )
}

function AuthBootstrap() {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => initialize(), [initialize])

  return <App />
}
