'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DoneLogo } from './DoneLogo';
import { NetworkBadge } from '../web3/NetworkBadge';
import { WalletConnectButton } from '../web3/WalletConnectButton';
import { useWallet } from '../web3/WalletContext';

export function Navbar() {
  const pathname = usePathname();
  const { usdcBalance } = useWallet();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#26262a] bg-[#000000] backdrop-blur-md font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5">
          <DoneLogo className="w-8 h-8" />
          <div className="flex flex-col">
            <span className="font-black text-base tracking-wider text-white">DONE</span>
            <span className="text-[9px] text-neutral-400">SOLANA DEVNET</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <NetworkBadge />
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}
