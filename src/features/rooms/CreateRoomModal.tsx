import { useState, type FormEvent } from 'react'
import { LockKeyhole, Radio, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useUiStore } from '../../stores/uiStore'
import { createRoom } from '../../services/firebase/roomService'
import type { RoomType } from '../../services/firebase/models'
import { useAuthStore } from '../../stores/authStore'

export function CreateRoomModal() {
  const closeModal = useUiStore((state) => state.closeModal)
  const isAnonymous = useAuthStore((state) => state.profile?.isAnonymous ?? true)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [type, setType] = useState<RoomType>('temporary')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const roomId = await createRoom({ name, type })
      closeModal()
      navigate(`/rooms/${roomId}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Oda oluşturulamadı.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal description="Geçici ya da sabit bir oda oluştur. Oda başına en fazla dört kişi katılabilir." title="Yeni bir oda başlat">
      <form className="modal-form" onSubmit={(event) => void submit(event)}>
        <label className="field-label" htmlFor="room-name">Oda adı</label>
        <input autoFocus className="text-input" id="room-name" maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Örn. Akşam sohbeti" required value={name} />

        <span className="field-label field-label--spaced">Oda türü</span>
        <div className="room-type-list">
          <label className={`room-type-option${type === 'temporary' ? ' is-selected' : ''}`}>
            <input checked={type === 'temporary'} name="room-type" onChange={() => setType('temporary')} type="radio" value="temporary" />
            <span className="room-type-icon"><Radio size={18} /></span>
            <span className="room-type-copy"><strong>Geçici oda</strong><small>Oda kapandığında oturum verileri silinir.</small></span>
            <span className="radio-indicator" />
          </label>
          <label className={`room-type-option${type === 'fixed' ? ' is-selected' : ''}${isAnonymous ? ' is-disabled' : ''}`}>
            <input checked={type === 'fixed'} disabled={isAnonymous} name="room-type" onChange={() => setType('fixed')} type="radio" value="fixed" />
            <span className="room-type-icon"><LockKeyhole size={18} /></span>
            <span className="room-type-copy"><strong>Sabit oda</strong><small>{isAnonymous ? 'Sabit oda için e-posta ile giriş yap.' : 'Oda ve yetkilendirilmiş üyeler korunur.'}</small></span>
            <span className="room-type-badge"><UsersRound size={12} /> Kalıcı</span>
          </label>
        </div>

        <p className="modal-note">En fazla 4 katılımcı</p>
        {error && <p className="auth-form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <Button onClick={closeModal} type="button" variant="ghost">Vazgeç</Button>
          <Button disabled={busy} type="submit" variant="primary">{busy ? 'Oluşturuluyor…' : 'Oda oluştur'}</Button>
        </div>
      </form>
    </Modal>
  )
}
