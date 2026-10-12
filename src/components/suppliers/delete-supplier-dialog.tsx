import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDeleteSupplier } from '@/hooks/use-suppliers'
import { getApiErrorMessage } from '@/lib/errors'

export function DeleteSupplierDialog({
  businessId,
  open,
  onOpenChange,
  supplier,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: { id: string; name: string } | null
}) {
  const deleteSupplier = useDeleteSupplier(businessId)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!supplier) return
    setError(null)
    try {
      await deleteSupplier.mutateAsync(supplier.id)
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal menghapus pemasok'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Pemasok?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Kamu akan menghapus <span className="font-medium text-foreground">{supplier?.name}</span> secara
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
          <Button variant="destructive" onClick={handleDelete} disabled={deleteSupplier.isPending}>
            {deleteSupplier.isPending ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}