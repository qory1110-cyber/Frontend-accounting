import { createFileRoute, Outlet } from '@tanstack/react-router'
import { BusinessSidebar } from '@/components/layout/business-sidebar'

export const Route = createFileRoute('/businesses/$businessId')({
  component: () => (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <BusinessSidebar />
      <div className="flex-1 p-6">
        <Outlet />
      </div>
    </div>
  ),
})