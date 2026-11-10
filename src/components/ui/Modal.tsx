import { useEffect, type PropsWithChildren } from 'react'
import { X } from 'lucide-react'
import { useUiStore } from '../../stores/uiStore'

type ModalProps = PropsWithChildren<{ title: string; description: string }>

export function Modal({ title, description, children }: ModalProps) {
  const closeModal = useUiStore((state) => state.closeModal)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [closeModal])

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal()
      }}
    >
      <section
        aria-describedby="modal-description"
        aria-labelledby="modal-title"
        aria-modal="true"
        className="modal-card"
        role="dialog"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">ESCORD · ÖNİZLEME</p>
            <h2 id="modal-title">{title}</h2>
            <p id="modal-description">{description}</p>
          </div>
          <button
            aria-label="Pencereyi kapat"
            className="icon-button modal-close"
            onClick={closeModal}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
