import { client } from './generated-clients/accounting-client/client.gen'
import { env } from '@/env'
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/auth/tokens'
import { isTokenExpiringSoon } from '@/lib/auth/decode-jwt'

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise // single-flight

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearTokens()
      window.location.href = '/login'
      return null
    }

    try {
      const res = await fetch(`${env.VITE_API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) throw new Error('Refresh gagal')

      const json = await res.json()
      setTokens(json.data.accessToken, json.data.refreshToken)
      return json.data.accessToken as string
    } catch {
      clearTokens()
      window.location.href = '/login'
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export function setupApiClient() {
  client.setConfig({ baseUrl: env.VITE_API_URL })

  client.interceptors.request.use(async (request: Request) => {
    let token = getAccessToken()

    if (token && isTokenExpiringSoon(token)) {
      token = (await refreshAccessToken()) ?? token
    }

    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    return request
  })

  client.interceptors.response.use(async (response: Response, request: Request) => {
    if (response.status === 401) {
      const newToken = await refreshAccessToken()
      if (newToken) {
        request.headers.set('Authorization', `Bearer ${newToken}`)
        return fetch(request)
      }
    }
    return response
  })
}