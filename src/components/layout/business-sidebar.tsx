import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { Menu as MenuIcon } from 'lucide-react'
import { useBreakpoint } from '@/hooks/use-viewport'
import { useBusiness } from '@/hooks/use-businesses'
import { getVisibleMenu } from '@/config/menuConfig'
import { Badge } from '@/components/ui/badge'
import { MobileNavDrawer } from './mobile-nav-drawer'

export function BusinessSidebar() {
  const { businessId } = useParams({ from: '/businesses/$businessId' })
  const breakpoint = useBreakpoint()
  const [isOpen, setIsOpen] = useState(false)

  const { data: business } = useBusiness(businessId)
  const menu = getVisibleMenu(business?.role)

  if (breakpoint === 'mobile') {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 md:hidden"
          aria-label="Buka menu navigasi"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <MobileNavDrawer open={isOpen} onClose={() => setIsOpen(false)} menu={menu} />
      </>
    )
  }

  const isTablet = breakpoint === 'tablet'

  return (
    <aside className="hidden md:flex md:w-16 lg:w-64 flex-col border-r bg-background">
      <div className="flex flex-col gap-1 p-3">
        {!isTablet && business && (
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-semibold">{business.name}</p>
            <Badge variant="outline" className="mt-1 font-normal">
              {business.role}
            </Badge>
          </div>
        )}

        {menu.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            params={{ businessId }}
            className="rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            activeProps={{ className: 'bg-accent font-medium' }}
          >
            {isTablet ? item.label[0] : item.label}
          </Link>
        ))}
      </div>
    </aside>
  )
}