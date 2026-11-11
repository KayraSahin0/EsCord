export function getNicknameInitial(nickname: string | null | undefined): string {
  return nickname?.trim().slice(0, 1).toLocaleUpperCase('tr-TR') || '?'
}

export function validateNickname(nickname: string): string | null {
  const normalized = nickname.trim()
  if (normalized.length < 2) return 'Takma ad en az 2 karakter olmalı.'
  if (normalized.length > 24) return 'Takma ad en fazla 24 karakter olabilir.'
  return null
}
