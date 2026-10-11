import idlJson from './done_protocol.json';

export type DoneProtocolIdl = typeof idlJson;

export interface AnchorErrorDefinition {
  code: number;
  name: string;
  msg: string;
}

export const PROTOCOL_ERRORS: Record<number, AnchorErrorDefinition> = {
  6000: { code: 6000, name: 'InvalidAmount', msg: 'Amount must be greater than zero.' },
  6001: { code: 6001, name: 'InvalidAgreementStatus', msg: 'Agreement state does not permit this instruction.' },
  6002: { code: 6002, name: 'AllocationExceedsTotal', msg: 'Milestone allocation exceeds agreement total.' },
  6003: { code: 6003, name: 'InvalidMilestoneIndex', msg: 'Milestone index must be sequential.' },
  6004: { code: 6004, name: 'Unauthorized', msg: 'Signer is unauthorized for this instruction.' },
  6005: { code: 6005, name: 'InvalidPaymentMint', msg: 'Payment mint does not match the agreement.' },
  6006: { code: 6006, name: 'InvalidWorker', msg: 'Worker must be a valid key different from the sponsor.' },
  6007: { code: 6007, name: 'InvalidDefinitionHash', msg: 'Definition of Done hash cannot be empty.' },
  6008: { code: 6008, name: 'InvalidVerifier', msg: 'Verifier public key cannot be the default public key.' },
  6009: { code: 6009, name: 'InvalidEvidenceHash', msg: 'Evidence hash cannot be empty.' },
  6010: { code: 6010, name: 'InvalidMilestoneStatus', msg: 'Milestone is not in the required status.' },
  6011: { code: 6011, name: 'InvalidWorkerTokenAccount', msg: 'Worker token account does not belong to the assigned worker.' },
  6012: { code: 6012, name: 'InvalidEscrowAccount', msg: 'Escrow token account is invalid.' },
  6013: { code: 6013, name: 'ReleaseExceedsTotal', msg: 'Release would exceed the agreement total.' },
  6014: { code: 6014, name: 'InvalidRejectionReason', msg: 'Rejection reason hash cannot be empty.' },
  6015: { code: 6015, name: 'IncompleteMilestoneAllocation', msg: 'All milestone allocations must equal 100% of the agreement total before acceptance.' },
  6016: { code: 6016, name: 'AgreementAlreadyAccepted', msg: 'The worker has already accepted this agreement.' },
  6017: { code: 6017, name: 'WorkerAcceptanceRequired', msg: 'The assigned worker must accept the agreement on-chain before funding.' },
};

export function parseProgramError(errorObj: any): { code: number; name: string; message: string } | null {
  if (!errorObj) return null;

  const errorStr = typeof errorObj === 'string'
    ? errorObj
    : [
        errorObj?.message,
        errorObj?.logs?.join('\n'),
        JSON.stringify(errorObj),
      ].filter(Boolean).join('\n');

  for (const [codeStr, def] of Object.entries(PROTOCOL_ERRORS)) {
    const code = Number(codeStr);
    const hexCode = `0x${code.toString(16)}`;

    if (
      errorStr.includes(String(code)) ||
      errorStr.toLowerCase().includes(hexCode.toLowerCase()) ||
      errorStr.toLowerCase().includes(def.name.toLowerCase())
    ) {
      return { code, name: def.name, message: def.msg };
    }
  }

  // Check for standard Anchor custom program error pattern: "Custom program error: 0x177f" (6015)
  const hexMatch = errorStr.match(/Custom program error: (0x[0-9a-fA-F]+)/);
  if (hexMatch && hexMatch[1]) {
    const code = parseInt(hexMatch[1], 16);
    if (PROTOCOL_ERRORS[code]) {
      return {
        code,
        name: PROTOCOL_ERRORS[code].name,
        message: PROTOCOL_ERRORS[code].msg,
      };
    }
  }

  return null;
}
