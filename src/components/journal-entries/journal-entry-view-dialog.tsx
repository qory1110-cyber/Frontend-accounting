import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface JournalLine {
  accountCode: string
  accountName: string
  debit: number
  credit: number
  description: string | null
}

interface ViewingJournalEntry {
  reference: string | null
  entryDate: string
  description: string | null
  lines: JournalLine[]
  totalDebit: number
  totalCredit: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function JournalEntryViewDialog({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: ViewingJournalEntry | null
}) {
  if (!entry) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
            <DialogTitle className="wrap-break-word">{entry.reference ?? '(tanpa reference)'}</DialogTitle>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4 text-sm">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium">{entry.entryDate}</p>
          </div>

          {entry.description && (
            <div>
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="whitespace-pre-wrap wrap-break-word">{entry.description}</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs text-muted-foreground">Rincian</p>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-105 text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-normal">Account</th>
                    <th className="px-3 py-2 font-normal">Description</th>
                    <th className="px-3 py-2 text-right font-normal">Debit</th>
                    <th className="px-3 py-2 text-right font-normal">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.lines.map((line, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        {line.accountCode} · {line.accountName}
                      </td>
                      <td className="px-3 py-2">{line.description ?? '-'}</td>
                      <td className="px-3 py-2 text-right">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</td>
                      <td className="px-3 py-2 text-right">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-medium">
                    <td className="px-3 py-2" colSpan={2}>
                      Total
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(entry.totalDebit)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(entry.totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}