import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { LogOut, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChangePasswordDialog } from '@/components/change-password-dialog'

const API_BASE = 'http://localhost:8014/api/v1'

interface Business {
  id: string
  name: string
  role: 'admin' | 'accountant' | 'viewer'
}

interface CurrentUser {
  name: string
  email: string
}

async function authFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('accessToken')
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}

export function AppHeader() {
  const navigate = useNavigate()
  const params = useParams({ strict: false })
  const businessId = (params as { businessId?: string }).businessId

  const [businesses, setBusinesses] = useState<Business[]>([])
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  useEffect(() => {
    authFetch('/businesses')
      .then((res) => res.json())
      .then((json) => setBusinesses(json.data ?? []))
      .catch(() => setBusinesses([]))

    authFetch('/users/me')
      .then((res) => res.json())
      .then((json) => setUser(json.data ?? null))
      .catch(() => setUser(null))
  }, [])

  const currentBusiness = businesses.find((b) => b.id === businessId)

  function handleLogout() {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      authFetch('/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {})
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate({ to: '/login' })
  }

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b bg-background px-4">
        {/* Kiri: nama app + navigasi utama */}
        <nav className="flex items-center gap-1">
          <Link to="/" className="mr-3 text-sm font-semibold tracking-tight">
            Accounting
          </Link>

          <Link to="/businesses">
            {({ isActive }: { isActive: boolean }) => (
              <Button variant={isActive ? 'secondary' : 'ghost'} size="sm">
                Businesses
              </Button>
            )}
          </Link>

          {/* Users cuma relevan kalau sedang di dalam satu bisnis */}
          {/* {businessId && ( */}
            {/* <Link to="/businesses/$businessId/members" params={{ businessId }}> */}
            <Link to="/user" >

              {({ isActive }: { isActive: boolean }) => (
                <Button variant={isActive ? 'secondary' : 'ghost'} size="sm">
                  Users
                </Button>
              )}
            </Link>
          {/* )} */}

          {currentBusiness && (
            <Badge variant="outline" className="ml-2 font-normal">
              {currentBusiness.name}
              <span className="ml-1.5 text-muted-foreground">· {currentBusiness.role}</span>
            </Badge>
          )}
        </nav>

        {/* Kanan: identitas user + aksi akun */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.name ?? '...'}</span>

          <Button variant="ghost" size="sm" onClick={() => setChangePasswordOpen(true)}>
            <KeyRound className="mr-1.5 h-4 w-4" />
            Change Password
          </Button>

          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-1.5 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </>
  )
}