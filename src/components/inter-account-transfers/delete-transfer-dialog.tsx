import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDeleteInterAccountTransfer } from '@/hooks/use-inter-account-transfers'
import { getApiErrorMessage } from '@/lib/errors'

export function DeleteTransferDialog({
  businessId,
  open,
  onOpenChange,
  transfer,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  transfer: { id: string; reference: string } | null
}) {
  const deleteTransfer = useDeleteInterAccountTransfer(businessId)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!transfer) return
    setError(null)
    try {
      await deleteTransfer.mutateAsync(transfer.id)
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal menghapus transfer'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Transfer?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Menghapus <span className="font-medium text-foreground">{transfer?.reference}</span> akan memposting
          jurnal pembalik dan mengembalikan saldo kedua akun bank seperti sebelum transfer. Tindakan ini tidak bisa
          dibatalkan.
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
          <Button variant="destructive" onClick={handleDelete} disabled={deleteTransfer.isPending}>
            {deleteTransfer.isPending ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}