import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDeleteBankReconciliation } from '@/hooks/use-bank-reconciliations'
import { getApiErrorMessage } from '@/lib/errors'

export function DeleteBankReconciliationDialog({
  businessId,
  open,
  onOpenChange,
  reconciliation,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  reconciliation: { id: string; label: string } | null
}) {
  const deleteMutation = useDeleteBankReconciliation(businessId)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!reconciliation) return
    setError(null)
    try {
      await deleteMutation.mutateAsync(reconciliation.id)
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal menghapus rekonsiliasi bank'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Rekonsiliasi Bank?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Menghapus <span className="font-medium text-foreground">{reconciliation?.label}</span> hanya menghapus
          lembar rekonsiliasinya. Tidak ada transaksi atau saldo yang berubah.
        </p>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}