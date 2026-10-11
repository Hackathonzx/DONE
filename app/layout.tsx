import '@/lib/polyfills';
import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';
import { AppShell } from '@/components/shell/AppShell';

export const metadata: Metadata = {
  title: 'DONE Protocol | Programmable Settlement Infrastructure on Solana',
  description:
    'Programmable settlement infrastructure for verifiable work on Solana. Deterministic escrow, Definition of Done (DoD) verification, and USDC milestone releases.',
  openGraph: {
    title: 'DONE Protocol | Programmable Settlement Infrastructure on Solana',
    description:
      'Programmable settlement infrastructure for verifiable work on Solana. Deterministic escrow, Definition of Done (DoD) verification, and USDC milestone releases.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DONE Protocol | Programmable Settlement Infrastructure on Solana',
    description:
      'Programmable settlement infrastructure for verifiable work on Solana. Deterministic escrow, Definition of Done (DoD) verification, and USDC milestone releases.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark bg-[#16171a] text-neutral-100">
      <body className="min-h-screen bg-[#16171a] text-neutral-100 antialiased font-mono selection:bg-neutral-800 selection:text-white" suppressHydrationWarning>
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
