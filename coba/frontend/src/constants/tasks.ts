import type { TranslationKey } from '../i18n/en'

export const TASK_STATUS_KEY: Record<string, TranslationKey> = {
  todo: 'taskStatusTodo', in_progress: 'taskStatusInProgress', review: 'taskStatusReview',
  blocked: 'taskStatusBlocked', done: 'taskStatusDone',
}
export const TASK_PRIORITY_KEY: Record<string, TranslationKey> = {
  low: 'taskPriorityLow', medium: 'taskPriorityMedium', high: 'taskPriorityHigh',
}
export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'blocked', 'done'] as const
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const
