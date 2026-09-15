import Cookies from 'js-cookie'

const ACCESS_TOKEN_COOKIE = 'token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'

export function getAccessToken() {
  return Cookies.get(ACCESS_TOKEN_COOKIE)
}

export function getRefreshToken() {
  return Cookies.get(REFRESH_TOKEN_COOKIE)
}

export function setTokens(accessToken: string, refreshToken: string) {
  Cookies.set(ACCESS_TOKEN_COOKIE, accessToken, { sameSite: 'lax' })
  Cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, { sameSite: 'lax', expires: 7 })
}

export function clearTokens() {
  Cookies.remove(ACCESS_TOKEN_COOKIE)
  Cookies.remove(REFRESH_TOKEN_COOKIE)
}