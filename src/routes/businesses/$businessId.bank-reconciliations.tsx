import { createFileRoute } from '@tanstack/react-router'
import { BankReconciliationsPage } from '@/components/bank-reconciliations/bank-reconciliations-page'

export const Route = createFileRoute('/businesses/$businessId/bank-reconciliations')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <BankReconciliationsPage businessId={businessId} />
}