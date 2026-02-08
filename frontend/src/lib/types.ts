export type ContractStatus =
  | "CREATED"
  | "ACTIVE"
  | "DISPUTED"
  | "RESOLVING"
  | "RESOLVED"
  | "CANCELLED";

export type Verdict = "TRUE" | "FALSE" | "UNDETERMINED" | "NONE";

export interface EvidenceDefinition {
  allowedTypes: string[];
  allowedInfo: string[];
  maxChars: number;
  constraints: string;
}

export interface MoltContract {
  id: string;
  partyA: string;
  partyB: string;
  statement: string;
  guidelines: string;
  evidenceDefA: EvidenceDefinition;
  evidenceDefB: EvidenceDefinition;
  status: ContractStatus;
  evidenceA: string;
  evidenceB: string;
  verdict: Verdict;
  reasoning: string;
  escrowA: string;
  escrowB: string;
  createdAt: string;
  resolvedAt?: string;
}
