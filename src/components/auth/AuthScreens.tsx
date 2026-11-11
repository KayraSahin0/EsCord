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

export function SignInScreen({ errorMessage }: { errorMessage: string | null }) {
  const retrySignIn = useAuthStore((state) => state.retrySignIn)
  const signInWithEmail = useAuthStore((state) => state.signInWithEmail)
  const [mode, setMode] = useState<'sign-in' | 'create'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    await signInWithEmail(email, password, mode === 'create')
    setBusy(false)
  }

  async function handleGuestSignIn() {
    setBusy(true)
    await retrySignIn()
    setBusy(false)
  }

  return (
    <AuthCard label="EsCord giriş">
      <div className="auth-state-copy auth-state-copy--form">
        <span className="auth-state-icon"><UserRound size={20} /></span>
        <p className="auth-eyebrow">ESCORD HESABI</p>
        <h1>{mode === 'sign-in' ? 'Tekrar hoş geldin.' : 'Hesabını oluştur.'}</h1>
        <p>{mode === 'sign-in' ? 'E-posta ve şifrenle giriş yap.' : 'E-posta ve şifrenle kalıcı hesabını oluştur.'}</p>
        <form className="auth-form" onSubmit={(event) => void handleEmailSubmit(event)}>
          <label htmlFor="auth-email">E-posta</label>
          <input autoComplete="email" autoFocus id="auth-email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          <label htmlFor="auth-password">Şifre</label>
          <input autoComplete={mode === 'create' ? 'new-password' : 'current-password'} id="auth-password" minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          {errorMessage && <p className="auth-form-error" role="alert">{errorMessage}</p>}
          <button className="auth-submit" disabled={busy} type="submit"><LogIn size={16} />{busy ? 'İşleniyor…' : mode === 'sign-in' ? 'E-posta ile giriş yap' : 'Hesap oluştur'}</button>
        </form>
        <button className="auth-mode-toggle" onClick={() => setMode(mode === 'sign-in' ? 'create' : 'sign-in')} type="button">
          {mode === 'sign-in' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
        </button>
        <div className="auth-divider"><span>veya</span></div>
        <button className="auth-guest-button" disabled={busy} onClick={() => void handleGuestSignIn()} type="button">
          <UserRound size={16} /> {busy ? 'Bağlanıyor…' : 'Anonim giriş'}
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
