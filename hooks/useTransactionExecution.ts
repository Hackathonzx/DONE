'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TransactionExecutionState } from '@/types/protocol';
import { parseProgramError } from '@/lib/idl/done_protocol';
import { useWallet } from '@/components/web3/WalletContext';
import { AGREEMENTS_QUERY_KEY } from './useAgreement';

export function useTransactionExecution() {
  const queryClient = useQueryClient();
  const { currentSlot } = useWallet();

  const [txState, setTxState] = useState<TransactionExecutionState>({
    status: 'idle',
  });

  const reset = useCallback(() => {
    setTxState({ status: 'idle' });
  }, []);

  const execute = useCallback(
    async <T,>(
      actionName: string,
      instructionSummary: string,
      operation: () => Promise<{ signature: string } & T>
    ): Promise<({ signature: string } & T) | null> => {
      // 1. Prompt Wallet Approval
      setTxState({
        status: 'requesting_signature',
        actionName,
        instructionSummary,
      });

      // Realistic wallet prompt delay (400ms - 800ms)
      await new Promise((resolve) => setTimeout(resolve, 600));

      try {
        // Execute operation
        const result = await operation();

        // 2. Broadcasted to RPC, awaiting block confirmation
        setTxState({
          status: 'confirming',
          actionName,
          instructionSummary,
          signature: result.signature,
          slot: currentSlot + 1,
        });

        // Realistic Solana Devnet confirmation time (900ms - 1400ms)
        await new Promise((resolve) => setTimeout(resolve, 1100));

        // Compute simulated compute units consumed
        const computeUnits = Math.floor(18000 + Math.random() * 22000);
        const feeLamports = 5000;

        // 3. Block confirmed
        setTxState({
          status: 'confirmed',
          actionName,
          instructionSummary,
          signature: result.signature,
          slot: currentSlot + 2,
          computeUnits,
          feeLamports,
        });

        // Invalidate react query cache strictly after block confirmation
        await queryClient.invalidateQueries({ queryKey: AGREEMENTS_QUERY_KEY });
        await queryClient.invalidateQueries({ queryKey: ['protocol'] });

        return result;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const parsed = parseProgramError(errorMsg);

        setTxState({
          status: 'failed',
          actionName,
          instructionSummary,
          error: parsed ? `Error ${parsed.code} [${parsed.name}]: ${parsed.message}` : errorMsg,
        });
        return null;
      }
    },
    [currentSlot, queryClient]
  );

  return {
    txState,
    reset,
    execute,
    isOpen: txState.status !== 'idle',
  };
}
