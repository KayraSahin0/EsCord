import { useEffect, useState, type FormEvent } from 'react'
import { Bell, Check, ChevronDown, CircleHelp, LockKeyhole, LogOut, Moon, ShieldCheck, UserRound, Volume2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { getNicknameInitial, validateNickname } from './nickname'
import { useAudioStore } from '../../stores/audioStore'

export function SettingsPage() {
  const profile = useAuthStore((state) => state.profile)
  const isAnonymous = profile?.isAnonymous ?? true
  const nickname = useAuthStore((state) => state.profile?.nickname ?? '')
  const profileError = useAuthStore((state) => state.profileError)
  const profileSaving = useAuthStore((state) => state.profileSaving)
  const saveNickname = useAuthStore((state) => state.saveNickname)
  const signOut = useAuthStore((state) => state.signOut)
  const clearProfileError = useAuthStore((state) => state.clearProfileError)
  const inputDevices = useAudioStore((state) => state.inputDevices)
  const outputDevices = useAudioStore((state) => state.outputDevices)
  const inputDeviceId = useAudioStore((state) => state.inputDeviceId)
  const outputDeviceId = useAudioStore((state) => state.outputDeviceId)
  const microphoneError = useAudioStore((state) => state.microphoneError)
  const enumerateDevices = useAudioStore((state) => state.enumerateDevices)
  const setInputDeviceId = useAudioStore((state) => state.setInputDeviceId)
  const setOutputDeviceId = useAudioStore((state) => state.setOutputDeviceId)
  const [nicknameDraft, setNicknameDraft] = useState(() => nickname)
  const [validationError, setValidationError] = useState<string | null>(null)
  const supportsOutputSelection = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype

  useEffect(() => {
    void enumerateDevices()
    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices) return
    const refreshDevices = () => { void enumerateDevices() }
    mediaDevices.addEventListener('devicechange', refreshDevices)
    return () => mediaDevices.removeEventListener('devicechange', refreshDevices)
  }, [enumerateDevices])

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
      <div className="section-heading settings-heading"><div><p className="eyebrow">KİŞİSEL ALAN</p><h1>Ayarlar</h1><p className="section-subtitle">Profil ve ses cihazı tercihlerini yönet.</p></div><span className="preview-pill"><i /> Ses ayarları etkin</span></div>

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
            <div className="profile-preview"><div className="avatar avatar--large">{getNicknameInitial(nickname)}</div><div><strong>{nickname}</strong><span>{isAnonymous ? 'Anonim Firebase hesabı' : 'E-posta hesabı'}</span></div><button className="text-action sign-out-action" onClick={() => void signOut()} type="button"><LogOut size={14} /> Oturumu kapat</button></div>
            <form className="nickname-edit-form" onSubmit={(event) => void handleNicknameSave(event)}>
              <label htmlFor="settings-nickname">Takma ad</label>
              <div className="nickname-edit-row"><input autoComplete="nickname" id="settings-nickname" maxLength={24} minLength={2} onChange={(event) => { const value = event.target.value; setNicknameDraft(value); setValidationError(value.trim() ? validateNickname(value) : null); clearProfileError() }} value={nicknameDraft} /><button className="button button--secondary" disabled={profileSaving || nicknameDraft.trim() === nickname || !!validateNickname(nicknameDraft)} type="submit">{profileSaving ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
              {(validationError || profileError) && <p className="auth-form-error" role="alert">{validationError || profileError}</p>}
              <span className="auth-character-count">2–24 karakter. Adın Firebase Authentication profilinde saklanır.</span>
            </form>
            <div className="settings-line"><div><strong>Hesap türü</strong><span>{isAnonymous ? 'Tarayıcı verileri temizlenirse anonim UID kaybolabilir.' : 'E-posta ve şifre ile giriş yapıldı.'}</span></div><span className="value-placeholder">{isAnonymous ? 'Anonim' : 'E-posta'}</span></div>
          </section>

          <section className="settings-card" id="appearance">
            <div className="settings-card-heading"><span className="settings-card-icon settings-card-icon--purple"><Moon size={17} /></span><div><h2>Görünüm</h2><p>EsCord arayüzünün tercihleri.</p></div></div>
            <div className="settings-line"><div><strong>Tema</strong><span>Karanlık tema uygulama varsayılanıdır.</span></div><button className="select-placeholder" disabled title="Tema seçimi yakında"><Moon size={14} /> Koyu <ChevronDown size={14} /></button></div>
            <div className="settings-line"><div><strong>Kompakt oda görünümü</strong><span>Katılımcı alanında daha az boşluk kullan.</span></div><span aria-label="Kapalı" className="toggle-placeholder" /></div>
          </section>

          <section className="settings-card" id="audio">
            <div className="settings-card-heading"><span className="settings-card-icon settings-card-icon--green"><Volume2 size={17} /></span><div><h2>Ses ve cihazlar</h2><p>Mikrofon ve hoparlör tercihleri.</p></div></div>
            <div className="settings-line"><div><strong>Giriş cihazı</strong><span>Cihazı değiştirmek açık mikrofonu yeniden başlatır.</span></div><select aria-label="Mikrofon giriş cihazı" className="device-select" onChange={(event) => void setInputDeviceId(event.target.value)} value={inputDeviceId}>
              <option value="">Varsayılan mikrofon</option>
              {inputDevices.map((device, index) => <option key={device.deviceId || `input-${index}`} value={device.deviceId}>{device.label || `Mikrofon ${index + 1}`}</option>)}
            </select></div>
            <div className="settings-line"><div><strong>Çıkış cihazı</strong><span>{supportsOutputSelection ? 'Gelen oda sesinin çalacağı cihaz.' : 'Bu tarayıcı ayrı ses çıkışı seçimini desteklemiyor.'}</span></div><select aria-label="Ses çıkış cihazı" className="device-select" disabled={!supportsOutputSelection} onChange={(event) => setOutputDeviceId(event.target.value)} value={outputDeviceId}>
              <option value="">Varsayılan hoparlör</option>
              {outputDevices.map((device, index) => <option key={device.deviceId || `output-${index}`} value={device.deviceId}>{device.label || `Hoparlör ${index + 1}`}</option>)}
            </select></div>
            {inputDevices.length === 0 && <p className="device-help">Mikrofon listesini görmek için bir odaya girip mikrofonu açın; tarayıcı izin verdikten sonra cihaz listesi burada görünür.</p>}
            {microphoneError && <p className="auth-form-error" role="alert">{microphoneError}</p>}
          </section>

          <section className="settings-card settings-card--privacy" id="privacy">
            <div className="settings-card-heading"><span className="settings-card-icon settings-card-icon--blue"><LockKeyhole size={17} /></span><div><h2>Gizlilik ve güvenlik</h2><p>Bağlantı ve hesap ayarlarına genel bakış.</p></div></div>
            <div className="privacy-info"><span><Check size={15} /></span><p><strong>Medya aktarımı P2P olarak tasarlanıyor</strong><small>Ses ve görüntü Firebase üzerinden aktarılmayacak.</small></p><ShieldCheck size={17} /></div>
          </section>

          <p className="settings-footer"><Bell size={14} /> Ses cihazı tercihleri bu tarayıcıda saklanır. <CircleHelp size={14} /></p>
        </div>
      </div>
    </div>
  )
}
