'use client';

/**
 * Polyfill to prevent "Cannot set property fetch of #<Window> which has only a getter"
 * caused by legacy cross-fetch polyfills inside Anchor / Web3 libraries.
 */
if (typeof window !== 'undefined') {
  try {
    const desc =
      Object.getOwnPropertyDescriptor(window, 'fetch') ||
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'fetch');
    if (desc && (!desc.writable || !desc.set)) {
      const origFetch = window.fetch.bind(window);
      Object.defineProperty(window, 'fetch', {
        value: origFetch,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
  } catch {
    // Ignore error if descriptor cannot be modified
  }
}

export {};
