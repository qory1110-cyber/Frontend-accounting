import { useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { KeyRound, LogOut, Menu as MenuIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChangePasswordDialog } from '@/components/change-password-dialog'
import { useMe, useLogout } from '@/hooks/use-auth'
import { useBusinessesList } from '@/hooks/use-businesses'

export function AppHeader() {
  const navigate = useNavigate()
  const params = useParams({ strict: false })
  const businessId = (params as { businessId?: string }).businessId

  const { data: businesses } = useBusinessesList()
  const { data: user } = useMe()
  const logout = useLogout()
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  const currentBusiness = businesses?.find((b) => b.id === businessId)

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b bg-background px-3 md:px-4">
        {/* Kiri: logo selalu terlihat, nav item disembunyikan di mobile */}
        <nav className="flex min-w-0 items-center gap-1">
          <Link to="/" className="mr-1 shrink-0 text-sm font-semibold tracking-tight md:mr-3">
            Accounting
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <Link to="/businesses">
              {({ isActive }: { isActive: boolean }) => (
                <Button variant={isActive ? 'secondary' : 'ghost'} size="sm">
                  Businesses
                </Button>
              )}
            </Link>

            <Link to="/user">
              {({ isActive }: { isActive: boolean }) => (
                <Button variant={isActive ? 'secondary' : 'ghost'} size="sm">
                  Users
                </Button>
              )}
            </Link>
          </div>

          {currentBusiness && (
            <Badge variant="outline" className="ml-2 hidden truncate font-normal md:inline-flex">
              {currentBusiness.name}
              <span className="ml-1.5 text-muted-foreground">· {currentBusiness.role}</span>
            </Badge>
          )}
        </nav>

        {/* Kanan (desktop, >=768px): semua item terlihat langsung */}
        <div className="hidden items-center gap-3 md:flex">
          <span className="text-sm text-muted-foreground">{user?.name ?? '...'}</span>

          <Button variant="ghost" size="sm" onClick={() => setChangePasswordOpen(true)}>
            <KeyRound className="mr-1.5 h-4 w-4" />
            Change Password
          </Button>

          <Button variant="ghost" size="sm" onClick={() => logout.mutate()}>
            <LogOut className="mr-1.5 h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Kanan (mobile, <768px): dipadatkan jadi satu menu hamburger */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger
  className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
  aria-label="Buka menu"
>
  <MenuIcon className="h-5 w-5" />
</DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{user?.name ?? 'Memuat...'}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => navigate({ to: '/businesses' })}>
                  Businesses
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate({ to: '/user' })}>
                  Users
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => setChangePasswordOpen(true)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => logout.mutate()}
                  variant="destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuGroup>
              {currentBusiness && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-1.5 py-1 text-xs text-muted-foreground">
                    {currentBusiness.name} · {currentBusiness.role}
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </>
  )
}