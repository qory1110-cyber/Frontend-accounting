import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Users, Truck, Landmark, BookOpen, FileText, Receipt as ReceiptIcon, Banknote, ArrowLeftRight } from 'lucide-react'
import { useBusiness } from '@/hooks/use-businesses'
import { useCustomers } from '@/hooks/use-customers'
import { useSuppliers } from '@/hooks/use-suppliers'
import { useBankAccounts } from '@/hooks/use-bank-accounts'
import { useChartOfAccounts } from '@/hooks/use-chart-of-accounts'
import { useSalesInvoices, useSalesInvoiceTotals } from '@/hooks/use-sales-invoices'
import { usePurchaseInvoices, usePurchaseInvoiceTotals } from '@/hooks/use-purchase-invoices'
import { useReceipts, useReceiptTotals } from '@/hooks/use-receipts'
import { usePayments, usePaymentTotals } from '@/hooks/use-payments'
import { useInterAccountTransfers } from '@/hooks/use-inter-account-transfers'
import { BusinessLockCard } from '@/components/business/business-lock-card'

export const Route = createFileRoute('/businesses/$businessId/')({
  component: OverviewPage,
})

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function SummaryCard({
  icon: Icon,
  title,
  lines,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  lines: { label: string; value: string }[]
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 rounded-lg border bg-background p-4 text-left transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="flex flex-col gap-1">
        {lines.map((line) => (
          <div key={line.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{line.label}</span>
            <span className="font-medium">{line.value}</span>
          </div>
        ))}
      </div>
    </button>
  )
}

function OverviewPage() {
  const { businessId } = Route.useParams()
  const navigate = useNavigate()

  const { data: business } = useBusiness(businessId)
  const hiddenModules = business?.hiddenModules ?? []

  // pageSize 100: dipakai sekadar menghitung JUMLAH baris, bukan total uang.
  const { data: customersData } = useCustomers(businessId, 1, 100)
  const customers = customersData?.data
  const { data: suppliersData } = useSuppliers(businessId, 1, 100)
  const suppliers = suppliersData?.data
  const { data: bankAccountsData } = useBankAccounts(businessId, 1, 100)
  const bankAccounts = bankAccountsData?.data
  const { data: chartOfAccounts } = useChartOfAccounts(businessId)
  const { data: salesInvoicesData } = useSalesInvoices(businessId, 1, 100)
  const salesInvoices = salesInvoicesData?.data
  const { data: purchaseInvoicesData } = usePurchaseInvoices(businessId, 1, 100)
  const purchaseInvoices = purchaseInvoicesData?.data
  const { data: receiptsData } = useReceipts(businessId, 1, 100)
  const receipts = receiptsData?.data
  const { data: paymentsData } = usePayments(businessId, 1, 100)
  const payments = paymentsData?.data
  const { data: transfersData } = useInterAccountTransfers(businessId, 1, 100)
  const transfers = transfersData?.data

  // Angka uang agregat dari endpoint totals (seluruh data, tidak dibatasi 100).
  const { data: salesTotals } = useSalesInvoiceTotals(businessId)
  const { data: purchaseTotals } = usePurchaseInvoiceTotals(businessId)
  const { data: receiptTotals } = useReceiptTotals(businessId)
  const { data: paymentTotals } = usePaymentTotals(businessId)

  const activeCustomers = (customers ?? []).filter((c) => c.isActive)
  const activeSuppliers = (suppliers ?? []).filter((s) => s.isActive)
  const activeBankAccounts = (bankAccounts ?? []).filter((a) => a.isActive)
  const totalActualBalance = activeBankAccounts.reduce((sum, a) => sum + a.actualBalance, 0)

  const outstandingSales = (salesInvoices ?? []).filter((i) => i.status === 'sent' && i.balanceDue > 0)
  const outstandingPurchases = (purchaseInvoices ?? []).filter((i) => i.status === 'approved' && i.balanceDue > 0)

  function go(path: string) {
    navigate({ to: path, params: { businessId } })
  }

  function isHidden(moduleKey: string) {
    return hiddenModules.includes(moduleKey)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-4 text-lg font-semibold">Overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {!isHidden('customers') && (
          <SummaryCard
            icon={Users}
            title="Customers"
            lines={[
              { label: 'Active', value: String(activeCustomers.length) },
              { label: 'Total Receivable', value: formatCurrency(salesTotals?.totalBalanceDue ?? 0) },
            ]}
            onClick={() => go('/businesses/$businessId/customers')}
          />
        )}
        {!isHidden('suppliers') && (
          <SummaryCard
            icon={Truck}
            title="Suppliers"
            lines={[
              { label: 'Active', value: String(activeSuppliers.length) },
              { label: 'Total Payable', value: formatCurrency(purchaseTotals?.totalBalanceDue ?? 0) },
            ]}
            onClick={() => go('/businesses/$businessId/suppliers')}
          />
        )}
        {!isHidden('bank-accounts') && (
          <SummaryCard
            icon={Landmark}
            title="Bank and Cash Accounts"
            lines={[
              { label: 'Active accounts', value: String(activeBankAccounts.length) },
              { label: 'Total balance', value: formatCurrency(totalActualBalance) },
            ]}
            onClick={() => go('/businesses/$businessId/bank-accounts')}
          />
        )}
                {!isHidden('inter-account-transfers') && (
          <SummaryCard
            icon={ArrowLeftRight}
            title="Inter Account Transfers"
            lines={[{ label: 'Total recorded', value: String((transfers ?? []).length) }]}
            onClick={() => go('/businesses/$businessId/inter-account-transfers')}
          />
        )}
        <SummaryCard
          icon={BookOpen}
          title="Chart of Accounts"
          lines={[{ label: 'Total accounts', value: String((chartOfAccounts ?? []).length) }]}
          onClick={() => go('/businesses/$businessId/chart-of-accounts')}
        />
        {!isHidden('sales-invoices') && (
          <SummaryCard
            icon={FileText}
            title="Sales Invoices"
            lines={[
              { label: 'Outstanding', value: String(outstandingSales.length) },
              { label: 'Balance due', value: formatCurrency(salesTotals?.totalBalanceDue ?? 0) },
            ]}
            onClick={() => go('/businesses/$businessId/sales-invoices')}
          />
        )}
        {!isHidden('purchase-invoices') && (
          <SummaryCard
            icon={FileText}
            title="Purchase Invoices"
            lines={[
              { label: 'Outstanding', value: String(outstandingPurchases.length) },
              { label: 'Balance due', value: formatCurrency(purchaseTotals?.totalBalanceDue ?? 0) },
            ]}
            onClick={() => go('/businesses/$businessId/purchase-invoices')}
          />
        )}
        {!isHidden('receipts') && (
          <SummaryCard
            icon={ReceiptIcon}
            title="Receipts"
            lines={[
              { label: 'Total recorded', value: String((receipts ?? []).length) },
              { label: 'Total amount', value: formatCurrency(receiptTotals?.totalAmount ?? 0) },
            ]}
            onClick={() => go('/businesses/$businessId/receipts')}
          />
        )}
        {!isHidden('payments') && (
          <SummaryCard
            icon={Banknote}
            title="Payments"
            lines={[
              { label: 'Total recorded', value: String((payments ?? []).length) },
              { label: 'Total amount', value: formatCurrency(paymentTotals?.totalAmount ?? 0) },
            ]}
            onClick={() => go('/businesses/$businessId/payments')}
          />
        )}
      </div>

      <BusinessLockCard
        businessId={businessId}
        isAdmin={business?.role === 'admin'}
        lockDate={business?.lockDate ?? null}
      />
    </div>
  )
}