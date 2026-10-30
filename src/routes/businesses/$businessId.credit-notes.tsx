import { createFileRoute } from '@tanstack/react-router'
import { CreditNotesPage } from '@/components/credit-notes/credit-notes-page'

export const Route = createFileRoute('/businesses/$businessId/credit-notes')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <CreditNotesPage businessId={businessId} />
}