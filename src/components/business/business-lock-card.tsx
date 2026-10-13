import { useState } from 'react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSetBusinessLockDate } from '@/hooks/use-businesses'
import { getApiErrorMessage } from '@/lib/errors'

type Props = {
  businessId: string
  isAdmin: boolean
  lockDate: string | null
}

export function BusinessLockCard({ businessId, isAdmin, lockDate }: Props) {
  const mutation = useSetBusinessLockDate(businessId)
  const [value, setValue] = useState(lockDate ?? '')
  const [error, setError] = useState<string | null>(null)

  async function save(next: string | null) {
    setError(null)
    try {
      await mutation.mutateAsync(next)
      setValue(next ?? '')
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="mt-6 rounded-lg border p-4">
      <h2 className="text-base font-semibold">Kunci periode</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {lockDate ? `Terkunci sampai ${lockDate}` : 'Belum ada periode yang dikunci.'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Transaksi bertanggal pada atau sebelum tanggal kunci tidak bisa dibuat atau dihapus.
        Jika rekening bank punya tanggal kunci sendiri, yang berlaku adalah yang paling akhir.
      </p>

      {isAdmin && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="w-44"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button
            disabled={mutation.isPending || !value}
            onClick={() => save(value)}
          >
            Simpan
          </Button>
          <Button
            variant="outline"
            disabled={mutation.isPending || !lockDate}
            onClick={() => save(null)}
          >
            Buka Kunci
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}