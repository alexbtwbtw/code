export interface MemberRate {
  id: number
  teamMemberId: number
  hourlyRate: number
  effectiveFrom: string
  notes: string
  createdAt: string
}

export interface FixedCost {
  id: number
  projectId: number
  description: string
  amount: number
  costDate: string
  category: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface LaborEntry {
  entryId: number
  memberId: number
  memberName: string
  date: string
  hours: number
  hourlyRate: number
  laborCost: number
}

export interface MemberLaborBreakdown {
  memberId: number
  memberName: string
  hours: number
  hourlyRate: number | null
  laborCost: number
}

export interface ProjectFinancialSummary {
  projectId: number
  budget: number | null
  laborCost: number
  fixedCostTotal: number
  totalCost: number
  budgetVariance: number | null
  budgetUtilisationPct: number | null
  hasUnratedEntries: boolean
  membersWithNoRate: string[]
  laborByMember: MemberLaborBreakdown[]
  fixedCostByCategory: Record<string, number>
}

export interface MemberCostSummary {
  memberId: number
  memberName: string
  currentRate: number | null
  totalHours: number
  totalLaborCost: number
  byProject: Array<{
    projectId: number
    projectName: string
    hours: number
    laborCost: number
  }>
}

export interface CompanyFinancials {
  totalLaborCost: number
  totalFixedCost: number
  totalCost: number
  totalBudget: number
  projectCount: number
  byProject: Array<{
    projectId: number
    projectName: string
    laborCost: number
    fixedCost: number
    totalCost: number
    budget: number | null
    variancePct: number | null
  }>
  byCategory: Array<{
    category: string
    fixedCost: number
  }>
  byMonth: Array<{
    month: string
    laborCost: number
    fixedCost: number
  }>
}
