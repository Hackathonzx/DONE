/**
 * Solana Mobile Wallet Deep-Linking & Universal Links
 * Enables opening dApps directly within Phantom Mobile and Solflare Mobile apps on iOS and Android
 */

export function isMobileBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || (window.innerWidth <= 768 && isTouch);
}

export function getPhantomDeepLink(targetUrl?: string): { universalLink: string; nativeScheme: string } {
  const current = targetUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const encoded = encodeURIComponent(current);
  return {
    universalLink: `https://phantom.app/ul/browse/${encoded}?ref=${encodeURIComponent(current)}`,
    nativeScheme: `phantom://browse/${encoded}`,
  };
}

export function getSolflareDeepLink(targetUrl?: string): { universalLink: string; nativeScheme: string } {
  const current = targetUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const encoded = encodeURIComponent(current);
  return {
    universalLink: `https://solflare.com/ul/v1/browse/${encoded}`,
    nativeScheme: `solflare://browse/${encoded}`,
  };
}

export function launchMobileWallet(wallet: 'phantom' | 'solflare', targetUrl?: string): void {
  if (typeof window === 'undefined') return;
  const links = wallet === 'phantom' ? getPhantomDeepLink(targetUrl) : getSolflareDeepLink(targetUrl);
  
  // Try universal link navigation
  try {
    if (window.top && window.top !== window) {
      // In iframe preview, attempt opening top window or target _blank
      try {
        window.top.location.href = links.universalLink;
        return;
      } catch {
        // iframe sandbox may restrict top navigation, open new window
      }
    }
    window.location.href = links.universalLink;
  } catch {
    window.open(links.universalLink, '_blank', 'noopener,noreferrer');
  }
}
