import { useQuery } from '@tanstack/react-query'
import { trpc } from '../trpc'

export function useAiEnabled() {
  const { data } = useQuery({ ...trpc.system.aiEnabled.queryOptions(), staleTime: Infinity })
  return data?.aiEnabled ?? false
}
