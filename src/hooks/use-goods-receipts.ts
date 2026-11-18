import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listGoodsReceipts,
  createGoodsReceipt,
  updateGoodsReceipt,
  deleteGoodsReceipt,
} from '@/integrations/generated-clients/accounting-client'

export const goodsReceiptKeys = {
  list: (businessId: string) => ['businesses', businessId, 'goods-receipts'] as const,
}

export interface GoodsReceiptFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
}

export function useGoodsReceipts(
  businessId: string,
  page = 1,
  pageSize = 10,
  filters: GoodsReceiptFilters = {},
) {
  const { search, dateFrom, dateTo } = filters
  return useQuery({
    queryKey: [...goodsReceiptKeys.list(businessId), page, pageSize, search ?? '', dateFrom ?? '', dateTo ?? ''],
    queryFn: async () => {
      const res = await listGoodsReceipts({
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

interface GoodsReceiptLine {
  description: string
  qty: number
}

interface GoodsReceiptCreateValues {
  supplierId: string
  receiptDate: string
  reference?: string
  purchaseOrderId?: string
  purchaseInvoiceId?: string
  description?: string
  lines: GoodsReceiptLine[]
}

// Update: field opsional boleh null supaya bisa dikosongkan.
interface GoodsReceiptUpdateValues {
  supplierId?: string
  receiptDate?: string
  reference?: string | null
  purchaseOrderId?: string | null
  purchaseInvoiceId?: string | null
  description?: string | null
  lines?: GoodsReceiptLine[]
}

export function useCreateGoodsReceipt(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: GoodsReceiptCreateValues) => {
      const res = await createGoodsReceipt({ path: { businessId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.list(businessId) }),
  })
}

export function useUpdateGoodsReceipt(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      goodsReceiptId,
      ...body
    }: GoodsReceiptUpdateValues & { goodsReceiptId: string }) => {
      const res = await updateGoodsReceipt({ path: { businessId, goodsReceiptId }, body })
      if (res.error) throw res.error
      return res.data!.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.list(businessId) }),
  })
}

export function useDeleteGoodsReceipt(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (goodsReceiptId: string) => {
      const res = await deleteGoodsReceipt({ path: { businessId, goodsReceiptId } })
      if (res.error) throw res.error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goodsReceiptKeys.list(businessId) }),
  })
}