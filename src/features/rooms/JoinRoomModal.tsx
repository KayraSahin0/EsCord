import { useState, type FormEvent } from 'react'
import { Link2, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useUiStore } from '../../stores/uiStore'
import { normalizeRoomId, validateRoomId } from '../../services/firebase/roomService'

export function JoinRoomModal() {
  const closeModal = useUiStore((state) => state.closeModal)
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = roomCode.trim().replace(/.*\/rooms\//, '').split(/[?#]/)[0] ?? ''
    const validation = validateRoomId(code)
    if (validation) { setError(validation); return }
    setBusy(true)
    setError(null)
    closeModal()
    navigate(`/rooms/${normalizeRoomId(code)}`)
  }

  return (
    <Modal description="Oda sahibinden aldığın 32 karakterli davet kodunu veya oda bağlantısını kullan." title="Bir odaya katıl">
      <form className="modal-form" onSubmit={submit}>
        <label className="field-label" htmlFor="room-code">Davet kodu</label>
        <div className="input-with-icon"><Link2 aria-hidden="true" size={17} /><input autoFocus className="text-input" id="room-code" onChange={(event) => setRoomCode(event.target.value)} placeholder="Oda kodu veya davet bağlantısı" value={roomCode} /></div>
        <div className="join-hint"><UsersRound size={16} /><span>Sabit odaya katılmak için oturum açmış olmanız ve davet koduna sahip olmanız yeterlidir.</span></div>
        {error && <p className="auth-form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <Button onClick={closeModal} type="button" variant="ghost">Vazgeç</Button>
          <Button disabled={busy} type="submit" variant="primary">Odaya katıl</Button>
        </div>
      </form>
    </Modal>
  )
}
