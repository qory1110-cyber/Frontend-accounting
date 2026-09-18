import { createFileRoute } from '@tanstack/react-router'
import { ChartOfAccountsPage } from '@/components/chart-of-accounts/chart-of-accounts-page'

export const Route = createFileRoute('/businesses/$businessId/chart-of-accounts')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <ChartOfAccountsPage businessId={businessId} />
}