'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TransactionExecutionState } from '@/types/protocol';
import { parseProgramError } from '@/lib/idl/done_protocol';
import { useWallet } from '@/components/web3/WalletContext';
import { AGREEMENTS_QUERY_KEY } from './useAgreement';
import { Connection } from '@solana/web3.js';
import { DEVNET_RPC_URL } from '@/lib/solana';

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

      try {
        // Execute real on-chain transaction (prompts wallet to sign and sends to RPC)
        const result = await operation();

        // 2. Broadcasted to RPC, awaiting confirmation
        setTxState({
          status: 'confirming',
          actionName,
          instructionSummary,
          signature: result.signature,
          slot: currentSlot,
        });

        // Query confirmed transaction info for real slot & fee lamports
        const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
        let confirmedSlot = currentSlot;
        let feeLamports = 5000;

        try {
          const txInfo = await connection.getTransaction(result.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          });
          if (txInfo) {
            confirmedSlot = txInfo.slot;
            feeLamports = txInfo.meta?.fee || 5000;
          }
        } catch {
          // ignore
        }

        // 3. Block confirmed
        setTxState({
          status: 'confirmed',
          actionName,
          instructionSummary,
          signature: result.signature,
          slot: confirmedSlot,
          feeLamports,
        });

        // Invalidate react-query cache so on-chain accounts immediately update
        await queryClient.invalidateQueries({ queryKey: AGREEMENTS_QUERY_KEY });
        await queryClient.invalidateQueries({ queryKey: ['protocol'] });

        return result;
      } catch (err: unknown) {
        console.error('On-chain transaction failed:', err);
        const parsed = parseProgramError(err);
        const errorMsg = err instanceof Error ? err.message : String(err);
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
