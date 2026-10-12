import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ViewingSupplier {
  name: string
  code: string | null
  creditLimit: string
  address: string | null
  email: string | null
  isActive: boolean
  accountsPayable: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function SupplierViewDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: ViewingSupplier | null
}) {
  if (!supplier) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 wrap-break-word">{supplier.name}</span>
            <Badge variant={supplier.isActive ? 'default' : 'outline'}>
              {supplier.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Code</p>
              <p className="font-medium">{supplier.code ?? '-'}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="wrap-break-word font-medium">{supplier.email ?? '-'}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Address</p>
            <p className="whitespace-pre-wrap">{supplier.address ?? '-'}</p>
          </div>

          <div className="flex flex-col gap-1 rounded-md bg-muted/30 p-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Credit Limit</span>
              <span className="font-medium">{formatCurrency(Number(supplier.creditLimit))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accounts Payable</span>
              <span className="font-medium">{formatCurrency(supplier.accountsPayable)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}