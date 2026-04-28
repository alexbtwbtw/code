export type InvoiceStatus = 'draft' | 'sent' | 'paid'

export interface RawInvoice {
  id: string
  claim_id: number
  invoice_number: string
  status: string
  issued_date: string
  due_date: string | null
  notes: string
  pdf_storage_key: string | null
  pdf_storage_adapter: string | null
  total_amount: number
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  claimId: number
  invoiceNumber: string
  status: InvoiceStatus
  issuedDate: string
  dueDate: string | null
  notes: string
  pdfStorageKey: string | null
  pdfStorageAdapter: string | null
  totalAmount: number
  createdAt: string
  updatedAt: string
}

export function mapInvoice(r: RawInvoice): Invoice {
  return {
    id: r.id,
    claimId: r.claim_id,
    invoiceNumber: r.invoice_number,
    status: r.status as InvoiceStatus,
    issuedDate: r.issued_date,
    dueDate: r.due_date,
    notes: r.notes,
    pdfStorageKey: r.pdf_storage_key,
    pdfStorageAdapter: r.pdf_storage_adapter,
    totalAmount: r.total_amount,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export interface RawInvoiceItem {
  id: number
  invoice_id: string
  item_type: string
  item_id: number
  description: string
  quantity: number
  unit_price: number
  amount: number
  created_at: string
}

export interface InvoiceItem {
  id: number
  invoiceId: string
  itemType: 'line_item' | 'billing_item'
  itemId: number
  description: string
  quantity: number
  unitPrice: number
  amount: number
  createdAt: string
}

export function mapInvoiceItem(r: RawInvoiceItem): InvoiceItem {
  return {
    id: r.id,
    invoiceId: r.invoice_id,
    itemType: r.item_type as 'line_item' | 'billing_item',
    itemId: r.item_id,
    description: r.description,
    quantity: r.quantity,
    unitPrice: r.unit_price,
    amount: r.amount,
    createdAt: r.created_at,
  }
}
