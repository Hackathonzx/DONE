'use client';

import { useQuery } from '@tanstack/react-query';
import { protocolClient } from '@/lib/protocol/client';
import { AgreementAccount, MilestoneAccount } from '@/types/protocol';

export const milestoneQueryKey = (agreementId: string, index: number) => [
  'protocol',
  'milestone',
  agreementId,
  index,
];

export function useMilestone(agreementId: string | undefined, index: number | undefined) {
  return useQuery<{ agreement: AgreementAccount; milestone: MilestoneAccount } | null>({
    queryKey: milestoneQueryKey(agreementId || '', index ?? -1),
    queryFn: async () => {
      if (!agreementId || index === undefined || index < 0) return null;
      return protocolClient.getMilestone(agreementId, index);
    },
    enabled: Boolean(agreementId && index !== undefined && index >= 0),
  });
}
