import { LockKeyhole, Radio, UsersRound } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useUiStore } from '../../stores/uiStore'

export function CreateRoomModal() {
  const closeModal = useUiStore((state) => state.closeModal)

  return (
    <Modal description="Oda oluşturma arayüzü hazır; oda işlemleri sonraki geliştirme aşamasında etkinleşecek." title="Yeni bir oda başlat">
      <div className="modal-form">
        <label className="field-label" htmlFor="room-name">Oda adı</label>
        <input className="text-input" id="room-name" maxLength={40} placeholder="Örn. Akşam sohbeti" />

        <span className="field-label field-label--spaced">Oda türü</span>
        <div className="room-type-list">
          <label className="room-type-option is-selected">
            <input defaultChecked name="room-type" type="radio" value="temporary" />
            <span className="room-type-icon"><Radio size={18} /></span>
            <span className="room-type-copy"><strong>Geçici oda</strong><small>Oda kapandığında oturum verileri silinir.</small></span>
            <span className="radio-indicator" />
          </label>
          <label className="room-type-option is-disabled">
            <input disabled name="room-type" type="radio" value="pinned" />
            <span className="room-type-icon"><LockKeyhole size={18} /></span>
            <span className="room-type-copy"><strong>Sabit oda</strong><small>Bu seçenek sonraki aşamada açılacak.</small></span>
            <span className="room-type-badge"><UsersRound size={12} /> Yakında</span>
          </label>
        </div>

        <p className="modal-note">En fazla 4 katılımcı · Oda bağlantısı henüz etkin değil</p>
        <div className="modal-actions">
          <Button onClick={closeModal} type="button" variant="ghost">Vazgeç</Button>
          <Button disabled title="Oda oluşturma PHASE 04 kapsamında etkinleşecek" type="button" variant="primary">Oda oluştur</Button>
        </div>
      </div>
    </Modal>
  )
}
