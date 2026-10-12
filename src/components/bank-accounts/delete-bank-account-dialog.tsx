import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDeleteBankAccount } from '@/hooks/use-bank-accounts'
import { getApiErrorMessage } from '@/lib/errors'

export function DeleteBankAccountDialog({
  businessId,
  open,
  onOpenChange,
  bankAccount,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  bankAccount: { id: string; name: string } | null
}) {
  const deleteBankAccount = useDeleteBankAccount(businessId)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!bankAccount) return
    setError(null)
    try {
      await deleteBankAccount.mutateAsync(bankAccount.id)
      onOpenChange(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Gagal menghapus akun'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Akun Bank/Kas?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Kamu akan menghapus <span className="font-medium text-foreground">{bankAccount?.name}</span> secara
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
          <Button variant="destructive" onClick={handleDelete} disabled={deleteBankAccount.isPending}>
            {deleteBankAccount.isPending ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}