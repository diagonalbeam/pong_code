export interface AvatarColor {
  background: string
  foreground: string
}

const USER_AVATAR_COLORS: readonly AvatarColor[] = [
  { background: '#0066cc', foreground: '#ffffff' },
  { background: '#5856d6', foreground: '#ffffff' },
  { background: '#af52de', foreground: '#ffffff' },
  { background: '#ff2d55', foreground: '#ffffff' },
  { background: '#ff9500', foreground: '#ffffff' },
  { background: '#34c759', foreground: '#ffffff' },
  { background: '#32ade6', foreground: '#ffffff' },
  { background: '#a2845e', foreground: '#ffffff' },
]

const DEFAULT_AVATAR_COLOR: AvatarColor = {
  background: '#d2d2d7',
  foreground: '#ffffff',
}

function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }

  return Math.abs(hash)
}

export function getUserAvatarColor(username: string): AvatarColor {
  const seed = username.trim()

  if (!seed)
    return DEFAULT_AVATAR_COLOR

  return USER_AVATAR_COLORS[hashString(seed) % USER_AVATAR_COLORS.length] ?? DEFAULT_AVATAR_COLOR
}
