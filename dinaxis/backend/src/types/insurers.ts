export interface RawInsurer {
  id: number
  name: string
  contact_name: string
  email: string
  phone: string
  address: string
  notes: string
  created_at: string
  updated_at: string
}

export interface Insurer {
  id: number
  name: string
  contactName: string
  email: string
  phone: string
  address: string
  notes: string
  createdAt: string
  updatedAt: string
  contacts?: InsurerContact[]
}

export function mapInsurer(r: RawInsurer): Insurer {
  return {
    id: r.id,
    name: r.name,
    contactName: r.contact_name,
    email: r.email,
    phone: r.phone,
    address: r.address,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export interface RawInsurerContact {
  id: number
  insurer_id: number
  name: string
  title: string
  email: string
  phone: string
  is_primary: number
  created_at: string
}

export interface InsurerContact {
  id: number
  insurerId: number
  name: string
  title: string
  email: string
  phone: string
  isPrimary: boolean
  createdAt: string
}

export function mapInsurerContact(r: RawInsurerContact): InsurerContact {
  return {
    id: r.id,
    insurerId: r.insurer_id,
    name: r.name,
    title: r.title,
    email: r.email,
    phone: r.phone,
    isPrimary: r.is_primary === 1,
    createdAt: r.created_at,
  }
}
