'use client';

import React, { useState } from 'react';
import { useWallet } from '@/components/web3/WalletContext';
import { protocolClient } from '@/lib/protocol/client';
import {
  DONE_PROGRAM_ID,
  DEVNET_USDC_MINT,
  PROTOCOL_CONFIG_PDA,
  PROGRAM_DATA_PDA,
  formatUsdc,
  truncateAddress,
  getExplorerUrl,
} from '@/lib/solana';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DoneLogo } from '@/components/protocol/DoneLogo';
import {
  Settings,
  Server,
  FileCode,
  RotateCcw,
  ExternalLink,
  CheckCircle2,
  Trash2,
  ShieldCheck,
} from 'lucide-react';

export default function SettingsPage() {
  const {
    cluster,
    currentSlot,
    rpcLatencyMs,
    requestDevnetSolAirdrop,
  } = useWallet();

  const [activeTab, setActiveTab] = useState<'network' | 'logs'>('network');
  const [resetMessage, setResetMessage] = useState(false);
  const [logs, setLogs] = useState(() => protocolClient.getLogs());

  const handleResetData = () => {
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove = Object.keys(localStorage).filter((k) =>
          k.startsWith('done_protocol_meta_')
        );
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        localStorage.removeItem('done_protocol_logs_v1');
        setResetMessage(true);
        setTimeout(() => setResetMessage(false), 2500);
        setLogs([]);
      } catch {
        // ignore
      }
    }
  };

  const handleClearLogs = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('done_protocol_logs_v1');
      setLogs([]);
    }
  };

  return (
    <div className="space-y-6 font-mono text-neutral-100 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#26262a] pb-4">
        <div className="flex items-center gap-3">
          <DoneLogo className="w-8 h-8" />
          <div>
            <div className="flex items-center gap-2 text-xs text-violet-400 mb-0.5">
              <Settings className="w-3.5 h-3.5" />
              <span className="font-bold tracking-wider">CONFIG & AUDIT</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Settings</h1>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#26262a] pb-2 text-xs">
        <button
          onClick={() => setActiveTab('network')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold transition-all ${
            activeTab === 'network'
              ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Solana Devnet Parameters</span>
        </button>
        <button
          onClick={() => {
            setLogs(protocolClient.getLogs());
            setActiveTab('logs');
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold transition-all ${
            activeTab === 'logs'
              ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Audit Logs ({logs.length})</span>
        </button>
      </div>

      {activeTab === 'network' ? (
        <>
          {/* Network Parameters */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Network & Live RPC
              </h3>
              <span className="px-2 py-0.5 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/30 text-xs font-bold">
                SOLANA DEVNET
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">NETWORK</span>
                <span className="font-bold text-neutral-200">Solana Devnet</span>
              </div>
              <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">CURRENT LIVE SLOT</span>
                <span className="font-bold text-neutral-200 tabular-nums">#{currentSlot.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl">
                <span className="text-[10px] text-neutral-500 uppercase block mb-1">RPC LATENCY</span>
                <span className="font-bold text-emerald-400 tabular-nums">{rpcLatencyMs}ms</span>
              </div>
            </div>
          </Card>

          {/* Program & Token Contracts */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Smart Contract Deployments
              </h3>
              <span className="text-xs text-violet-400">DEVNET</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] text-neutral-400 block mb-1 font-semibold">
                  PROGRAM ID:
                </span>
                <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl font-mono text-violet-300 break-all select-all flex items-center justify-between gap-2">
                  <span>{DONE_PROGRAM_ID.toBase58()}</span>
                  <a
                    href={getExplorerUrl(DONE_PROGRAM_ID.toBase58(), 'address')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-neutral-400 block mb-1 font-semibold">
                  USDC DEVNET MINT:
                </span>
                <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl font-mono text-emerald-400 break-all select-all flex items-center justify-between gap-2">
                  <span>{DEVNET_USDC_MINT.toBase58()}</span>
                  <a
                    href={getExplorerUrl(DEVNET_USDC_MINT.toBase58(), 'address')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-neutral-400 block mb-1 font-semibold">
                  PROTOCOL CONFIG PDA:
                </span>
                <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl font-mono text-cyan-400 break-all select-all flex items-center justify-between gap-2">
                  <span>{PROTOCOL_CONFIG_PDA.toBase58()}</span>
                  <a
                    href={getExplorerUrl(PROTOCOL_CONFIG_PDA.toBase58(), 'address')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-neutral-400 block mb-1 font-semibold">
                  PROGRAM DATA PDA:
                </span>
                <div className="p-3 bg-[#000000] border border-[#26262a] rounded-xl font-mono text-neutral-300 break-all select-all flex items-center justify-between gap-2">
                  <span>{PROGRAM_DATA_PDA.toBase58()}</span>
                  <a
                    href={getExplorerUrl(PROGRAM_DATA_PDA.toBase58(), 'address')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-400 hover:text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </Card>

          {/* Faucet & Clear Local Storage */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Airdrop & Cache Management
              </h3>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <a
                  href="https://faucet.circle.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 text-violet-300 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  Circle USDC Faucet ↗
                </a>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={requestDevnetSolAirdrop}
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-violet-400" />
                  Request Devnet SOL
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleResetData}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Clear Off-Chain Cache
                </Button>
                {resetMessage && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Cleared
                  </span>
                )}
              </div>
            </div>
          </Card>
        </>
      ) : (
        /* Settings > Logs Sub-tab */
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#26262a] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Protocol Activity Logs
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Real on-chain transaction signatures recorded on Solana Devnet
              </p>
            </div>
            {logs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearLogs}
                className="text-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-400" />
                Clear Logs
              </Button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <DoneLogo className="w-10 h-10 mx-auto opacity-50" />
              <p className="text-neutral-400 text-xs">No local protocol activity recorded yet.</p>
              <p className="text-neutral-600 text-[11px]">
                Transactions executed through connected wallets appear here with Solana Explorer links.
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-[#000000] border border-[#26262a] rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold text-[10px]">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <a
                      href={getExplorerUrl(log.signature, 'tx')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      <span>{truncateAddress(log.signature, 4)}</span>
                      <ExternalLink className="w-3 h-3 text-violet-400" />
                    </a>
                  </div>
                  <p className="text-neutral-200 text-xs">{log.details}</p>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-[#26262a]/60">
                    <span>PDA: {truncateAddress(log.agreementPda, 4)}</span>
                    {log.amountUsdc ? (
                      <span className="text-emerald-400 font-semibold">
                        ${formatUsdc(log.amountUsdc)} USDC
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
