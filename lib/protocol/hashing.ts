import bs58 from 'bs58';

/**
 * Standard Canonical Definition of Done (DoD) Hashing Primitive
 * Serializes criteria into normalized, alphabetically sorted JSON before SHA-256
 */
export async function hashDefinitionOfDone(criteria: string[]): Promise<Uint8Array> {
  const normalized = JSON.stringify(
    criteria
      .map((c) => c.trim())
      .filter(Boolean)
      .sort()
  );
  const buffer = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return new Uint8Array(hashBuffer);
}

export const hashDoDCriteria = hashDefinitionOfDone;

/**
 * Canonical terms hashing primitive
 */
export async function hashAgreementTerms(
  terms: string | {
    title: string;
    description: string;
    termsText: string;
  }
): Promise<Uint8Array> {
  const canonicalString =
    typeof terms === 'string'
      ? terms.trim()
      : JSON.stringify({
          description: terms.description.trim(),
          termsText: terms.termsText.trim(),
          title: terms.title.trim(),
        });
  const buffer = new TextEncoder().encode(canonicalString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return new Uint8Array(hashBuffer);
}

/**
 * Canonical evidence hash primitive
 */
export async function hashEvidencePayload(payload: {
  metadataUri: string;
  notes: string;
  deliverableLinks: string[];
}): Promise<Uint8Array> {
  const canonical = JSON.stringify({
    deliverableLinks: payload.deliverableLinks.map((l) => l.trim()).sort(),
    metadataUri: payload.metadataUri.trim(),
    notes: payload.notes.trim(),
  });
  const buffer = new TextEncoder().encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return new Uint8Array(hashBuffer);
}

/**
 * Convert Uint8Array to lower-case hex string (64 characters for SHA-256)
 */
export function uint8ArrayToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const match = cleanHex.match(/.{1,2}/g);
  if (!match) return new Uint8Array();
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)));
}

/**
 * Convert Uint8Array to base58 string
 */
export function uint8ArrayToBase58(buffer: Uint8Array): string {
  return bs58.encode(buffer);
}
