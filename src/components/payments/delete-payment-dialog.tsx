import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDeletePayment } from '@/hooks/use-payments'
import { getApiErrorMessage } from '@/lib/errors'

export function DeletePaymentDialog({
  businessId,
  open,
  onOpenChange,
  payment,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: { id: string; reference: string } | null
}) {
  const deletePayment = useDeletePayment(businessId)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!payment) return
    setError(null)
    try {
      await deletePayment.mutateAsync(payment.id)
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal menghapus pembayaran'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Pembayaran?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Menghapus <span className="font-medium text-foreground">{payment?.reference}</span> akan memposting
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
          <Button variant="destructive" onClick={handleDelete} disabled={deletePayment.isPending}>
            {deletePayment.isPending ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}