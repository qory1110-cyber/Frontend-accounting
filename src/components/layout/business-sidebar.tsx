import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { Menu as MenuIcon, Settings } from 'lucide-react'
import { useBreakpoint } from '@/hooks/use-viewport'
import { useBusiness } from '@/hooks/use-businesses'
import { getVisibleMenu } from '@/config/menuConfig'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { MobileNavDrawer } from '../layout/mobile-nav-drawer'
import { CustomizeModulesDialog } from '../business/customize-modules-dialog'

export function BusinessSidebar() {
  const { businessId } = useParams({ from: '/businesses/$businessId' })
  const breakpoint = useBreakpoint()
  const [isOpen, setIsOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)

  const { data: business } = useBusiness(businessId)
  const menu = getVisibleMenu(business?.role, business?.hiddenModules)
  const isAdmin = business?.role === 'admin'

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
        <MobileNavDrawer
          open={isOpen}
          onClose={() => setIsOpen(false)}
          menu={menu}
          showCustomize={isAdmin}
          onCustomizeClick={() => setCustomizeOpen(true)}
        />
        {isAdmin && (
          <CustomizeModulesDialog
            businessId={businessId}
            open={customizeOpen}
            onOpenChange={setCustomizeOpen}
            currentHiddenModules={business?.hiddenModules ?? []}
          />
        )}
      </>
    )
  }

  const isTablet = breakpoint === 'tablet'

  return (
    <TooltipProvider delay={200}>
      <aside className="hidden md:flex md:w-16 lg:w-64 flex-col border-r bg-background">
        <div className="flex flex-1 flex-col gap-1 p-3">
          {!isTablet && business && (
            <div className="mb-3 px-2">
              <p className="truncate text-sm font-semibold">{business.name}</p>
              <Badge variant="outline" className="mt-1 font-normal">
                {business.role}
              </Badge>
            </div>
          )}

          {menu.map((item) => {
            const Icon = item.icon

            if (isTablet) {
              return (
                <Tooltip key={item.to}>
                  <TooltipTrigger
                    render={
                      <Link
                        to={item.to}
                        params={{ businessId }}
                        className="flex items-center justify-center rounded-md px-2 py-2 hover:bg-accent"
                        activeProps={{ className: 'bg-accent' }}
                      />
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                params={{ businessId }}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                activeProps={{ className: 'bg-accent font-medium' }}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                {item.label}
              </Link>
            )
          })}
        </div>

        {isAdmin && (
  <div className="border-t p-3">
    {isTablet ? (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={() => setCustomizeOpen(true)}
              className="flex w-full items-center justify-center rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            />
          }
        >
          <Settings className="h-4 w-4 shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="right">Customize</TooltipContent>
      </Tooltip>
    ) : (
      <button
        onClick={() => setCustomizeOpen(true)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Settings className="h-4 w-4 shrink-0" />
        Customize
      </button>
    )}
  </div>
)}

        {isAdmin && (
          <CustomizeModulesDialog
            businessId={businessId}
            open={customizeOpen}
            onOpenChange={setCustomizeOpen}
            currentHiddenModules={business?.hiddenModules ?? []}
          />
        )}
      </aside>
    </TooltipProvider>
  )
}