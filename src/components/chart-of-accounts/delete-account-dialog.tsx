import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDeleteChartOfAccount } from '@/hooks/use-chart-of-accounts'
import { getApiErrorMessage } from '@/lib/errors'

export function DeleteAccountDialog({
  businessId,
  open,
  onOpenChange,
  account,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  account: { id: string; name: string } | null
}) {
  const deleteAccount = useDeleteChartOfAccount(businessId)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!account) return
    setError(null)
    try {
      await deleteAccount.mutateAsync(account.id)
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal menghapus akun'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Akun?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Kamu akan menghapus <span className="font-medium text-foreground">{account?.name}</span> secara
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
          <Button variant="destructive" onClick={handleDelete} disabled={deleteAccount.isPending}>
            {deleteAccount.isPending ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}