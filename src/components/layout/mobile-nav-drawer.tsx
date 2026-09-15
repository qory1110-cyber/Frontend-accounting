import { Link } from '@tanstack/react-router'
import type { MenuItem } from '@/config/menuConfig'

export function MobileNavDrawer({
  open,
  onClose,
  menu,
}: {
  open: boolean
  onClose: () => void
  menu: MenuItem[]
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <nav className="relative flex h-full w-64 flex-col gap-1 bg-background p-4 shadow-lg">
        {menu.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClose}
            className="rounded-md px-2 py-2 text-sm hover:bg-accent"
            activeProps={{ className: 'bg-accent font-medium' }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}