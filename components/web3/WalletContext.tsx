'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PublicKey, Keypair } from '@solana/web3.js';
import { DEMO_KEYS } from '@/lib/protocol/client';

export type WalletRole = 'sponsor' | 'worker' | 'oracle' | 'custom';

export interface WalletContextType {
  connected: boolean;
  publicKey: PublicKey | null;
  publicKeyString: string;
  role: WalletRole;
  usdcBalance: number; // raw 6 decimals
  solBalance: number; // in SOL
  currentSlot: number;
  rpcLatencyMs: number;
  cluster: string;
  connect: (role?: WalletRole) => void;
  disconnect: () => void;
  switchRole: (role: WalletRole) => void;
  requestDevnetUsdcFaucet: (amount?: number) => void;
  requestDevnetSolAirdrop: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

const STORAGE_WALLET_ROLE = 'done_wallet_role';
const STORAGE_USDC_BALANCE = 'done_wallet_usdc_balance';

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<WalletRole>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_WALLET_ROLE) as WalletRole | null;
        if (saved) return saved;
      } catch {
        // ignore
      }
    }
    return 'sponsor';
  });

  const [connected, setConnected] = useState<boolean>(true);
  const [usdcBalance, setUsdcBalance] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_USDC_BALANCE);
        if (saved) return Number(saved);
      } catch {
        // ignore
      }
    }
    return 50_000_000_000;
  });

  const [solBalance, setSolBalance] = useState<number>(4.25);
  const [currentSlot, setCurrentSlot] = useState<number>(298419203);
  const [rpcLatencyMs, setRpcLatencyMs] = useState<number>(42);
  const cluster = 'devnet';

  // Simulate slot progression (Solana 400ms block time)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlot((prev) => prev + 1);
      // Small random latency jitter 35-55ms
      if (Math.random() > 0.7) {
        setRpcLatencyMs(35 + Math.floor(Math.random() * 20));
      }
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const getPublicKeyForRole = useCallback((targetRole: WalletRole): PublicKey => {
    switch (targetRole) {
      case 'worker':
        return new PublicKey(DEMO_KEYS.WORKER);
      case 'oracle':
        return new PublicKey(DEMO_KEYS.ORACLE);
      case 'custom':
        return Keypair.generate().publicKey;
      case 'sponsor':
      default:
        return new PublicKey(DEMO_KEYS.SPONSOR);
    }
  }, []);

  const switchRole = useCallback((newRole: WalletRole) => {
    setRole(newRole);
    try {
      localStorage.setItem(STORAGE_WALLET_ROLE, newRole);
    } catch {
      // ignore
    }
  }, []);

  const connect = useCallback((targetRole?: WalletRole) => {
    if (targetRole) switchRole(targetRole);
    setConnected(true);
  }, [switchRole]);

  const disconnect = useCallback(() => {
    setConnected(false);
  }, []);

  const requestDevnetUsdcFaucet = useCallback((amount = 5_000_000_000) => {
    setUsdcBalance((prev) => {
      const next = prev + amount;
      try {
        localStorage.setItem(STORAGE_USDC_BALANCE, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const requestDevnetSolAirdrop = useCallback(() => {
    setSolBalance((prev) => +(prev + 1.0).toFixed(2));
  }, []);

  const currentPublicKey = connected ? getPublicKeyForRole(role) : null;

  return (
    <WalletContext.Provider
      value={{
        connected,
        publicKey: currentPublicKey,
        publicKeyString: currentPublicKey?.toBase58() || '',
        role,
        usdcBalance,
        solBalance,
        currentSlot,
        rpcLatencyMs,
        cluster,
        connect,
        disconnect,
        switchRole,
        requestDevnetUsdcFaucet,
        requestDevnetSolAirdrop,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return ctx;
}
