import { useState, type FormEvent } from 'react'
import { Bell, Check, ChevronDown, CircleHelp, LockKeyhole, LogOut, Moon, ShieldCheck, UserRound, Volume2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { getNicknameInitial, validateNickname } from './nickname'

export function SettingsPage() {
  const nickname = useAuthStore((state) => state.profile?.nickname ?? '')
  const profileError = useAuthStore((state) => state.profileError)
  const profileSaving = useAuthStore((state) => state.profileSaving)
  const saveNickname = useAuthStore((state) => state.saveNickname)
  const signOut = useAuthStore((state) => state.signOut)
  const clearProfileError = useAuthStore((state) => state.clearProfileError)
  const [nicknameDraft, setNicknameDraft] = useState(() => nickname)
  const [validationError, setValidationError] = useState<string | null>(null)

  async function handleNicknameSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = nicknameDraft.trim()
    const error = validateNickname(normalized)
    if (error) {
      setValidationError(error)
      return
    }
    await saveNickname(normalized)
  }

  return (
    <div className="page-stack settings-page">
      <div className="section-heading settings-heading"><div><p className="eyebrow">KİŞİSEL ALAN</p><h1>Ayarlar</h1><p className="section-subtitle">Profil ve uygulama tercihlerin için bir önizleme.</p></div><span className="preview-pill"><i /> Taslak ekran</span></div>

      <div className="settings-layout">
        <nav aria-label="Ayar bölümleri" className="settings-nav">
          <a className="settings-nav-link is-active" href="#profile"><UserRound size={16} /> Profil</a>
          <a className="settings-nav-link" href="#appearance"><Moon size={16} /> Görünüm</a>
          <a className="settings-nav-link" href="#audio"><Volume2 size={16} /> Ses ve cihazlar</a>
          <a className="settings-nav-link" href="#privacy"><ShieldCheck size={16} /> Gizlilik</a>
        </nav>

        <div className="settings-content">
          <section className="settings-card" id="profile">
            <div className="settings-card-heading"><span className="settings-card-icon"><UserRound size={17} /></span><div><h2>Profil</h2><p>Odada arkadaşlarının göreceği bilgiler.</p></div><span className="draft-chip">Taslak</span></div>
            <div className="profile-preview"><div className="avatar avatar--large">{getNicknameInitial(nickname)}</div><div><strong>{nickname}</strong><span>Anonim Firebase hesabı</span></div><button className="text-action sign-out-action" onClick={() => void signOut()} type="button"><LogOut size={14} /> Oturumu kapat</button></div>
            <form className="nickname-edit-form" onSubmit={(event) => void handleNicknameSave(event)}>
              <label htmlFor="settings-nickname">Takma ad</label>
              <div className="nickname-edit-row"><input autoComplete="nickname" id="settings-nickname" maxLength={24} minLength={2} onChange={(event) => { const value = event.target.value; setNicknameDraft(value); setValidationError(value.trim() ? validateNickname(value) : null); clearProfileError() }} value={nicknameDraft} /><button className="button button--secondary" disabled={profileSaving || nicknameDraft.trim() === nickname || !!validateNickname(nicknameDraft)} type="submit">{profileSaving ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
              {(validationError || profileError) && <p className="auth-form-error" role="alert">{validationError || profileError}</p>}
              <span className="auth-character-count">2–24 karakter. Adın Firebase Authentication profilinde saklanır.</span>
            </form>
            <div className="settings-line"><div><strong>Hesap türü</strong><span>Anonim giriş. Tarayıcı verileri temizlenirse UID kaybolabilir.</span></div><span className="value-placeholder">Anonim</span></div>
          </section>

          <section className="settings-card" id="appearance">
            <div className="settings-card-heading"><span className="settings-card-icon settings-card-icon--purple"><Moon size={17} /></span><div><h2>Görünüm</h2><p>EsCord arayüzünün tercihleri.</p></div></div>
            <div className="settings-line"><div><strong>Tema</strong><span>Karanlık tema uygulama varsayılanıdır.</span></div><button className="select-placeholder" disabled title="Tema seçimi yakında"><Moon size={14} /> Koyu <ChevronDown size={14} /></button></div>
            <div className="settings-line"><div><strong>Kompakt oda görünümü</strong><span>Katılımcı alanında daha az boşluk kullan.</span></div><span aria-label="Kapalı" className="toggle-placeholder" /></div>
          </section>

          <section className="settings-card" id="audio">
            <div className="settings-card-heading"><span className="settings-card-icon settings-card-icon--green"><Volume2 size={17} /></span><div><h2>Ses ve cihazlar</h2><p>Mikrofon ve hoparlör tercihleri.</p></div></div>
            <div className="settings-line"><div><strong>Giriş cihazı</strong><span>Mikrofon seçimi</span></div><span className="value-placeholder">Odaya katılınca kullanılabilir</span></div>
            <div className="settings-line"><div><strong>Çıkış cihazı</strong><span>Hoparlör seçimi</span></div><span className="value-placeholder">Odaya katılınca kullanılabilir</span></div>
          </section>

          <section className="settings-card settings-card--privacy" id="privacy">
            <div className="settings-card-heading"><span className="settings-card-icon settings-card-icon--blue"><LockKeyhole size={17} /></span><div><h2>Gizlilik ve güvenlik</h2><p>Bağlantı ve hesap ayarlarına genel bakış.</p></div></div>
            <div className="privacy-info"><span><Check size={15} /></span><p><strong>Medya aktarımı P2P olarak tasarlanıyor</strong><small>Ses ve görüntü Firebase üzerinden aktarılmayacak.</small></p><ShieldCheck size={17} /></div>
          </section>

          <p className="settings-footer"><Bell size={14} /> Ayarları kaydetme ve cihaz seçimi henüz etkin değil. <CircleHelp size={14} /></p>
        </div>
      </div>
    </div>
  )
}
