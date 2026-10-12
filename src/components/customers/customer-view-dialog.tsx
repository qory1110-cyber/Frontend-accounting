import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ViewingCustomer {
  name: string
  code: string | null
  creditLimit: string
  billingAddress: string | null
  deliveryAddress: string | null
  email: string | null
  autofillSalesInvoiceDueDate: boolean
  isActive: boolean
  accountsReceivable: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function CustomerViewDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: ViewingCustomer | null
}) {
  if (!customer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 wrap-break-word">{customer.name}</span>
            <Badge variant={customer.isActive ? 'default' : 'outline'}>
              {customer.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Code</p>
              <p className="font-medium">{customer.code ?? '-'}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="wrap-break-word font-medium">{customer.email ?? '-'}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Billing Address</p>
            <p className="whitespace-pre-wrap">{customer.billingAddress ?? '-'}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Delivery Address</p>
            <p className="whitespace-pre-wrap">{customer.deliveryAddress ?? '-'}</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">Autofill Sales Invoice Due Date</p>
            <p className="font-medium">{customer.autofillSalesInvoiceDueDate ? 'Ya' : 'Tidak'}</p>
          </div>

          <div className="flex flex-col gap-1 rounded-md bg-muted/30 p-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Credit Limit</span>
              <span className="font-medium">{formatCurrency(Number(customer.creditLimit))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accounts Receivable</span>
              <span className="font-medium">{formatCurrency(customer.accountsReceivable)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}