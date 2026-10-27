import { createFileRoute } from '@tanstack/react-router'
import { ProjectsPage } from '@/components/projects/projects-page'

export const Route = createFileRoute('/businesses/$businessId/projects')({
  component: RouteComponent,
})

function RouteComponent() {
  const { businessId } = Route.useParams()
  return <ProjectsPage businessId={businessId} />
}   