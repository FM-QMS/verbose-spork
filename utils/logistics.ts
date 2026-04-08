import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  return createClient(url, key)
}

export type ReturnType = 'return' | 'exchange'

export type ShipmentStatus =
  | 'Return Label Needed'
  | 'Return Label Mailed'
  | 'Return Received'
  | 'Shipped New Garment'

export type RefundStatus =
  | 'Missing Products'
  | 'Refund Initiated'
  | 'Return Not Received'

export type ExchangeStatus =
  | 'Received Return'
  | 'Missing Products'
  | 'Shipped Replacement'
  | 'Need Product Replacement'

export interface ReturnRecord {
  id: string
  type: ReturnType
  initiated_date: string
  patient_id: string
  po_number?: string
  product?: string
  manufacturer?: string
  date_return_received?: string
  date_label_mailed?: string
  date_completed?: string
  shipment_status: ShipmentStatus
  refund_status?: RefundStatus
  exchange_status?: ExchangeStatus
  updated_product?: string
  advocate?: string
  shipping_coordinator?: string
  notes?: string
  completed: boolean
  completed_at?: string
  created_at: string
  updated_at: string
}

export const SHIPMENT_STATUSES: ShipmentStatus[] = [
  'Return Label Needed',
  'Return Label Mailed',
  'Return Received',
  'Shipped New Garment',
]

export const REFUND_STATUSES: RefundStatus[] = [
  'Missing Products',
  'Refund Initiated',
  'Return Not Received',
]

export const EXCHANGE_STATUSES: ExchangeStatus[] = [
  'Received Return',
  'Missing Products',
  'Shipped Replacement',
  'Need Product Replacement',
]
