import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface PurchaseInvoiceLine {
  accountId: string
  accountName: string
  projectName?: string | null
  qty: string
  unitPrice: string
  subtotal: number
}

interface ViewingInvoice {
  id: string
  supplierName: string
  purchaseOrderReference?: string | null
  issueDate: string
  dueDate: string | null
  reference: string | null
  description: string | null
  status: 'draft' | 'approved' | 'void'
  lines: PurchaseInvoiceLine[]
  invoiceAmount: number
  balanceDue: number
  paymentStatus: 'Coming due' | 'Overdue' | 'Paid in full' | null
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function statusLabel(status: ViewingInvoice['status'], paymentStatus: ViewingInvoice['paymentStatus']) {
  if (status === 'draft') return 'Draft'
  if (status === 'void') return 'Void'
  return paymentStatus ?? 'Approved'
}

export function PurchaseInvoiceViewDialog({
  open,
  onOpenChange,
  invoice,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: ViewingInvoice | null
}) {
  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 wrap-break-word">{invoice.reference || 'Faktur Pembelian'}</span>
            <Badge variant={invoice.status === 'void' ? 'outline' : invoice.status === 'draft' ? 'secondary' : 'default'}>
              {statusLabel(invoice.status, invoice.paymentStatus)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Supplier</p>
              <p className="wrap-break-word font-medium">{invoice.supplierName}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Issue Date</p>
              <p className="font-medium">{invoice.issueDate}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Due Date</p>
              <p className="font-medium">{invoice.dueDate ?? '-'}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Reference</p>
              <p className="wrap-break-word font-medium">{invoice.reference ?? '-'}</p>
            </div>
            {invoice.purchaseOrderReference && (
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Order number</p>
                <p className="wrap-break-word font-medium">{invoice.purchaseOrderReference}</p>
              </div>
            )}
          </div>

          {invoice.description && (
            <div>
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap wrap-break-word">{invoice.description}</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs text-muted-foreground">Rincian</p>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-105 text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-normal">Account</th>
                    <th className="px-3 py-2 font-normal">Proyek</th>
                    <th className="px-3 py-2 text-right font-normal">Qty</th>
                    <th className="px-3 py-2 text-right font-normal">Unit Price</th>
                    <th className="px-3 py-2 text-right font-normal">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{line.accountName}</td>
                      <td className="px-3 py-2">{line.projectName ?? '-'}</td>
                      <td className="px-3 py-2 text-right">{line.qty}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(Number(line.unitPrice))}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(line.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-md bg-muted/30 p-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Amount</span>
              <span className="font-medium">{formatCurrency(invoice.invoiceAmount)}</span>
            </div>
            {invoice.status === 'approved' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balance Due</span>
                <span className="font-medium">{formatCurrency(invoice.balanceDue)}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}