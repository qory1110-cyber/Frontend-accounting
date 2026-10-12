import { createFileRoute } from '@tanstack/react-router'
import { JournalEntriesPage } from '@/components/journal-entries/journal-entries-page'

export const Route = createFileRoute('/businesses/$businessId/journal-entries')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <JournalEntriesPage businessId={businessId} />
}