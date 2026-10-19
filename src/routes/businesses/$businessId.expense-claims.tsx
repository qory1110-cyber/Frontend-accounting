import { createFileRoute } from '@tanstack/react-router'
import { ExpenseClaimsPage } from '@/components/expense-claims/expense-claims-page'

export const Route = createFileRoute('/businesses/$businessId/expense-claims')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <ExpenseClaimsPage businessId={businessId} />
}