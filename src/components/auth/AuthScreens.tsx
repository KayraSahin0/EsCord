import { useState, type FormEvent, type PropsWithChildren, type ReactNode } from 'react'
import { AudioLines, LoaderCircle, LockKeyhole, LogIn, UserRound } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { validateNickname } from '../../features/profile/nickname'

function AuthCard({ children, label }: PropsWithChildren<{ label: string }>) {
  return (
    <main className="auth-screen">
      <section aria-label={label} className="auth-card">
        <div aria-hidden="true" className="auth-brand-mark"><AudioLines size={24} /></div>
        {children}
        <p className="auth-card-footnote"><LockKeyhole size={13} /> Kimlik bilgileri Firebase Authentication ile korunur.</p>
      </section>
      <span className="auth-screen-label">ESCORD · GÜVENLİ OTURUM</span>
    </main>
  )
}

export function AuthLoadingScreen() {
  return (
    <AuthCard label="Oturum yükleniyor">
      <div aria-live="polite" className="auth-state-copy">
        <LoaderCircle className="auth-spinner" size={20} />
        <h1>Oturumun hazırlanıyor</h1>
        <p>Güvenli bağlantı kurulurken kısa bir süre bekle.</p>
      </div>
    </AuthCard>
  )
}

export function AuthMessageScreen({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <AuthCard label={title}>
      <div className="auth-state-copy">
        <span className="auth-state-icon"><LockKeyhole size={20} /></span>
        <h1>{title}</h1>
        <p>{message}</p>
        {action}
      </div>
    </AuthCard>
  )
}

export function GuestSignInScreen() {
  const retrySignIn = useAuthStore((state) => state.retrySignIn)
  const [isSigningIn, setIsSigningIn] = useState(false)

  async function handleSignIn() {
    setIsSigningIn(true)
    await retrySignIn()
    setIsSigningIn(false)
  }

  return (
    <AuthCard label="Misafir girişi">
      <div className="auth-state-copy">
        <span className="auth-state-icon"><UserRound size={20} /></span>
        <p className="auth-eyebrow">YENİDEN HOŞ GELDİN</p>
        <h1>Birlikte sohbete dön.</h1>
        <p>Yeni bir anonim oturum başlatıp devam edebilirsin.</p>
        <button className="auth-submit" disabled={isSigningIn} onClick={() => void handleSignIn()} type="button">
          <LogIn size={16} /> {isSigningIn ? 'Bağlanıyor…' : 'Misafir olarak giriş yap'}
        </button>
      </div>
    </AuthCard>
  )
}

export function NicknameSetupScreen() {
  const saveNickname = useAuthStore((state) => state.saveNickname)
  const profileSaving = useAuthStore((state) => state.profileSaving)
  const profileError = useAuthStore((state) => state.profileError)
  const clearProfileError = useAuthStore((state) => state.clearProfileError)
  const [nickname, setNickname] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = nickname.trim()
    const error = validateNickname(normalized)
    if (error) {
      setValidationError(error)
      return
    }
    await saveNickname(normalized)
  }

  return (
    <AuthCard label="Takma ad oluştur">
      <div className="auth-state-copy auth-state-copy--form">
        <span className="auth-state-icon"><UserRound size={20} /></span>
        <p className="auth-eyebrow">PROFİLİNİ HAZIRLA</p>
        <h1>Arkadaşların sana<br />nasıl seslensin?</h1>
        <p>Takma adın odalarda görünür. Daha sonra ayarlardan değiştirebilirsin.</p>
        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="first-nickname">Takma ad</label>
          <input
            autoComplete="nickname"
            autoFocus
            id="first-nickname"
            maxLength={24}
            minLength={2}
            onChange={(event) => {
              const value = event.target.value
              setNickname(value)
              setValidationError(value.trim() ? validateNickname(value) : null)
              clearProfileError()
            }}
            placeholder="Örn. Deniz"
            required
            value={nickname}
          />
          <span className="auth-character-count">{nickname.trim().length}/24 · en az 2 karakter</span>
          {(validationError || profileError) && <p className="auth-form-error" role="alert">{validationError || profileError}</p>}
          <button className="auth-submit" disabled={profileSaving || !!validateNickname(nickname)} type="submit">
            {profileSaving ? 'Kaydediliyor…' : 'Devam et'}
          </button>
        </form>
      </div>
    </AuthCard>
  )
}
