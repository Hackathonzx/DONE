import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';
import { Navbar } from '@/components/protocol/Navbar';

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
    <html lang="en" className="dark bg-black text-zinc-100">
      <body className="min-h-screen bg-black text-zinc-100 antialiased font-mono selection:bg-cyan-500 selection:text-black">
        <AppProviders>
          <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-black to-black">
            <Navbar />
            <main className="flex-1 w-full">{children}</main>
            <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-xs text-zinc-400">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="font-semibold text-zinc-400">DONE PROTOCOL ENGINE</span>
                  <span className="text-zinc-700">/</span>
                  <span>Solana Anchor Program ID: DoneProt...</span>
                </div>
                <div className="flex items-center gap-4 text-zinc-400 text-[11px]">
                  <span>SPL USDC MINT: 4zMMC9...ncDU</span>
                  <span>NETWORK: SOLANA DEVNET</span>
                </div>
              </div>
            </footer>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
