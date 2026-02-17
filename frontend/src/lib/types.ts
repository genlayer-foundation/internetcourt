export type ContractStatus =
  | "created"
  | "active"
  | "disputed"
  | "resolving"
  | "resolved"
  | "cancelled";

export type Verdict = "TRUE" | "FALSE" | "UNDETERMINED" | "";

export interface EvidenceDefinitions {
  party_a?: {
    allowed_types?: string[];
    allowed_info?: string[];
    max_chars?: number;
    constraints?: string;
  };
  party_b?: {
    allowed_types?: string[];
    allowed_info?: string[];
    max_chars?: number;
    constraints?: string;
  };
}

export interface MoltContract {
  address: string;
  partyA: string;
  partyB: string;
  statement: string;
  guidelines: string;
  evidenceDefs: EvidenceDefinitions;
  status: ContractStatus;
  evidenceA: string;
  evidenceB: string;
  verdict: Verdict;
  reasoning: string;
  proposedOutcomeA: string;
  proposedOutcomeB: string;
  // Chain routing (optional — present for cross-chain cases)
  chainId?: number;
  chainName?: string;
  factoryId?: number;
  baseFactory?: string;
  escrowAmount?: string;
  // Timestamps (optional — derived from blockchain events)
  createdAt?: string; // ISO 8601 string
  updatedAt?: string; // ISO 8601 string
  // Incomplete data indicator (set when contract read fails but factory metadata is available)
  incomplete?: boolean;
  incompleteReason?: string;
}
