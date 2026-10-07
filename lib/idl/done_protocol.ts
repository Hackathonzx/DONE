import idlJson from './done_protocol.json';

export type DoneProtocolIdl = typeof idlJson;

export interface AnchorErrorDefinition {
  code: number;
  name: string;
  msg: string;
}

export const PROTOCOL_ERRORS: Record<number, AnchorErrorDefinition> = {
  6000: { code: 6000, name: 'InvalidAgreementState', msg: 'Agreement state does not permit this instruction.' },
  6001: { code: 6001, name: 'InvalidDoDHash', msg: 'Definition of Done canonical hash mismatch.' },
  6002: { code: 6002, name: 'MilestoneNotVerified', msg: 'Milestone must be in VERIFIED state before settlement release.' },
  6003: { code: 6003, name: 'InsufficientVaultBalance', msg: 'Escrow vault balance is insufficient to release milestone USDC.' },
  6004: { code: 6004, name: 'UnauthorizedWorker', msg: 'Signer is not the designated worker for this agreement.' },
  6005: { code: 6005, name: 'UnauthorizedVerifier', msg: 'Signer is not authorized to verify this milestone.' },
  6006: { code: 6006, name: 'EscrowAlreadyFunded', msg: 'Agreement escrow vault has already been funded.' },
  6007: { code: 6007, name: 'MilestoneAlreadyReleased', msg: 'Milestone funds have already been released to worker.' },
};

export function parseProgramError(errorStr: string): { code: number; name: string; message: string } | null {
  for (const [codeStr, def] of Object.entries(PROTOCOL_ERRORS)) {
    const code = Number(codeStr);
    if (errorStr.includes(String(code)) || errorStr.toLowerCase().includes(def.name.toLowerCase())) {
      return { code, name: def.name, message: def.msg };
    }
  }
  return null;
}
