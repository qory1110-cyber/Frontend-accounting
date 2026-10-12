import { createFileRoute } from '@tanstack/react-router'
import { BankAccountsPage } from '@/components/bank-accounts/bank-accounts-page'

export const Route = createFileRoute('/businesses/$businessId/bank-accounts')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <BankAccountsPage businessId={businessId} />
}