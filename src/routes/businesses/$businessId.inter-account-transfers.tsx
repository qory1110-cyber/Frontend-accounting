import { createFileRoute } from '@tanstack/react-router'
import { TransfersPage } from '@/components/inter-account-transfers/transfers-page'

export const Route = createFileRoute('/businesses/$businessId/inter-account-transfers')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <TransfersPage businessId={businessId} />
}