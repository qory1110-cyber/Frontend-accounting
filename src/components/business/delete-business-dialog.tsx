import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDeleteBusiness } from '@/hooks/use-businesses'
import { getApiErrorMessage } from '@/lib/errors'

export function DeleteBusinessDialog({
  businessId,
  businessName,
  open,
  onOpenChange,
}: {
  businessId: string
  businessName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const deleteBusiness = useDeleteBusiness(businessId)
  const [typedName, setTypedName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const canDelete = typedName === businessName

  async function handleDelete() {
  setError(null)
  try {
    await deleteBusiness.mutateAsync(typedName)
    onOpenChange(false)
    navigate({ to: '/businesses' })
  } catch (err) {
    setError(getApiErrorMessage(err, 'Gagal menghapus bisnis'))
  }
} 

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setTypedName('') }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Bisnis "{businessName}"?</DialogTitle>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertDescription>
            Tindakan ini PERMANEN. Semua data di bisnis ini — Chart of Accounts, Customers, Suppliers, dan
            data lainnya — akan hilang total dan TIDAK BISA dikembalikan.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-name">
            Ketik <span className="font-mono font-semibold">{businessName}</span> untuk konfirmasi
          </Label>
          <Input
            id="confirm-name"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            autoComplete="off"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!canDelete || deleteBusiness.isPending}>
            {deleteBusiness.isPending ? 'Menghapus...' : 'Hapus Permanen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}