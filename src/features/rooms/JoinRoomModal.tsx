import { Link2, UsersRound } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useUiStore } from '../../stores/uiStore'

export function JoinRoomModal() {
  const closeModal = useUiStore((state) => state.closeModal)

  return (
    <Modal description="Davet kodu ile katılma arayüzü hazır; oda üyeliği sonraki aşamada etkinleşecek." title="Bir odaya katıl">
      <div className="modal-form">
        <label className="field-label" htmlFor="room-code">Davet kodu</label>
        <div className="input-with-icon"><Link2 aria-hidden="true" size={17} /><input className="text-input" id="room-code" placeholder="Örn. gece-sohbeti" /></div>
        <div className="join-hint"><UsersRound size={16} /><span>Davet kodunu oda sahibinden iste. Kodlar büyük/küçük harfe duyarlı değildir.</span></div>
        <div className="modal-actions">
          <Button onClick={closeModal} type="button" variant="ghost">Vazgeç</Button>
          <Button disabled title="Odaya katılma PHASE 04 kapsamında etkinleşecek" type="button" variant="primary">Odaya katıl</Button>
        </div>
      </div>
    </Modal>
  )
}
