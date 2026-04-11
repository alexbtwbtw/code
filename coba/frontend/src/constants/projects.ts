import type { TranslationKey } from '../i18n/en'

export const STATUSES = ['planning', 'active', 'completed', 'suspended', 'cancelled'] as const
export const CATEGORIES = ['water', 'transport', 'energy', 'environment', 'planning', 'other'] as const

export const STATUS_KEY: Record<string, TranslationKey> = {
  planning: 'statusPlanning', active: 'statusActive', completed: 'statusCompleted',
  suspended: 'statusSuspended', cancelled: 'statusCancelled',
}
export const CAT_KEY: Record<string, TranslationKey> = {
  water: 'catWater', transport: 'catTransport', energy: 'catEnergy',
  environment: 'catEnvironment', planning: 'catPlanning', other: 'catOther',
}

export const PROJECT_PRIORITIES = ['critical', 'very_high', 'high', 'medium', 'low', 'very_low', 'minimal'] as const
export type ProjectPriority = typeof PROJECT_PRIORITIES[number]

export const PRIORITY_KEY: Record<ProjectPriority, TranslationKey> = {
  critical:  'priorityCritical',
  very_high: 'priorityVeryHigh',
  high:      'priorityHigh',
  medium:    'priorityMedium',
  low:       'priorityLow',
  very_low:  'priorityVeryLow',
  minimal:   'priorityMinimal',
}

// CSS colour class per priority (for badges)
export const PRIORITY_COLOR: Record<ProjectPriority, string> = {
  critical:  'priority--critical',
  very_high: 'priority--very-high',
  high:      'priority--high',
  medium:    'priority--medium',
  low:       'priority--low',
  very_low:  'priority--very-low',
  minimal:   'priority--minimal',
}
