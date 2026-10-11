'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PublicKey, Connection, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { DEVNET_RPC_URL, DEVNET_USDC_MINT } from '@/lib/solana';
import { isMobileBrowser, launchMobileWallet } from '@/lib/mobileWallet';

export interface WalletContextType {
  connected: boolean;
  isConnecting: boolean;
  publicKey: PublicKey | null;
  publicKeyString: string;
  walletName: string;
  solBalance: number;
  usdcBalance: number; // raw 6 decimals
  isLiveWallet: boolean; // true if connected via browser wallet extension
  cluster: string;
  currentSlot: number;
  rpcLatencyMs: number;
  connectError: string | null;
  connect: (preferred: 'phantom' | 'solflare' | 'custom', customAddr?: string) => Promise<boolean>;
  disconnect: () => void;
  importAddress: (address: string) => boolean;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  requestDevnetSolAirdrop: () => Promise<boolean>;
  refreshBalances: () => Promise<void>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

const STORAGE_CONNECTED = 'done_wallet_session_active';
const STORAGE_WALLET_NAME = 'done_wallet_session_name';
const STORAGE_CUSTOM_ADDR = 'done_wallet_session_addr';

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string>('');
  const [isLiveExtension, setIsLiveExtension] = useState<boolean>(false);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [connected, setConnected] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [currentSlot, setCurrentSlot] = useState<number>(509420300);
  const [rpcLatencyMs, setRpcLatencyMs] = useState<number>(42);
  const cluster = 'devnet';

  // Live RPC Slot & Latency poller
  useEffect(() => {
    let active = true;
    const updateRpcStatus = async () => {
      try {
        const start = performance.now();
        const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
        const slot = await connection.getSlot('confirmed');
        const latency = Math.round(performance.now() - start);
        if (active) {
          setCurrentSlot(slot);
          setRpcLatencyMs(latency);
        }
      } catch {
        // ignore
      }
    };
    updateRpcStatus();
    const interval = setInterval(updateRpcStatus, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch real on-chain SOL and Devnet USDC balances
  const refreshBalances = useCallback(async () => {
    if (!publicKey) return;
    try {
      const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
      const lamports = await connection.getBalance(publicKey);
      setSolBalance(Number((lamports / LAMPORTS_PER_SOL).toFixed(4)));

      try {
        const ata = await getAssociatedTokenAddress(DEVNET_USDC_MINT, publicKey, false, TOKEN_PROGRAM_ID);
        const tokenAccount = await connection.getTokenAccountBalance(ata, 'confirmed');
        const rawAmount = tokenAccount?.value?.amount ? Number(tokenAccount.value.amount) : 0;
        setUsdcBalance(rawAmount);
      } catch {
        // ATA does not exist yet -> 0 USDC
        setUsdcBalance(0);
      }
    } catch (err) {
      console.warn('Error refreshing balances:', err);
    }
  }, [publicKey]);

  // Polling / auto-refresh when address changes
  useEffect(() => {
    if (!connected || !publicKey) {
      setSolBalance(0);
      setUsdcBalance(0);
      return;
    }
    refreshBalances();
    const timer = setInterval(refreshBalances, 12000);
    return () => clearInterval(timer);
  }, [connected, publicKey, refreshBalances]);

  // Try auto-reconnect on mount if extension is already authorized
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sessionActive = localStorage.getItem(STORAGE_CONNECTED) === 'true';
    const savedName = localStorage.getItem(STORAGE_WALLET_NAME);
    const savedAddr = localStorage.getItem(STORAGE_CUSTOM_ADDR);

    if (sessionActive && savedName === 'Phantom') {
      const solana = (window as any).solana;
      if (solana?.isPhantom) {
        solana
          .connect({ onlyIfTrusted: true })
          .then((resp: any) => {
            setPublicKey(new PublicKey(resp.publicKey.toString()));
            setWalletName('Phantom');
            setIsLiveExtension(true);
            setConnected(true);
          })
          .catch(() => {
            // User had not trusted or disconnected
          });
      }
    } else if (sessionActive && savedAddr) {
      try {
        const pk = new PublicKey(savedAddr);
        setPublicKey(pk);
        setWalletName(savedName || 'Imported Address');
        setIsLiveExtension(false);
        setConnected(true);
      } catch {
        // ignore
      }
    }
  }, []);

  const clearError = useCallback(() => {
    setConnectError(null);
  }, []);

  const connect = useCallback(
    async (preferred: 'phantom' | 'solflare' | 'custom', customAddr?: string): Promise<boolean> => {
      setIsConnecting(true);
      setConnectError(null);
      try {
        if (preferred === 'custom') {
          if (!customAddr || !customAddr.trim()) {
            setConnectError('Please enter a valid Solana public key.');
            return false;
          }
          try {
            const pk = new PublicKey(customAddr.trim());
            setPublicKey(pk);
            setWalletName('Imported Address');
            setIsLiveExtension(false);
            setConnected(true);
            localStorage.setItem(STORAGE_CONNECTED, 'true');
            localStorage.setItem(STORAGE_WALLET_NAME, 'Imported Address');
            localStorage.setItem(STORAGE_CUSTOM_ADDR, pk.toBase58());
            return true;
          } catch {
            setConnectError('Invalid Solana base58 public address.');
            return false;
          }
        }

        if (preferred === 'phantom') {
          const solana = typeof window !== 'undefined' ? (window as any).solana : undefined;
          if (solana && typeof solana.connect === 'function') {
            const resp = await solana.connect();
            const pk = new PublicKey(resp.publicKey.toString());
            setPublicKey(pk);
            setWalletName(solana.isPhantom ? 'Phantom' : 'Solana Wallet');
            setIsLiveExtension(true);
            setConnected(true);
            localStorage.setItem(STORAGE_CONNECTED, 'true');
            localStorage.setItem(STORAGE_WALLET_NAME, solana.isPhantom ? 'Phantom' : 'Solana Wallet');
            localStorage.removeItem(STORAGE_CUSTOM_ADDR);
            return true;
          } else {
            if (isMobileBrowser()) {
              launchMobileWallet('phantom');
              setConnectError('Attempting to open Phantom Mobile... Return here once authorized.');
              return false;
            }
            setConnectError('Phantom extension not detected. Install from phantom.app or open via Phantom Mobile.');
            return false;
          }
        }

        if (preferred === 'solflare') {
          const solflare = typeof window !== 'undefined' ? (window as any).solflare : undefined;
          if (solflare && typeof solflare.connect === 'function') {
            await solflare.connect();
            const pk = new PublicKey(solflare.publicKey.toString());
            setPublicKey(pk);
            setWalletName('Solflare');
            setIsLiveExtension(true);
            setConnected(true);
            localStorage.setItem(STORAGE_CONNECTED, 'true');
            localStorage.setItem(STORAGE_WALLET_NAME, 'Solflare');
            localStorage.removeItem(STORAGE_CUSTOM_ADDR);
            return true;
          } else {
            if (isMobileBrowser()) {
              launchMobileWallet('solflare');
              setConnectError('Attempting to open Solflare Mobile... Return here once authorized.');
              return false;
            }
            setConnectError('Solflare extension not detected. Install from solflare.com or open via Solflare Mobile.');
            return false;
          }
        }

        return false;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Wallet connection rejected by user';
        setConnectError(msg);
        return false;
      } finally {
        setIsConnecting(false);
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    if (typeof window !== 'undefined') {
      const solana = (window as any).solana;
      if (solana?.disconnect) {
        try {
          solana.disconnect();
        } catch {
          // ignore
        }
      }
      localStorage.removeItem(STORAGE_CONNECTED);
      localStorage.removeItem(STORAGE_WALLET_NAME);
      localStorage.removeItem(STORAGE_CUSTOM_ADDR);
    }
    setConnected(false);
    setPublicKey(null);
    setWalletName('');
    setSolBalance(0);
    setUsdcBalance(0);
    setIsLiveExtension(false);
    setConnectError(null);
  }, []);

  const importAddress = useCallback((address: string): boolean => {
    try {
      const pk = new PublicKey(address.trim());
      setPublicKey(pk);
      setWalletName('Imported Address');
      setIsLiveExtension(false);
      setConnected(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_CONNECTED, 'true');
        localStorage.setItem(STORAGE_WALLET_NAME, 'Imported Address');
        localStorage.setItem(STORAGE_CUSTOM_ADDR, pk.toBase58());
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Request real wallet signature for an on-chain transaction
   */
  const signTransaction = useCallback(
    async (tx: Transaction): Promise<Transaction> => {
      if (isLiveExtension) {
        const solana = typeof window !== 'undefined' ? (window as any).solana : null;
        const solflare = typeof window !== 'undefined' ? (window as any).solflare : null;

        if (walletName.toLowerCase().includes('solflare') && solflare?.signTransaction) {
          return await solflare.signTransaction(tx);
        }
        if (solana?.signTransaction) {
          return await solana.signTransaction(tx);
        }
      }
      throw new Error(
        'Read-only address connected. Please connect a live Solana wallet (Phantom or Solflare) to sign on-chain transactions.'
      );
    },
    [isLiveExtension, walletName]
  );

  const requestDevnetSolAirdrop = useCallback(async (): Promise<boolean> => {
    if (!publicKey) return false;
    try {
      const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
      const sig = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, 'confirmed');
      await refreshBalances();
      return true;
    } catch (err) {
      console.warn('Airdrop rate-limited by devnet faucet:', err);
      return false;
    }
  }, [publicKey, refreshBalances]);

  return (
    <WalletContext.Provider
      value={{
        connected,
        isConnecting,
        publicKey,
        publicKeyString: publicKey ? publicKey.toBase58() : '',
        walletName,
        solBalance,
        usdcBalance,
        isLiveWallet: isLiveExtension,
        cluster,
        currentSlot,
        rpcLatencyMs,
        connectError,
        connect,
        disconnect,
        importAddress,
        signTransaction,
        requestDevnetSolAirdrop,
        refreshBalances,
        clearError,
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
