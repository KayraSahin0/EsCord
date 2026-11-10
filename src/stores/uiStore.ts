import { create } from 'zustand'

export type ActiveModal = 'create-room' | 'join-room' | null

type UiState = {
  activeModal: ActiveModal
  openModal: (modal: Exclude<ActiveModal, null>) => void
  closeModal: () => void
}

export const useUiStore = create<UiState>((set) => ({
  activeModal: null,
  openModal: (activeModal) => set({ activeModal }),
  closeModal: () => set({ activeModal: null }),
}))
