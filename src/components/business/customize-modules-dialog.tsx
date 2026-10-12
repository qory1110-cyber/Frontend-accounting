import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { hideableModules, moduleCategoryLabels, type ModuleCategory } from '@/config/menuConfig'
import { useUpdateBusiness } from '@/hooks/use-businesses'
import { getApiErrorMessage } from '@/lib/errors'
import type { HideableModule } from '@/hooks/use-businesses'

export function CustomizeModulesDialog({
  businessId,
  open,
  onOpenChange,
  currentHiddenModules,
}: {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  currentHiddenModules: string[]
}) {
  const updateBusiness = useUpdateBusiness(businessId)
  const [hidden, setHidden] = useState<string[]>(currentHiddenModules)
  const [serverError, setServerError] = useState<string | null>(null)

  // Sinkron ulang tiap kali dialog dibuka, supaya tidak membawa perubahan
  // yang belum disimpan dari sesi buka-tutup sebelumnya.
  useEffect(() => {
    if (open) {
      setHidden(currentHiddenModules)
      setServerError(null)
    }
  }, [open, currentHiddenModules])

  function toggle(moduleKey: string, visible: boolean) {
    setHidden((prev) => (visible ? prev.filter((k) => k !== moduleKey) : [...prev, moduleKey]))
  }

  async function handleSave() {
    setServerError(null)
    try {
      await updateBusiness.mutateAsync({ hiddenModules: hidden as HideableModule[] })
      onOpenChange(false)
    } catch (err) {
      setServerError(getApiErrorMessage(err, 'Gagal menyimpan pengaturan'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Sembunyikan modul yang tidak dipakai bisnis ini. Data yang sudah ada tetap tersimpan dan bisa
          dimunculkan kembali kapan saja.
        </p>

                <div className="flex flex-col gap-4">
          {(['sales', 'purchases', 'money'] as ModuleCategory[]).map((category) => {
            const itemsInCategory = hideableModules.filter((item) => item.category === category)
            if (itemsInCategory.length === 0) return null

            return (
              <div key={category} className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {moduleCategoryLabels[category]}
                </p>
                <div className="flex flex-col gap-3">
                  {itemsInCategory.map((item) => (
                    <div key={item.moduleKey} className="flex items-center justify-between">
                      <span className="text-sm">{item.label}</span>
                      <Switch
                        checked={!hidden.includes(item.moduleKey!)}
                        onCheckedChange={(checked) => toggle(item.moduleKey!, checked)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={updateBusiness.isPending}>
            {updateBusiness.isPending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}