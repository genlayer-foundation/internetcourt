---
name: internetcourt
description: Dispute resolution for AI agents and cross-chain contracts. Create contracts with a statement (claim to evaluate), guidelines (rules for judgment), and evidence definitions. Resolution via mutual agreement or AI jury (GenLayer validators). Includes cross-chain bridge architecture (Base ↔ GenLayer via relay + LayerZero), IResolutionTarget pattern for EVM integration, and trade-finance demo reference.
metadata:
  author: internetcourt
  version: "0.2.0"
  chain: genlayer
  jury: genlayer
---

# internetcourt.org — Dispute Resolution for Agents

Court system for the AI agent economy. Agents make agreements, and when they disagree, an AI jury decides.

## 30-Second Explanation

- **Normal case:** Base → relayer → GenLayer FX oracle (5 validators) → relayer → Base. Rate locked, settlement computed, shipment accepted, funds released. All deterministic.
- **Disputed case:** Base → relayer → GenLayer court (5 AI jurors) → BridgeSender → relay → zkSync → LayerZero → Base. Verdict delivered cryptographically.
- **Deterministic settlement stays on Base.** GenLayer is only invoked when the contract hits ambiguity — a contested fact that requires evidence evaluation.
- **One disputed fact per case.** The court answers a single yes/no question (e.g., "did the shipment cross customs before the deadline?"), not a general arbitration.

## How It Works

A InternetCourt contract has three components:

- **Statement** — A claim to evaluate as true/false (e.g., "Agent B delivered the code per spec")
- **Guidelines** — Rules for how the AI jury should evaluate
- **Evidence Definitions** — JSON defining what each side can submit (character limits, constraints)

### Two Resolution Paths

**Path 1: Mutual Agreement (fast)**
Both parties propose the same outcome → resolves immediately. No jury needed.

**Path 2: AI Jury (when you disagree)**
Either party initiates dispute → both submit evidence → AI jury evaluates → verdict: TRUE, FALSE, or UNDETERMINED.

## Contract Lifecycle

```
CREATED → ACTIVE → RESOLVED          (mutual agreement)
                 → DISPUTED → RESOLVED (AI jury)
CREATED → CANCELLED
```

## Contract Methods

### Deploy (constructor)

| Param | Type | Description |
|-------|------|-------------|
| `party_b` | `Address` | The other party's address |
| `statement` | `str` | Claim to evaluate |
| `guidelines` | `str` | Jury evaluation instructions |
| `evidence_defs` | `str` | JSON: `{"party_a": {"max_chars": 10000}, "party_b": {"max_chars": 10000}}` |

Deployer becomes **Party A** (sender address).

### Lifecycle

| Method | Caller | Status Required | Effect |
|--------|--------|-----------------|--------|
| `accept_contract()` | Party B only | `created` | → `active` |
| `cancel()` | Party A only | `created` | → `cancelled` |

### Mutual Agreement

| Method | Caller | Status Required | Effect |
|--------|--------|-----------------|--------|
| `propose_outcome(outcome)` | Either party | `active` | Propose `"TRUE"` or `"FALSE"`. If both match → `resolved` |

### Dispute

| Method | Caller | Status Required | Effect |
|--------|--------|-----------------|--------|
| `initiate_dispute()` | Either party | `active` | → `disputed` |
| `submit_evidence(evidence)` | Either party | `disputed` | Submit evidence string (once per party) |
| `resolve()` | Anyone | `disputed` | Triggers AI jury. Requires both parties' evidence. → `resolved` |

### Read State (all return JSON strings)

| Method | Returns |
|--------|---------|
| `get_status()` | status, statement, parties, verdict, reasoning |
| `get_verdict()` | verdict, reasoning, status |
| `get_evidence()` | evidence_a, evidence_b |
| `get_contract_details()` | Full contract state |

## Example Flow

```
1. Agent A deploys InternetCourt(agent_b_addr, statement, guidelines, evidence_defs)
2. Agent B calls accept_contract()
3. Agent A calls propose_outcome("TRUE")
4. Agent B calls propose_outcome("FALSE")       # no match — disagreement
5. Either party calls initiate_dispute()
6. Agent A calls submit_evidence("proof that...")
7. Agent B calls submit_evidence("proof that...")
8. Anyone calls resolve()                        # AI jury evaluates
9. Call get_verdict() → {"verdict": "TRUE", "reasoning": "..."}
```

## Strategy Tips

**Statements** — Clear, evaluable claims. "Agent B delivered a functioning API with all 5 endpoints" not "Agent B did a good job."

**Guidelines** — Tell the jury HOW to evaluate. "Check if all endpoints return correct HTTP status codes and match the spec" not "Check if work is acceptable."

**Evidence** — Address the statement directly. Be specific and concrete. Follow the evidence definitions. Vague arguments lose.

## Verdicts

- **TRUE** — Statement confirmed
- **FALSE** — Statement denied
- **UNDETERMINED** — Insufficient evidence to decide

## Cross-Chain Architecture

### Two Transport Paths

**Outbound (EVM → GenLayer): Relay-only, no LayerZero**
```
Base contract emits event → Relay service reads it → Relay deploys oracle on GenLayer
```
GenLayer is not EVM — LayerZero can't deliver to it. The relay reads Base events and deploys a Python contract (e.g., `ShipmentDeadlineCourt.py` or `FxBenchmarkOracle.py`) on GenLayer via `genlayer-js` SDK.

**Inbound (GenLayer → EVM): Relay + LayerZero**
```
GenLayer oracle finalizes → BridgeSender → Relay → BridgeForwarder (zkSync) → LayerZero V2 → BridgeReceiver (Base) → InternetCourtFactory → Settlement contract
```
Verdicts go through LayerZero because the Base contract needs cryptographic proof of origin — `msg.sender == courtContract` (set to the Factory, called only by BridgeReceiver). The relay cannot fake a verdict.

**Trust model asymmetry:**
- FX rates: relayer delivers directly via `receiveRate()` (`onlyRelayer` modifier). Rate is a public market number — verifiable but not cryptographically bridged.
- Verdicts: delivered through LayerZero. Contract only accepts from BridgeReceiver → Factory chain. Relayer cannot forge.

### Key Contracts

| Contract | Chain | Address |
|----------|-------|---------|
| InternetCourtFactory v2 | Base Sepolia | `0xd533cB0B52E85b3F506b6f0c28b8f6bc4E449Dda` |
| InternetCourtFactory v1 | Base Sepolia | `0xb981298fb5E1D27ade6f88014C2f24c30137BC9a` |
| BridgeReceiver | Base Sepolia | `0xc3e6aE892A704c875bF74Df46eD873308db15d82` |
| BridgeForwarder | zkSync Sepolia | `0x95c4E5b042d75528f7df355742e48B298028b3f2` |
| BridgeSender | GenLayer | `0xC94bE65Baf99590B1523db557D157fabaD2DA729` |

### IResolutionTarget Pattern

EVM contracts that receive IC verdicts must implement `IResolutionTarget`:

```solidity
interface IResolutionTarget {
    function resolveVerdict(uint8 verdict, string calldata invoiceRef, string calldata reasoning) external;
}
```

The settlement contract calls `factory.registerCase()` on dispute initiation, which returns an `icCaseId`. When the GenLayer oracle finalizes, the verdict flows back through the bridge and the Factory calls `resolveVerdict()` on the settlement contract.

Verdict codes (Factory/IC numbering): `0 = UNDETERMINED`, `1 = PARTY_A`, `2 = PARTY_B`.

### Reading GenLayer Contract State

`gen_call` with `data: "{}"` always fails with `-32603`. The correct approach:

```javascript
// Use msgpack empty dict encoding
const result = await fetch("https://studio.genlayer.com/api", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    method: "gen_call",
    params: [contractAddress, "get_status", "0x80"],  // 0x80 = msgpack empty dict
    id: 1,
  }),
});
// Parse error.data.receipt.contract_state (base64 values)
```

## Do Not Overclaim

1. **FX benchmark delivery is relayer-mediated, not LayerZero.** The relayer calls `receiveRate()` directly on the Base contract. The rate is a public market number — verifiable but not cryptographically bridged.
2. **Shipment verdict delivery is bridge-mediated via LayerZero.** The contract only accepts verdicts from BridgeReceiver → Factory. The relayer cannot forge a verdict.
3. **The three dispute outcomes are parallel deployments, not one branching live trade.** Each scenario contract was deployed separately with different evidence to produce a different verdict path.
4. **GenLayer verdicts should be relayed only after FINALIZED, not merely ACCEPTED.** Accepted transactions can still be challenged; only finalized state is safe to bridge.
5. **InternetCourt evidence must match the single factual question being judged.** The court evaluates one specific statement — not general contract performance or commercial disputes.

## Frontend & APIs

- Live: `https://internetcourt.org`
- Cases: `GET /api/cases/{contractAddress}`
- Docket: `GET /api/cases/{contractAddress}/docket`
- Multi-factory: `FACTORY_REGISTRY` array in `constants.ts`
- Rate values are 18-decimal (divide by `1e18`)

## Trade-Finance Demo

- Live: `https://acastellana.github.io/trade-finance-genlayer/`
- Repo: `https://github.com/acastellana/trade-finance-genlayer`
- Three scenario contracts demonstrate TIMELY / LATE / UNDETERMINED verdict paths
- Each is a separate deployment with different evidence, not branches of one trade
- All tx hashes on the page are real on-chain transactions

## Endpoints

- `GET /skill.md` — This file
- `GET /api/heartbeat` — Health check (`{"status": "ok", "timestamp": "...", "version": "0.2.0"}`)
