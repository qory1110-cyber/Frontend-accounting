import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ViewingTransfer {
  reference: string
  transferDate: string
  description: string | null
  paidFromBankAccountName: string
  receivedInBankAccountName: string
  amount: number
  paidFromCleared: boolean
  receivedInCleared: boolean
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function ClearedBadge({ cleared }: { cleared: boolean }) {
  return <Badge variant={cleared ? 'default' : 'secondary'}>{cleared ? 'Cleared' : 'Uncleared'}</Badge>
}

export function TransferViewDialog({
  open,
  onOpenChange,
  transfer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transfer: ViewingTransfer | null
}) {
  if (!transfer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="wrap-break-word">{transfer.reference}</DialogTitle>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium">{transfer.transferDate}</p>
          </div>

          {transfer.description && (
            <div>
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap wrap-break-word">{transfer.description}</p>
            </div>
          )}

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-95 text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-normal">Account</th>
                  <th className="px-3 py-2 font-normal">Status</th>
                  <th className="px-3 py-2 text-right font-normal">Outflows</th>
                  <th className="px-3 py-2 text-right font-normal">Inflows</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2">
                    <span className="text-xs text-muted-foreground">Paid from</span>
                    <br />
                    {transfer.paidFromBankAccountName}
                  </td>
                  <td className="px-3 py-2">
                    <ClearedBadge cleared={transfer.paidFromCleared} />
                  </td>
                  <td className="px-3 py-2 text-right">{formatCurrency(transfer.amount)}</td>
                  <td className="px-3 py-2 text-right">-</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">
                    <span className="text-xs text-muted-foreground">Received in</span>
                    <br />
                    {transfer.receivedInBankAccountName}
                  </td>
                  <td className="px-3 py-2">
                    <ClearedBadge cleared={transfer.receivedInCleared} />
                  </td>
                  <td className="px-3 py-2 text-right">-</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(transfer.amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}