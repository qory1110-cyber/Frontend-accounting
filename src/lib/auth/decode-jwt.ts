interface JwtPayload {
  exp: number // Unix timestamp, detik
}

export function getTokenExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload
    return payload.exp * 1000
  } catch {
    return null
  }
}

export function isTokenExpiringSoon(token: string, thresholdMs = 60_000): boolean {
  const expiry = getTokenExpiryMs(token)
  if (!expiry) return true
  return expiry - Date.now() < thresholdMs
}