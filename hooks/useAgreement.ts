'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { protocolClient } from '@/lib/protocol/client';
import { AgreementAccount } from '@/types/protocol';

export const AGREEMENTS_QUERY_KEY = ['protocol', 'agreements'];
export const agreementQueryKey = (id: string) => ['protocol', 'agreement', id];

export function useAgreements() {
  return useQuery<AgreementAccount[]>({
    queryKey: AGREEMENTS_QUERY_KEY,
    queryFn: async () => {
      return protocolClient.getAgreements();
    },
  });
}

export function useAgreement(id: string | undefined) {
  return useQuery<AgreementAccount | null>({
    queryKey: agreementQueryKey(id || ''),
    queryFn: async () => {
      if (!id) return null;
      return protocolClient.getAgreement(id);
    },
    enabled: Boolean(id),
  });
}

export function useSponsorAgreements(sponsorPubkey: string | undefined) {
  const { data: agreements = [], ...rest } = useAgreements();
  const sponsorAgreements = sponsorPubkey
    ? agreements.filter((a) => a.sponsor === sponsorPubkey)
    : agreements;
  return { data: sponsorAgreements, ...rest };
}

export function useWorkerAgreements(workerPubkey: string | undefined) {
  const { data: agreements = [], ...rest } = useAgreements();
  const workerAgreements = workerPubkey
    ? agreements.filter((a) => a.worker === workerPubkey)
    : agreements;
  return { data: workerAgreements, ...rest };
}
