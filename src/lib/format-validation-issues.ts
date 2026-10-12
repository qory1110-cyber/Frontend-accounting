const FIELD_LABELS: Record<string, string> = {
  paymentDate: 'Date',
  paidFromBankAccountId: 'Paid from',
  payeeContactId: 'Payee',
  receiptDate: 'Date',
  receivedInBankAccountId: 'Received in',
  lines: 'Rincian',
  transferDate: 'Date',
  amount: 'Amount',
}

export function formatValidationIssues(issues: { path: PropertyKey[]; message: string }[]) {
  const messages = issues.map((issue) => {
    const [first, index] = issue.path
    if (first === 'lines' && typeof index === 'number') return `Baris ${index + 1}: ${issue.message}`
    const label = typeof first === 'string' ? FIELD_LABELS[first] : undefined
    return label ? `${label}: ${issue.message}` : issue.message
  })
  return [...new Set(messages)].join(' · ')
}