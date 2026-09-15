import { BusinessesPage } from '#/components/business/businesses-page'
import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/businesses/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div className="flex-1 p-6"><BusinessesPage></BusinessesPage></div>
}
