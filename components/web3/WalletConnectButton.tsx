'use client';

import React, { useState } from 'react';
import { useWallet, WalletRole } from './WalletContext';
import { truncateAddress, formatUsdc } from '@/lib/solana';
import { Button } from '../ui/Button';
import { ChevronDown, Copy, Check, Droplets, UserCheck, Shield } from 'lucide-react';

export function WalletConnectButton() {
  const {
    connected,
    publicKeyString,
    role,
    usdcBalance,
    solBalance,
    connect,
    switchRole,
    requestDevnetUsdcFaucet,
    requestDevnetSolAirdrop,
  } = useWallet();

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);

  const handleCopy = () => {
    if (!publicKeyString) return;
    navigator.clipboard.writeText(publicKeyString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFaucet = () => {
    requestDevnetUsdcFaucet(5_000_000_000); // 5,000 USDC
    requestDevnetSolAirdrop();
    setFaucetSuccess(true);
    setTimeout(() => setFaucetSuccess(false), 2500);
  };

  const roleLabels: Record<WalletRole, { name: string; color: string }> = {
    sponsor: { name: 'Sponsor (Capital)', color: 'text-cyan-400' },
    worker: { name: 'Worker (Builder)', color: 'text-amber-400' },
    oracle: { name: 'Oracle / Verifier', color: 'text-purple-400' },
    custom: { name: 'Custom Keypair', color: 'text-zinc-400' },
  };

  if (!connected) {
    return (
      <Button variant="primary" size="sm" onClick={() => connect('sponsor')}>
        Connect Devnet Wallet
      </Button>
    );
  }

  return (
    <div className="relative font-mono">
      <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1">
        {/* Balance badge */}
        <div className="px-2 py-1 text-[11px] bg-zinc-950 border border-zinc-800/80 text-zinc-300 hidden sm:flex items-center gap-2">
          <span className="text-emerald-400 font-semibold">${formatUsdc(usdcBalance)}</span>
          <span className="text-zinc-400 text-[10px]">USDC</span>
          <span className="text-zinc-600">/</span>
          <span className="text-cyan-400">{solBalance} SOL</span>
        </div>

        {/* Address and Role Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2.5 py-1 text-xs text-zinc-100 hover:bg-zinc-800 transition-colors focus:outline-none"
        >
          <span className={`w-2 h-2 rounded-full ${role === 'sponsor' ? 'bg-cyan-400' : role === 'worker' ? 'bg-amber-400' : 'bg-purple-400'}`} />
          <span className="font-semibold uppercase text-[11px]">{role}</span>
          <span className="text-zinc-400 hidden md:inline">({truncateAddress(publicKeyString, 4)})</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-1 w-72 bg-zinc-950 border border-zinc-800 shadow-2xl p-3 z-50 text-xs text-zinc-300 animate-in fade-in duration-150"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="border-b border-zinc-800/80 pb-2 mb-2">
            <span className="text-[10px] text-zinc-400 block uppercase">Connected Public Key</span>
            <div className="flex items-center justify-between mt-1 bg-zinc-900 p-1.5 border border-zinc-800">
              <span className="font-mono text-[11px] text-cyan-300 truncate max-w-[190px]">
                {publicKeyString}
              </span>
              <button
                onClick={handleCopy}
                className="text-zinc-400 hover:text-zinc-200 p-1 transition-colors"
                title="Copy Address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Role Switching */}
          <div className="py-1">
            <span className="text-[10px] text-zinc-400 block uppercase mb-1.5">
              Simulate Account Role:
            </span>
            <div className="grid grid-cols-1 gap-1">
              {(['sponsor', 'worker', 'oracle'] as WalletRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    switchRole(r);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-2 py-1.5 text-left transition-colors border ${
                    role === r
                      ? 'bg-zinc-800/80 border-cyan-500/50 text-cyan-300 font-semibold'
                      : 'border-transparent hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-xs">
                    {r === 'sponsor' ? <Shield className="w-3 h-3 text-cyan-400" /> : <UserCheck className="w-3 h-3 text-amber-400" />}
                    {roleLabels[r].name}
                  </span>
                  {role === r && <span className="text-[10px] text-cyan-400 font-mono">ACTIVE</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Devnet Faucet */}
          <div className="border-t border-zinc-800/80 pt-2.5 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center text-xs py-1.5 border-cyan-900/50 hover:border-cyan-500 text-cyan-300"
              onClick={handleFaucet}
            >
              <Droplets className="w-3.5 h-3.5 text-cyan-400 mr-1.5" />
              {faucetSuccess ? 'Airdropped +5,000 USDC!' : 'Devnet Faucet (+5,000 USDC)'}
            </Button>
            <p className="text-[10px] text-zinc-400 text-center mt-1">
              Mints SPL USDC tokens to connected Devnet keypair
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
