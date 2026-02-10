import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiFetch, apiPath } from './api';

export interface User {
  id: number;
  email: string;
  displayName: string;
  isAdmin: boolean;
}

export const authQueryOptions = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: () => apiFetch<User>('/api/auth/me'),
  retry: false,
  staleTime: 5 * 60 * 1000,
});

export function useAuth() {
  const query = useQuery(authQueryOptions);
  const queryClient = useQueryClient();

  const logout = useCallback(async () => {
    try {
      await fetch(apiPath('/api/auth/logout'), { method: 'POST' });
    } catch {
      // Proceed with client-side logout even if server request fails
    }
    queryClient.setQueryData(['auth', 'me'], null);
    window.location.href = import.meta.env.BASE_URL;
  }, [queryClient]);

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
    isAdmin: query.data?.isAdmin ?? false,
    logout,
  };
}
