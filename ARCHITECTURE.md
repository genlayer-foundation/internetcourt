# internetcourt.org — System Architecture

## System Overview

internetcourt.org is dispute resolution infrastructure for the AI agent economy. It uses a **dual-chain architecture** with a **three-key system**: Base (L2) for escrow and contract storage, GenLayer for AI jury evaluation (Resolution key — only invoked on disagreement). A LayerZero V2 bridge connects the two chains. An **API layer** enables AI agents to interact programmatically. Contracts follow a **two-phase lifecycle**: creation (dormant) and dispute resolution (only if parties disagree).

```
┌─────────────┐     ┌──────────────────────────┐
│ AI Agents   │────▶│  API / SDK               │
│ (Primary)   │     │  (REST + Agent SDKs)     │
└─────────────┘     └──────────┬───────────────┘
                               │
┌─────────────┐     ┌──────────┴───────────────┐
│ Browser     │────▶│ Next.js Frontend (Vercel) │
│ (Monitors)  │     │ (Human monitoring UI)     │
└─────────────┘     └──────────┬───────────────┘
                               │
                  ┌────────────┴────────────┐
                  │                         │
                  ▼                         ▼
┌─────────────────────┐   ┌─────────────────────────┐
│    Base (L2)        │   │    GenLayer Network      │
│                     │   │                          │
│ ┌─────────────────┐ │   │ ┌──────────────────────┐ │
│ │ Escrow Contract │ │   │ │ Dispute Resolution   │ │
│ │ (Solidity)      │ │   │ │ Intelligent Contract │ │
│ │                 │ │   │ │ (Python)             │ │
│ │ • Hold funds    │ │   │ └──────────┬───────────┘ │
│ │ • Store terms   │ │   │            │             │
│ │ • Release on    │ │   │ ┌──────────▼───────────┐ │
│ │   verdict       │ │   │ │  AI Validators       │ │
│ └────────┬────────┘ │   │ │  (Jury)              │ │
│          │          │   │ │  5+ LLMs per ruling   │ │
│          │          │   │ └──────────────────────┘ │
└──────────┼──────────┘   └──────────┬──────────────┘
           │                         │
           └────────┬────────────────┘
                    │
         ┌──────────▼──────────┐
         │  LayerZero V2       │
         │  Cross-chain bridge │
         └─────────────────────┘
```

## Why This Architecture?

- **Base** is a mature, low-cost L2 with established DeFi tooling — ideal for holding escrow funds (USDC) and storing agreement data on-chain
- **GenLayer** provides the AI jury system (Optimistic Democracy) — no other chain has protocol-level AI validation with multi-model consensus
- **LayerZero V2** connects them — reuses the cross-chain pattern from argue.fun and pm-kit
- **API layer** makes the platform agent-native — AI agents interact via REST/SDK, not a web browser

## Components

### API Layer (Agent Interface)

The API is the primary interface for AI agents. Every operation available through the UI is also available via API.

- **REST API**: Create agreements, accept/reject, submit disputes, submit arguments, query status
- **Agent SDKs**: Python and TypeScript SDKs wrapping the API for common agent frameworks
- **MCP Integration** (v2): Model Context Protocol support for native agent tool use
- **Authentication**: Wallet-based signing (agents have wallets) or API keys for custodial setups
- **Webhooks**: Notify agents of state changes (agreement accepted, dispute raised, verdict delivered)

```
API Endpoints (v1):
POST   /contracts                     - Create contract (statement + guidelines + evidence defs)
POST   /contracts/:id/accept          - Agent B accepts agreement (no deposit)
POST   /contracts/:id/propose-outcome - Propose outcome (mutual agreement path)
POST   /contracts/:id/confirm-outcome - Confirm proposed outcome (mutual agreement path)
POST   /contracts/:id/dispute         - Initiate dispute (disagreement path)
POST   /contracts/:id/evidence        - Submit evidence per evidence definitions
GET    /contracts/:id                 - Get contract details
GET    /contracts/:id/verdict         - Get verdict (TRUE / FALSE / UNDETERMINED)
GET    /contracts?party=0x...         - List contracts for a party
```

### Frontend (Next.js on Vercel — Human Monitoring Dashboard)

The web UI is for humans monitoring their agents' cases, not the primary interaction mode.

- **Framework**: Next.js with App Router
- **Wallet connection**: MetaMask / wallet adapter for Base chain
- **Dashboard**: View agent agreements, dispute status, verdicts, escrow balances
- **Case viewer**: Browse agreement terms, arguments, AI jury reasoning
- **Manual override**: Humans can intervene on their agent's behalf if needed
- **SDK**: GenLayerJS (`genlayer-js`) for GenLayer interactions, viem/wagmi for Base

### Base Chain — Escrow & Data Storage (Solidity)

The Base contract manages funds and contract lifecycle:

- Store contract data (parties, statement, guidelines, evidence definitions, status)
- Accept agreement flow (Agent B joins free, no deposit)
- Hold escrow deposit (USDC, deposited by creator only)
- Handle mutual agreement resolution (2-of-2 — no bridge needed)
- Record dispute initiation and evidence submissions
- Validate evidence against pre-defined evidence definitions
- Receive verdict from GenLayer via bridge (only on disagreement)
- Release escrow based on resolution outcome (TRUE / FALSE / UNDETERMINED)

### GenLayer — AI Jury Evaluation (Python)

The GenLayer intelligent contract is the Resolution key — only invoked when parties disagree:

- Receive dispute data (statement, guidelines, evidence from both parties) via bridge
- Evaluate the statement against guidelines using submitted evidence
- Trigger AI jury evaluation using `gl.eq_principle.prompt_non_comparative`
- Validators (each with a different LLM) independently evaluate
- Return verdict to Base via bridge: TRUE / FALSE / UNDETERMINED

### LayerZero V2 Bridge

Cross-chain messaging between Base and GenLayer — only used when parties disagree (mutual agreement resolves on Base alone):

- **Base -> GenLayer**: Send dispute data (statement + guidelines + evidence from both sides) for evaluation
- **GenLayer -> Base**: Return verdict (TRUE / FALSE / UNDETERMINED) for escrow release
- Reuses patterns from argue.fun and pm-kit bridge implementations

### AI Jury (GenLayer Validators)

GenLayer's built-in Optimistic Democracy consensus:

- **5 validators** randomly selected per transaction (1 leader + 4 co-validators)
- Each validator uses a **different LLM** (GPT-4, Claude, Llama, etc.)
- Leader proposes a ruling, co-validators verify it meets quality criteria
- **Majority vote** determines acceptance
- **Built-in appeal**: 5 -> 23 -> 47 -> 95 validators (protocol-level, no custom code needed)
- **30-minute finality window** for appeals
- Uses `eq_principle.prompt_non_comparative` — leader renders judgment, validators verify quality/fairness

## Contract Design

### Three-Key System

The core security model for internetcourt contracts:

- **Agent A key** — First party
- **Agent B key** — Second party
- **Resolution key** — AI jury (GenLayer)

**Key rule:** If Agent A and Agent B BOTH agree on the outcome, the AI jury is never called. The contract resolves by mutual agreement (2-of-2). Only when they DISAGREE does the AI jury get invoked as tiebreaker (1-of-1).

### Contract Data Model

```solidity
struct Contract {
    uint256 id;
    address agentA;              // First party (agent or human wallet) — Agent A key
    address agentB;              // Second party (agent or human wallet) — Agent B key

    // Three components
    string statement;            // Claim to evaluate (true/false)
    string guidelines;           // Instructions for AI jury evaluation
    string evidenceDefs;             // Evidence definitions (JSON, describes what each party can submit)

    // Evidence submissions
    string evidenceA;            // Agent A's submitted evidence
    string evidenceB;            // Agent B's submitted evidence

    // Resolution
    Resolution resolution;       // TRUE / FALSE / UNDETERMINED
    string reasoning;            // AI jury's reasoning (if jury invoked)

    // Escrow
    uint256 escrowAmount;        // Escrow deposit (USDC, deposited by creator only)

    // Metadata
    Status status;               // CREATED → ACTIVE → DISPUTED → RESOLVING → RESOLVED / CANCELLED
    uint256 evidenceWindow;      // Time window for evidence submission
    uint256 createdAt;
}

enum Resolution { NONE, TRUE, FALSE, UNDETERMINED }
enum Status { CREATED, ACTIVE, DISPUTED, RESOLVING, RESOLVED, CANCELLED }
```

### GenLayer Dispute Contract (Python)

```python
class InternetCourtJury(gl.Contract):
    # Receives dispute data from Base via bridge
    # Only invoked when Agent A and Agent B disagree (Resolution key)
    # Returns verdict: TRUE / FALSE / UNDETERMINED

    @gl.public.write
    def evaluate_dispute(
        self, statement: str, guidelines: str,
        evidence_a: str, evidence_b: str
    ) -> str:
        s, g, ea, eb = statement, guidelines, evidence_a, evidence_b

        def nondet():
            prompt = f"""You are an impartial AI juror in the InternetCourt
            dispute resolution system. You must evaluate a statement
            based on the provided guidelines and evidence.

            ## Statement to Evaluate
            {s}

            ## Guidelines (Rules for Judgment)
            {g}

            ## Evidence from Agent A (supports TRUE)
            {ea}

            ## Evidence from Agent B (supports FALSE)
            {eb}

            ## Your Task
            1. Read the statement and guidelines carefully
            2. Evaluate both sides' evidence per the guidelines
            3. Determine: is the statement TRUE, FALSE, or UNDETERMINED?
            4. UNDETERMINED = not enough evidence to decide either way

            Respond ONLY with JSON:
            {{"verdict": "TRUE" | "FALSE" | "UNDETERMINED", "reasoning": "..."}}
            """
            return gl.nondet.exec_prompt(prompt, response_format='json')

        verdict = gl.eq_principle.prompt_non_comparative(
            nondet,
            task="Evaluate a statement based on guidelines and evidence",
            criteria="Verdict must be TRUE, FALSE, or UNDETERMINED with clear reasoning"
        )
        return json.dumps(verdict)
```

### State Machine

```
 ┌─────────┐  acceptAgreement()  ┌────────┐  disagree()  ┌──────────┐  evaluate()  ┌───────────┐  verdict  ┌──────────┐
 │ CREATED │───────────────>│ ACTIVE │────────────>│ DISPUTED │───────────>│ RESOLVING │────────>│ RESOLVED │
 └─────────┘                └────────┘              └──────────┘            └───────────┘         └──────────┘
      │                        │                                                                       ▲
      │ cancel()               │ mutual_resolve()                                                      │
      ▼                        │  (2-of-2 agreement)                                                   │
 ┌───────────┐                 └───────────────────────────────────────────────────────────────────────-┘
 │ CANCELLED │
 └───────────┘
```

**States**:
- **CREATED** — Contract deployed with statement + guidelines + evidence definitions. Creator's USDC escrow deposited. Waiting for Agent B. Optional `joinDeadline` — if set and passed, anyone can call `reclaimOnExpiry()` to refund creator.
- **ACTIVE** — Agent B has accepted the agreement (no deposit required). Contract is live but dormant — waiting for outcome assessment.
- **DISPUTED** — Agents disagree on the outcome. Evidence submission window is open. Each side submits evidence per the pre-defined evidence definitions.
- **RESOLVING** — Evidence window closed (or both submitted). AI jury (Resolution key) is evaluating.
- **RESOLVED** — Verdict delivered: TRUE, FALSE, or UNDETERMINED. Escrow released per outcome.
- **CANCELLED** — Contract cancelled before activation, escrow returned.

### Resolution Outcomes

| Outcome | Meaning | Escrow |
|---------|---------|--------|
| **TRUE** | The statement is true — Agent A's position confirmed | Released per contract terms |
| **FALSE** | The statement is false — Agent B's position confirmed | Released per contract terms |
| **UNDETERMINED** | Not enough evidence to decide | Possible additional evidence round, or returned |

### Two Paths to Resolution

1. **Mutual Agreement (2-of-2)** — Both Agent A and Agent B sign off on the same outcome (TRUE or FALSE). No AI jury needed. Fast, cheap.
2. **AI Jury (1-of-1 tiebreaker)** — Agents disagree. Both submit evidence. AI jury evaluates statement against guidelines using submitted evidence. Returns TRUE / FALSE / UNDETERMINED.

## Data Flow

### Phase 1: Create Contract (via API or UI)

```
Agent A -> API -> Base.createContract(agentB, statement, guidelines, evidenceDefs)
  -> Agent A deposits escrow (USDC) via factory transferFrom
  -> Contract stored on Base with status: CREATED
  -> Agent B notified (webhook or polling)
```

### Accept Agreement

```
Agent B -> API -> Base.acceptAgreement(contractId)
  -> Agent B joins free (no deposit required)
  -> Status: CREATED -> ACTIVE
  -> Contract is now live but dormant
```

### Phase 2a: Mutual Agreement (2-of-2 — no jury)

```
Agent A -> API -> Base.proposeOutcome(contractId, TRUE/FALSE)
Agent B -> API -> Base.confirmOutcome(contractId, TRUE/FALSE)
  -> If both agree on same outcome -> contract resolves immediately
  -> Status: ACTIVE -> RESOLVED
  -> Escrow released per outcome
  -> No AI jury, no cross-chain bridge, no cost
```

### Phase 2b: Dispute (disagreement — jury invoked)

```
Either Party -> API -> Base.initiateDispute(contractId)
  -> Status: ACTIVE -> DISPUTED
  -> Evidence submission window opens
```

### Submit Evidence

```
Agent A -> API -> Base.submitEvidence(contractId, evidence)
Agent B -> API -> Base.submitEvidence(contractId, evidence)
  -> Evidence validated against pre-defined evidence definitions
  -> Once both submitted (or window expires) -> Status: DISPUTED -> RESOLVING
  -> Triggers cross-chain bridge to GenLayer
```

### Resolve (GenLayer AI Jury — Resolution Key)

```
Base -> LayerZero V2 -> GenLayer.evaluateDispute(statement, guidelines, evidenceA, evidenceB)
  -> 5+ AI validators independently assess the case
  -> Each evaluates statement against guidelines using submitted evidence
  -> Leader proposes verdict (TRUE/FALSE/UNDETERMINED), co-validators verify
  -> Consensus reached -> verdict determined
  -> GenLayer -> LayerZero V2 -> Base.receiveVerdict(contractId, verdict)
  -> Escrow released on Base per verdict
  -> Status: RESOLVING -> RESOLVED
  -> Webhook notification sent to both parties
```

### Appeal (Protocol-Level)

```
Losing Party -> API -> GenLayerJS.appealTransaction(txId)
  -> More validators re-evaluate (23, then 47, then 95...)
  -> New verdict replaces old if overturned
  -> Updated verdict bridged back to Base
```

## Agent Integration Patterns

### Direct API (Any Agent Framework)

```python
import requests

# Agent creates a contract with statement + guidelines + evidence definitions
response = requests.post("https://api.internetcourt.org/contracts", json={
    "party_b": "0xAgentBAddress",
    "statement": "Agent B delivered a complete code review per the agreed scope.",
    "guidelines": "Evaluate whether the review covers: security (OWASP Top 10), "
                  "performance (queries > 100ms), and code quality (lint compliance).",
    "evidence_definitions": {
        "party_a": {"types": ["text", "json", "url"], "max_chars": 10000},
        "party_b": {"types": ["text", "json", "url"], "max_chars": 10000},
    },
    "escrow_amount": "100000000",  # 100 USDC
    "signed_tx": "0x..."  # Signed Base transaction
})
contract_id = response.json()["id"]
```

### MCP Tool Integration (v2)

```json
{
  "name": "internetcourt_create_contract",
  "description": "Create a internetcourt contract with statement, guidelines, and evidence definitions",
  "input_schema": {
    "type": "object",
    "properties": {
      "counterparty": { "type": "string" },
      "statement": { "type": "string", "description": "Claim to evaluate as true/false" },
      "guidelines": { "type": "string", "description": "Instructions for AI jury evaluation" },
      "evidence_definitions": { "type": "object", "description": "What each side can submit" },
      "escrow_amount": { "type": "string" }
    }
  }
}
```

### Webhook Notifications

```json
{
  "event": "verdict_delivered",
  "contract_id": "42",
  "verdict": {
    "outcome": "FALSE",
    "reasoning": "The statement 'Agent B delivered a complete review' is FALSE — the review was missing the security section..."
  },
  "resolution": "FALSE",
  "escrow_released_to": "0xAgentAAddress"
}
```

## Frontend-Chain Integration

### Base Chain (Escrow & Data)

Standard EVM integration with viem/wagmi:

```typescript
import { useWriteContract, useReadContract } from 'wagmi';

// Create contract with statement + guidelines + evidence definitions
// First approve USDC spend by factory, then create agreement
const { writeContract } = useWriteContract();
writeContract({
  address: INTERNETCOURT_BASE_ADDRESS,
  abi: internetcourtAbi,
  functionName: 'createAgreement',
  args: [agentBAddress, statement, guidelines, evidenceDefinitions, escrowAmount],
  // No value — escrow is USDC (ERC-20), pulled via transferFrom
});
```

### GenLayer (Read Verdict Status)

```typescript
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const glClient = createClient({ chain: studionet, account: userAddress });

// Read verdict
const verdict = await glClient.readContract({
  address: INTERNETCOURT_GL_ADDRESS,
  functionName: 'get_verdict',
  args: [caseId],
});

// Appeal a verdict
const appealTx = await glClient.appealTransaction({ txId });
```

## Escrow Pattern

### v1 — USDC Escrow on Base (One-Sided Deposit)

- Creator (partyA) deposits USDC escrow when creating the agreement via factory
- Factory pulls USDC from caller via `transferFrom`, deploys Agreement, transfers USDC to the new Agreement contract
- PartyB joins free via `acceptAgreement()` (no deposit required)
- On mutual agreement (2-of-2): escrow released per agreed outcome
- On jury verdict (TRUE/FALSE): escrow released per verdict
- On UNDETERMINED: escrow returned to creator
- On cancel (before activation): escrow returned to creator
- On join deadline expiry: anyone can call `reclaimOnExpiry()` to refund creator
- On evidence deadline expiry with no counter-evidence: `resolveByDefault()` awards escrow to dispute initiator
- Pull-based withdrawals via `pendingWithdrawals` mapping + `claimFunds()`

### Supported Assets

- USDC (ERC-20) — stable value for predictable escrow

## Deployment

| Component | Platform | Details |
|-----------|----------|---------|
| API | Vercel / standalone | REST API for agent interaction |
| Frontend | Vercel | Next.js app, domain: internetcourt.org |
| Escrow Contract | Base (L2) | Solidity contract for escrow + agreement data |
| Jury Contract | GenLayer | Intelligent contract for AI dispute evaluation |
| Bridge | LayerZero V2 | Cross-chain messaging between Base <-> GenLayer |
| Domain | Vercel DNS | internetcourt.org |

### Deployment Workflow

```
1. Deploy escrow contract to Base Sepolia (testnet)
2. Deploy jury contract to GenLayer Testnet Bradbury
3. Configure LayerZero V2 bridge between contracts
4. Deploy API layer
5. Deploy frontend to Vercel
6. Test full flow on testnets (both API and UI)
7. Migrate to Base mainnet + GenLayer mainnet (when available)
```

## Open Questions

1. **LayerZero V2 + GenLayer** — Exact integration pattern for the bridge. Reference argue.fun/pm-kit implementations.
2. **GenLayer mainnet timeline** — Currently testnet only (Bradbury). Plan for potential API changes before mainnet.
3. **Gas optimization** — Minimize cross-chain message size. Send only essential dispute data to GenLayer.
4. **Prompt injection** — User/agent-submitted text becomes part of LLM prompts. Need robust prompt framing to prevent manipulation. Agents may be more sophisticated at prompt injection than humans.
5. **Privacy** — All on-chain data is public. Consider privacy-preserving options for sensitive disputes.
6. **Fallback** — What happens if GenLayer bridge fails or times out? Need a timeout/refund mechanism on Base.
7. **Agent identity** — How do agents authenticate? Wallet-based signing? API keys? Integration with ERC-8004 or similar standards?
8. **Agent reputation persistence** — How to track agent dispute history across different agent instances/versions?
9. **Multi-agent pipeline disputes** — How to handle disputes that involve more than two parties in a workflow?
