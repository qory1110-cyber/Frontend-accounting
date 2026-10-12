import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDeleteReceipt } from '@/hooks/use-receipts'
import { getApiErrorMessage } from '@/lib/errors'

export function DeleteReceiptDialog({
  businessId,
  open,
  onOpenChange,
  receipt,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  receipt: { id: string; reference: string } | null
}) {
  const deleteReceipt = useDeleteReceipt(businessId)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!receipt) return
    setError(null)
    try {
      await deleteReceipt.mutateAsync(receipt.id)
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal menghapus penerimaan'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Penerimaan?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Menghapus <span className="font-medium text-foreground">{receipt?.reference}</span> akan memposting
          jurnal pembalik dan mengembalikan sisa tagihan faktur terkait (kalau ada) ke jumlah semula. Tindakan ini
          tidak bisa dibatalkan.
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
          <Button variant="destructive" onClick={handleDelete} disabled={deleteReceipt.isPending}>
            {deleteReceipt.isPending ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}