import type { ComponentType } from 'react'
import {
  LayoutDashboard,
  Users,
  Truck,
  Landmark,
  BookOpen,
  UserCog,
  FileText,
  FileSpreadsheet,
  ClipboardList,
  Receipt as ReceiptIcon,
  Banknote,
  ArrowLeftRight,
  Scale,
  BookOpenText,
  Wallet,
} from 'lucide-react'

export type BusinessRole = 'admin' | 'accountant' | 'viewer'

export type ModuleCategory = 'sales' | 'purchases' | 'money'

export const moduleCategoryLabels: Record<ModuleCategory, string> = {
  sales: 'Sales',
  purchases: 'Purchases',
  money: 'Money Accounts',
}

// Kunci ini harus sama persis dengan HideableModuleSchema di backend
// (src/schemas/Business.ts) - dipakai mencocokkan terhadap hiddenModules
// milik bisnis. Item tanpa moduleKey (Overview, Chart of Accounts, Members)
// tidak bisa disembunyikan lewat Customize.
export interface MenuItem {
  label: string
  to: string
  allowedRoles?: BusinessRole[] // kosong/tidak diisi = semua role boleh lihat
  moduleKey?: string
  category?: ModuleCategory
  icon: ComponentType<{ className?: string }>
}

export const businessSidebarMenu: MenuItem[] = [
  { label: 'Overview', to: '/businesses/$businessId', icon: LayoutDashboard },
  { label: 'Customers', to: '/businesses/$businessId/customers', moduleKey: 'customers', category: 'sales', icon: Users },
  { label: 'Sales Invoices', to: '/businesses/$businessId/sales-invoices', moduleKey: 'sales-invoices', category: 'sales', icon: FileText },
  { label: 'Receipts', to: '/businesses/$businessId/receipts', moduleKey: 'receipts', category: 'sales', icon: ReceiptIcon },
  { label: 'Suppliers', to: '/businesses/$businessId/suppliers', moduleKey: 'suppliers', category: 'purchases', icon: Truck },
  { label: 'Purchase Orders', to: '/businesses/$businessId/purchase-orders', category: 'purchases', icon: ClipboardList },
  { label: 'Purchase Invoices', to: '/businesses/$businessId/purchase-invoices', moduleKey: 'purchase-invoices', category: 'purchases', icon: FileSpreadsheet },
  { label: 'Expense Claims', to: '/businesses/$businessId/expense-claims', category: 'purchases', icon: Wallet },
  { label: 'Payments', to: '/businesses/$businessId/payments', moduleKey: 'payments', category: 'purchases', icon: Banknote },
  { label: 'Bank and Cash Accounts', to: '/businesses/$businessId/bank-accounts', moduleKey: 'bank-accounts', category: 'money', icon: Landmark },
  { label: 'Inter Account Transfers', to: '/businesses/$businessId/inter-account-transfers', moduleKey: 'inter-account-transfers', category: 'money', icon: ArrowLeftRight },
  { label: 'Bank Reconciliations', to: '/businesses/$businessId/bank-reconciliations', category: 'money', icon: Scale },
  { label: 'Journal Entries', to: '/businesses/$businessId/journal-entries', icon: BookOpenText },
  { label: 'Chart of Accounts', to: '/businesses/$businessId/chart-of-accounts', allowedRoles: ['admin', 'accountant'], icon: BookOpen },
  { label: 'Members', to: '/businesses/$businessId/members', allowedRoles: ['admin', 'accountant'], icon: UserCog },
]

// Daftar untuk dialog Customize - cuma yang punya moduleKey.
export const hideableModules = businessSidebarMenu.filter((item) => item.moduleKey)

export function getVisibleMenu(role: BusinessRole | undefined, hiddenModules: string[] = []): MenuItem[] {
  if (!role) return []
  return businessSidebarMenu.filter(
    (item) =>
      (!item.allowedRoles || item.allowedRoles.includes(role)) &&
      !(item.moduleKey && hiddenModules.includes(item.moduleKey)),
  )
}