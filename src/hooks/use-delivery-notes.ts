import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listDeliveryNotes,
  createDeliveryNote,
  updateDeliveryNote,
  deleteDeliveryNote,
} from '@/integrations/generated-clients/accounting-client'

export const deliveryNoteKeys = {
  list: (businessId: string) => ['businesses', businessId, 'delivery-notes'] as const,
}

export interface DeliveryNoteFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
}

export function useDeliveryNotes(
  businessId: string,
  page = 1,
  pageSize = 10,
  filters: DeliveryNoteFilters = {},
) {
  const { search, dateFrom, dateTo } = filters
  return useQuery({
    queryKey: [...deliveryNoteKeys.list(businessId), page, pageSize, search ?? '', dateFrom ?? '', dateTo ?? ''],
    queryFn: async () => {
      const res = await listDeliveryNotes({
        path: { businessId },
        query: {
          page,
          pageSize,
          search: search || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      })
      if (res.error) throw res.error
      return { data: res.data!.data, pagination: res.data!.pagination }
    },
    enabled: !!businessId,
  })
}

interface DeliveryNoteLine {
  description: string
  qty: number
}

interface DeliveryNoteCreateValues {
  customerId: string
  deliveryDate: string
  reference?: string
  salesOrderId?: string
  salesInvoiceId?: string
  deliveryAddress?: string
  description?: string
  lines: DeliveryNoteLine[]
}

// Update: field opsional boleh null supaya bisa dikosongkan.
interface DeliveryNoteUpdateValues {
  customerId?: string
  deliveryDate?: string
  reference?: string | null
  salesOrderId?: string | null
  salesInvoiceId?: string | null
  deliveryAddress?: string | null
  description?: string | null
  lines?: DeliveryNoteLine[]
}

export function useCreateDeliveryNote(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: DeliveryNoteCreateValues) => {
      const res = await createDeliveryNote({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryNoteKeys.list(businessId) }),
  })
}

export function useUpdateDeliveryNote(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      deliveryNoteId,
      ...body
    }: DeliveryNoteUpdateValues & { deliveryNoteId: string }) => {
      const res = await updateDeliveryNote({ path: { businessId, deliveryNoteId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryNoteKeys.list(businessId) }),
  })
}

export function useDeleteDeliveryNote(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (deliveryNoteId: string) => {
      const res = await deleteDeliveryNote({ path: { businessId, deliveryNoteId } })
      if (res.error) throw res.error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: deliveryNoteKeys.list(businessId) }),
  })
}