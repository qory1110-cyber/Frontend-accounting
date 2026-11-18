import { createFileRoute } from '@tanstack/react-router'
import { DebitNotesPage } from '@/components/debit-notes/debit-notes-page'

export const Route = createFileRoute('/businesses/$businessId/debit-notes')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <DebitNotesPage businessId={businessId} />
}
