import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import { QueryClient } from '@tanstack/react-query'
import type { AppRouter } from '../../backend/src/router/index'
import { getCurrentUser } from './auth'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: false },
    mutations: { retry: false },
  },
})

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/trpc',
      headers() {
        // TODO: Replace with real auth token headers (e.g. Authorization: Bearer <jwt>)
        // when Cognito / real auth is implemented. For now sends the dev-switcher role.
        const user = getCurrentUser()
        if (!user) return {}
        return {
          'x-user-role': user.role,
          'x-user-id':   String(user.id),
          'x-user-name': user.name,
        }
      },
    }),
  ],
})

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
})
