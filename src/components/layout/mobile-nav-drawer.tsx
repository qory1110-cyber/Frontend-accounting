import { Link } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import type { MenuItem } from '@/config/menuConfig'

export function MobileNavDrawer({
  open,
  onClose,
  menu,
  showCustomize,
  onCustomizeClick,
}: {
  open: boolean
  onClose: () => void
  menu: MenuItem[]
  showCustomize?: boolean
  onCustomizeClick?: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <nav className="relative flex h-full w-64 flex-col bg-background p-4 shadow-lg">
        <div className="flex flex-1 flex-col gap-1">
          {menu.map((item) => {
  const Icon = item.icon
  return (
    <Link
      key={item.to}
      to={item.to}
      onClick={onClose}
      className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent"
      activeProps={{ className: 'bg-accent font-medium' }}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      {item.label}
    </Link>
  )
})}
        </div>

        {showCustomize && (
          <button
            onClick={() => {
              onClose()
              onCustomizeClick?.()
            }}
            className="flex items-center gap-2 rounded-md border-t px-2 pt-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            Customize
          </button>
        )}
      </nav>
    </div>
  )
}