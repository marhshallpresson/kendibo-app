import { useQuery } from '@tanstack/react-query';
import { jobApi, ProviderProfile } from '../services/api/jobs';
import { useAuthStore } from '../stores/authStore';

/**
 * Resolves the signed-in user's provider row (provider.provider.id).
 * Auto-onboards on first access so new providers get a row.
 * Returns undefined until the session + provider row are ready.
 */
export function useProviderId(): string | undefined {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['provider-id', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const existing = await jobApi.getMe();
      if (existing) return existing.id;
      const onboarded = await jobApi.onboard();
      return onboarded.id;
    },
  }).data;
}

/**
 * Full provider row (name, KYC status, skills, online flag, optional rating).
 * Returns null while loading, null when no provider row exists yet.
 */
export function useProviderProfile() {
  const user = useAuthStore((s) => s.user);
  return useQuery<ProviderProfile | null>({
    queryKey: ['provider-profile', user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: () => jobApi.getMe(),
  });
}
