'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from './WalletContext';
import { truncateAddress, formatUsdc, getExplorerUrl } from '@/lib/solana';
import { isMobileBrowser, getPhantomDeepLink, getSolflareDeepLink } from '@/lib/mobileWallet';
import {
  Wallet,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { DoneLogo } from '../protocol/DoneLogo';

export function WalletConnectButton() {
  const {
    connected,
    publicKeyString,
    walletName,
    solBalance,
    usdcBalance,
    connect,
    disconnect,
    refreshBalances,
    requestDevnetSolAirdrop,
    connectError,
    clearError,
    isConnecting,
  } = useWallet();

  const [isOpen, setIsOpen] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showImportField, setShowImportField] = useState(false);
  const [importAddrInput, setImportAddrInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileBrowser());
  }, []);

  const handleCopy = () => {
    if (!publicKeyString) return;
    navigator.clipboard.writeText(publicKeyString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnectOption = async (option: 'phantom' | 'solflare' | 'custom') => {
    if (option === 'custom') {
      const ok = await connect('custom', importAddrInput);
      if (ok) {
        setShowConnectModal(false);
        setShowImportField(false);
        setImportAddrInput('');
      }
    } else {
      const ok = await connect(option);
      if (ok) {
        setShowConnectModal(false);
      }
    }
  };

  const handleAirdropSol = async () => {
    setIsAirdropping(true);
    try {
      await requestDevnetSolAirdrop();
    } finally {
      setIsAirdropping(false);
    }
  };

  const hasPhantom = typeof window !== 'undefined' && Boolean((window as any)?.solana?.isPhantom);
  const hasSolflare = typeof window !== 'undefined' && Boolean((window as any)?.solflare);

  const phantomLinks = getPhantomDeepLink();
  const solflareLinks = getSolflareDeepLink();

  if (!connected) {
    return (
      <>
        <button
          onClick={() => {
            clearError();
            setShowConnectModal(true);
          }}
          disabled={isConnecting}
          className="flex items-center gap-2 px-3.5 py-2 bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-violet-600/20 border border-violet-500/40"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
        </button>

        {showConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-[#000000] border border-[#26262a] rounded-2xl shadow-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#26262a]">
                <div className="flex items-center gap-2.5">
                  <DoneLogo className="w-6 h-6" />
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-wider">SOLANA DEVNET WALLET</h3>
                    <span className="text-[10px] text-violet-400">Sign live on-chain transactions</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="text-neutral-400 hover:text-white text-xs px-2 py-1 rounded"
                >
                  ✕
                </button>
              </div>

              {connectError && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-[11px] text-rose-300">
                  {connectError}
                </div>
              )}

              <div className="space-y-2.5">
                {/* Phantom Wallet */}
                <div className="space-y-1">
                  <button
                    onClick={() => handleConnectOption('phantom')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-[#000000] hover:bg-violet-950/20 border border-[#26262a] hover:border-violet-500/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center font-bold text-purple-300 text-xs">
                        P
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-purple-300">
                          Phantom {isMobile && !hasPhantom ? 'Mobile App' : 'Wallet'}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {hasPhantom
                            ? 'Extension detected'
                            : isMobile
                            ? 'Deep-link to Phantom Mobile app'
                            : 'Browser extension'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-purple-400 group-hover:translate-x-0.5 transition-transform font-bold">
                      {isMobile && !hasPhantom ? 'Open App →' : 'Connect →'}
                    </span>
                  </button>
                  {isMobile && !hasPhantom && (
                    <a
                      href={phantomLinks.universalLink}
                      target="_top"
                      rel="noopener noreferrer"
                      className="text-[10px] text-purple-400 hover:text-purple-300 underline block pl-3"
                    >
                      Direct link: Open in Phantom App ↗
                    </a>
                  )}
                </div>

                {/* Solflare Wallet */}
                <div className="space-y-1">
                  <button
                    onClick={() => handleConnectOption('solflare')}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-[#000000] hover:bg-amber-950/20 border border-[#26262a] hover:border-amber-500/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300 text-xs">
                        S
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-amber-300">
                          Solflare {isMobile && !hasSolflare ? 'Mobile App' : 'Wallet'}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {hasSolflare
                            ? 'Extension detected'
                            : isMobile
                            ? 'Deep-link to Solflare Mobile app'
                            : 'Browser extension'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-amber-400 group-hover:translate-x-0.5 transition-transform font-bold">
                      {isMobile && !hasSolflare ? 'Open App →' : 'Connect →'}
                    </span>
                  </button>
                  {isMobile && !hasSolflare && (
                    <a
                      href={solflareLinks.universalLink}
                      target="_top"
                      rel="noopener noreferrer"
                      className="text-[10px] text-amber-400 hover:text-amber-300 underline block pl-3"
                    >
                      Direct link: Open in Solflare App ↗
                    </a>
                  )}
                </div>

                {/* Import Address */}
                <div className="pt-1">
                  {!showImportField ? (
                    <button
                      type="button"
                      onClick={() => setShowImportField(true)}
                      className="text-[11px] text-neutral-400 hover:text-violet-300 underline py-1 block"
                    >
                      Or connect custom Solana public address...
                    </button>
                  ) : (
                    <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl space-y-2">
                      <label className="text-[10px] uppercase font-bold text-neutral-400 block">
                        Solana Base58 Public Key
                      </label>
                      <input
                        type="text"
                        value={importAddrInput}
                        onChange={(e) => setImportAddrInput(e.target.value)}
                        placeholder="Paste your 32-44 char Solana public key..."
                        className="w-full bg-[#000000] border border-[#26262a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowImportField(false)}
                          className="px-2.5 py-1 text-neutral-400 text-[11px] hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConnectOption('custom')}
                          disabled={!importAddrInput.trim()}
                          className="px-3 py-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold"
                        >
                          Connect Address
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="relative font-mono text-xs">
      <div className="flex items-center gap-1.5 bg-[#000000] border border-[#26262a] rounded-xl p-1 shadow-sm">
        {/* Balances */}
        <div className="px-2.5 py-1 bg-[#000000] border border-neutral-900 rounded-lg text-neutral-300 hidden sm:flex items-center gap-2 text-[11px]">
          <span className="text-violet-400 font-semibold">${formatUsdc(usdcBalance)}</span>
          <span className="text-neutral-500 text-[10px]">USDC</span>
          <span className="text-neutral-700">|</span>
          <span className="text-neutral-300 font-medium">{solBalance} SOL</span>
        </div>

        {/* Address and Wallet pill */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2.5 py-1.5 text-neutral-200 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors focus:outline-none"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-[11px] text-white">
            {truncateAddress(publicKeyString, 4)}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Account Details Drawer / Popover */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 bg-[#000000] border border-[#26262a] rounded-2xl shadow-2xl p-4 z-50 text-neutral-300 animate-in fade-in duration-150 backdrop-blur-md"
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Header with Done Logo */}
          <div className="flex items-center justify-between pb-3 border-b border-[#26262a]">
            <div className="flex items-center gap-2">
              <DoneLogo className="w-5 h-5" />
              <div>
                <span className="text-xs font-bold text-white block">{walletName}</span>
                <span className="text-[10px] text-violet-400 font-medium">Solana Devnet</span>
              </div>
            </div>
            <button
              onClick={() => refreshBalances()}
              className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
              title="Refresh on-chain balance"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Connected Address Card */}
          <div className="mt-3 p-2.5 bg-[#000000] rounded-xl border border-[#26262a]">
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider block mb-1">
              Live Wallet Address
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-violet-300 truncate">
                {publicKeyString}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleCopy}
                  className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-900 transition-colors"
                  title="Copy Address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={getExplorerUrl(publicKeyString, 'address')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-900 transition-colors"
                  title="View on Solana Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Real Balances */}
          <div className="mt-3 p-2.5 bg-[#000000] rounded-xl border border-[#26262a] space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400">Devnet USDC:</span>
              <span className="font-bold text-violet-300">${formatUsdc(usdcBalance)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-400">Devnet SOL:</span>
              <span className="font-bold text-white">{solBalance} SOL</span>
            </div>
          </div>

          {/* SOL Airdrop & Faucet Links */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 border border-violet-500/30 transition-colors text-xs font-medium text-center"
            >
              Circle Faucet ↗
            </a>
            <button
              onClick={handleAirdropSol}
              disabled={isAirdropping}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#000000] hover:bg-violet-950/20 text-neutral-200 border border-[#26262a] transition-colors text-xs font-medium"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
              {isAirdropping ? 'Airdropping...' : '+1.0 SOL'}
            </button>
          </div>

          {/* Disconnect */}
          <div className="mt-3 pt-3 border-t border-[#26262a] flex justify-end">
            <button
              onClick={() => {
                disconnect();
                setIsOpen(false);
              }}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors font-medium px-2 py-1"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
