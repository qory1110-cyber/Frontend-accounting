import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDeleteCustomer } from '@/hooks/use-customers'
import { getApiErrorMessage } from '@/lib/errors'

export function DeleteCustomerDialog({
  businessId,
  open,
  onOpenChange,
  customer,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: { id: string; name: string } | null
}) {
  const deleteCustomer = useDeleteCustomer(businessId)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!customer) return
    setError(null)
    try {
      await deleteCustomer.mutateAsync(customer.id)
      onOpenChange(false)
    } catch (err) {
      // Kemungkinan besar 409 kalau pelanggan sudah punya riwayat transaksi -
      // pesan dari backend sudah menyarankan pakai Inactive sebagai gantinya.
      setError(getApiErrorMessage(err, 'Gagal menghapus pelanggan'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Pelanggan?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Kamu akan menghapus <span className="font-medium text-foreground">{customer?.name}</span> secara
          permanen. Tindakan ini tidak bisa dibatalkan.
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
          <Button variant="destructive" onClick={handleDelete} disabled={deleteCustomer.isPending}>
            {deleteCustomer.isPending ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}