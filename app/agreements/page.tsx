'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAgreements } from '@/hooks/useAgreement';
import { useWallet } from '@/components/web3/WalletContext';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { AgreementState, MilestoneState, AgreementAccount, MilestoneAccount } from '@/types/protocol';
import { formatUsdc, truncateAddress } from '@/lib/solana';
import { AgreementStateBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CreateAgreementDrawer } from '@/components/protocol/CreateAgreementDrawer';
import { QuickActionModal, QuickActionType } from '@/components/protocol/QuickActionModal';
import { TxStateModal } from '@/components/web3/TxStateModal';
import {
  FileCode,
  ArrowRight,
  PlusCircle,
  Lock,
  Search,
} from 'lucide-react';

export default function AgreementsDirectoryPage() {
  const { data: agreements = [], isLoading } = useAgreements();
  const { connected, publicKeyString } = useWallet();
  const { txState, execute, reset: resetTx, isOpen: isTxOpen } = useTransactionExecution();

  const [activeTab, setActiveTab] = useState<'my' | 'all' | 'active' | 'completed'>('my');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    type: QuickActionType;
    agreement: AgreementAccount | null;
    milestone?: MilestoneAccount;
  }>({
    isOpen: false,
    type: 'inspect',
    agreement: null,
  });

  const openDrawer = (
    type: QuickActionType,
    agreement: AgreementAccount,
    milestone?: MilestoneAccount
  ) => {
    setDrawerState({
      isOpen: true,
      type,
      agreement,
      milestone,
    });
  };

  const closeDrawer = () => {
    setDrawerState((prev) => ({ ...prev, isOpen: false }));
  };

  const filtered = agreements
    .filter((a) => {
      if (activeTab === 'my') {
        if (!publicKeyString) return true;
        return a.sponsor === publicKeyString || a.worker === publicKeyString;
      }
      if (activeTab === 'all') return true;
      if (activeTab === 'active') return a.state === AgreementState.ACTIVE || a.state === AgreementState.FUNDED;
      if (activeTab === 'completed') return a.state === AgreementState.COMPLETED;
      return true;
    })
    .filter((a) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        a.title.toLowerCase().includes(term) ||
        a.publicKey.toLowerCase().includes(term) ||
        a.sponsor.toLowerCase().includes(term) ||
        a.worker.toLowerCase().includes(term)
      );
    });

  return (
    <div className="space-y-6 font-mono text-neutral-100 max-w-6xl mx-auto">
      <CreateAgreementDrawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onSuccess={() => {}}
      />
      <TxStateModal state={txState} isOpen={isTxOpen} onClose={resetTx} />

      {drawerState.agreement && (
        <QuickActionModal
          isOpen={drawerState.isOpen}
          onClose={closeDrawer}
          actionType={drawerState.type}
          agreement={drawerState.agreement}
          milestone={drawerState.milestone}
          onExecute={execute}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#26262a]">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wide text-white">
            Escrow Agreement Directory
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Query and inspect non-custodial milestone accounts on Solana Devnet
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateDrawerOpen(true)}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 font-bold"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Agreement</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, PDA, sponsor, or worker address..."
            className="w-full bg-[#000000] border border-[#26262a] rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-200 placeholder-neutral-500 outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#000000] border border-[#26262a] p-1 rounded-xl text-xs">
          {connected && (
            <button
              onClick={() => setActiveTab('my')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'my'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              My Agreements
            </button>
          )}
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            All Agreements
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'active'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'completed'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Directory List */}
      {isLoading ? (
        <div className="p-12 text-center bg-[#000000] border border-[#26262a] rounded-2xl text-xs text-neutral-400 space-y-2">
          <div>Loading on-chain agreements from Solana Devnet...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-[#000000] border border-[#26262a] rounded-2xl space-y-3 text-xs">
          <FileCode className="w-10 h-10 mx-auto text-neutral-600" />
          <h3 className="text-sm font-bold text-white">No Agreements Found</h3>
          <p className="text-neutral-400 max-w-sm mx-auto">
            {activeTab === 'my'
              ? 'No agreements associated with the connected wallet were found.'
              : 'No deployed agreements match your search or filter.'}
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateDrawerOpen(true)}
              className="bg-violet-600 hover:bg-violet-500 font-bold"
            >
              <PlusCircle className="w-4 h-4 mr-1.5" /> Create Escrow Agreement
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((agreement) => (
            <div
              key={agreement.publicKey}
              className="p-5 bg-[#000000] hover:bg-neutral-950 border border-[#26262a] hover:border-violet-500/40 rounded-2xl transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AgreementStateBadge state={agreement.state} />
                    <Link
                      href={`/agreements/${agreement.publicKey}`}
                      className="text-base font-bold text-white hover:text-violet-300 transition-colors"
                    >
                      {agreement.title}
                    </Link>
                  </div>
                  <div className="text-xs text-neutral-400 flex items-center gap-3">
                    <span>Sponsor: {truncateAddress(agreement.sponsor, 4)}</span>
                    <span>•</span>
                    <span>Worker: {truncateAddress(agreement.worker, 4)}</span>
                    <span>•</span>
                    <span>PDA: {truncateAddress(agreement.publicKey, 4)}</span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-base font-black text-violet-400">
                    ${formatUsdc(agreement.totalAmountUsdc)} USDC
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {agreement.milestones.length} Milestones
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#26262a]/60">
                <div className="flex gap-1.5 flex-wrap">
                  {agreement.milestones.map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => openDrawer('inspect', agreement, m)}
                      className="px-2 py-0.5 rounded-lg text-[11px] border bg-[#000000] border-[#26262a] text-neutral-300 hover:border-violet-500/40"
                    >
                      #{idx + 1}: ${formatUsdc(m.amountUsdc)}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/agreements/${agreement.publicKey}`}
                    className="px-3 py-1.5 rounded-xl bg-[#000000] hover:bg-neutral-900 border border-[#26262a] text-neutral-300 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    Details <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
