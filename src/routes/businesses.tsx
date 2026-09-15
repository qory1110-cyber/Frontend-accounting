import { AppHeader } from '@/components/header'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { BusinessesPage } from '@/components/business/businesses-page'
import { getAccessToken } from '#/lib/auth/tokens'

export const Route = createFileRoute('/businesses')({
  beforeLoad: () => {
    if (!getAccessToken) {
      throw redirect({ to: '/login' })
    }
  },
  component: () => (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 bg-muted/20 p-6">
        <Outlet />
      </main>
    </div>
  ),
})