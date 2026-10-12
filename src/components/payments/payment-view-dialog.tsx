import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface PaymentLine {
  accountId: string
  accountName: string
  purchaseInvoiceId: string | null
  purchaseInvoiceReference: string | null
  amount: string
}

interface ViewingPayment {
  reference: string
  paymentDate: string
  paidFromBankAccountName: string
  payeeContactName: string
  description: string | null
  cleared: boolean
  lines: PaymentLine[]
  totalAmount: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function PaymentViewDialog({
  open,
  onOpenChange,
  payment,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: ViewingPayment | null
}) {
  if (!payment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="wrap-break-word">{payment.reference}</span>
            <Badge variant={payment.cleared ? 'default' : 'secondary'}>
              {payment.cleared ? 'Cleared' : 'Uncleared'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">{payment.paymentDate}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Paid from</p>
              <p className="wrap-break-word font-medium">{payment.paidFromBankAccountName}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Payee</p>
              <p className="wrap-break-word font-medium">{payment.payeeContactName}</p>
            </div>
          </div>

          {payment.description && (
            <div>
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap wrap-break-word">{payment.description}</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs text-muted-foreground">Rincian</p>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-105 text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-normal">Account</th>
                    <th className="px-3 py-2 font-normal">Purchase Invoice</th>
                    <th className="px-3 py-2 text-right font-normal">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payment.lines.map((line, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{line.accountName}</td>
                      <td className="px-3 py-2">{line.purchaseInvoiceReference ?? '-'}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(Number(line.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between rounded-md bg-muted/30 p-3">
            <span className="text-muted-foreground">Total Amount</span>
            <span className="font-medium">{formatCurrency(payment.totalAmount)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}