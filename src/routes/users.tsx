import { createFileRoute, redirect } from '@tanstack/react-router'
import { AppHeader } from '@/components/header'
import { getAccessToken } from '@/lib/auth/tokens'
import { UsersPage } from '@/components/user/users-page'

export const Route = createFileRoute('/users')({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: '/login' })
    }
  },
  component: () => (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 bg-muted/20 p-6">
        <UsersPage />
      </main>
    </div>
  ),
})