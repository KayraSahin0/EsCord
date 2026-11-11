import { RouterProvider } from 'react-router-dom'
import { AuthLoadingScreen, AuthMessageScreen, SignInScreen, NicknameSetupScreen } from '../components/auth/AuthScreens'
import { useAuthStore } from '../stores/authStore'
import { router } from './router'

export function App() {
  const status = useAuthStore((state) => state.status)
  const errorMessage = useAuthStore((state) => state.errorMessage)
  const retrySignIn = useAuthStore((state) => state.retrySignIn)
  const nickname = useAuthStore((state) => state.profile?.nickname)

  if (status === 'loading') return <AuthLoadingScreen />
  if (status === 'config-missing') {
    return <AuthMessageScreen message="Firebase Web App ayarları .env.local içinde bulunamadı. Yapılandırmayı ekleyip geliştirme sunucusunu yeniden başlatın." title="Firebase ayarı gerekli" />
  }
  if (status === 'error') {
    return <AuthMessageScreen action={<button className="auth-submit" onClick={() => void retrySignIn()} type="button">Yeniden dene</button>} message={errorMessage ?? 'Kimlik doğrulama başarısız oldu.'} title="Oturum açılamadı" />
  }
  if (status === 'signed-out') return <SignInScreen errorMessage={errorMessage} />
  if (!nickname) return <NicknameSetupScreen />

  return <RouterProvider router={router} />
}
