import { describe, expect, it } from 'vitest'
import { getNicknameInitial, validateNickname } from '../src/features/profile/nickname'

describe('takma ad doğrulama', () => {
  it('başında ve sonunda boşluk olan geçerli adı kabul eder', () => {
    expect(validateNickname('  Deniz  ')).toBeNull()
  })

  it('boş veya tek karakterlik adı reddeder', () => {
    expect(validateNickname('')).toBe('Takma ad en az 2 karakter olmalı.')
    expect(validateNickname('A')).toBe('Takma ad en az 2 karakter olmalı.')
  })

  it('24 karakterden uzun adı reddeder', () => {
    expect(validateNickname('1234567890123456789012345')).toBe('Takma ad en fazla 24 karakter olabilir.')
  })

  it('Türkçe karakter için büyük harf avatar baş harfi üretir', () => {
    expect(getNicknameInitial(' ışıl')).toBe('I')
    expect(getNicknameInitial(null)).toBe('?')
  })
})
