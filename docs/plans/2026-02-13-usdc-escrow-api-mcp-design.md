# USDC Escrow, API & MCP Design

**Date**: 2026-02-13
**Status**: Approved
**Approach**: Refactor existing Agreement.sol (not rewrite)

## Confirmed Requirements

- **Escrow**: USDC on Base. Only creator deposits. Party B joins free. Winner takes all. UNDETERMINED = refund to creator.
- **No-money option**: Disputes can be created without escrow (reputational only).
- **Join deadline**: Creator sets time-based expiry. If Party B doesn't join, creator reclaims automatically.
- **Default judgment**: No evidence after deadline = disputer wins automatically.
- **Evidence**: On-chain string storage with allowed types, max chars, constraints validated in Solidity.
- **API**: Next.js API routes for discovery/convenience. Smart contracts are the primary agent interface.
- **MCP**: Separate MCP server for high-level agent access.
- **External callbacks**: Dropped for v1.

## Section 1: Agreement.sol Refactor

### Escrow Changes

Current: ETH via msg.value. Both parties deposit equal amounts.

New constructor params:
- `address usdcToken` — USDC contract address on Base
- `uint256 escrowAmount` — amount in USDC (0 = no-money dispute)
- `uint256 joinDeadline` — block.timestamp after which creator can reclaim

Flow:
- `escrowAmount == 0` → no-money dispute, skip all escrow logic
- `escrowAmount > 0` → creator pre-approves USDC, contract calls `transferFrom(creator, address(this), escrowAmount)` at creation
- Party B calls `acceptAgreement()` with no deposit
- After `joinDeadline`, anyone can call `reclaimOnExpiry()` to return USDC to creator, set status CANCELLED

### Payout Rules

| Scenario | Verdict | USDC goes to |
|----------|---------|-------------|
| Mutual agreement TRUE | TRUE | Creator |
| Mutual agreement FALSE | FALSE | Party B |
| AI jury TRUE | TRUE | Creator |
| AI jury FALSE | FALSE | Party B |
| AI jury UNDETERMINED | UNDETERMINED | Creator (refund) |
| No evidence after deadline | DEFAULT | Disputer (whoever called initiateDispute) |
| Party B never joins + deadline | EXPIRED | Creator (refund) |

Pull-based withdrawal: `pendingWithdrawals[winner] += escrowAmount`, winner calls `claimFunds()` which does `IERC20.transfer()`.

### Default Judgment

New function `resolveByDefault()`:
- Callable by anyone after evidence deadline
- Requires: status == DISPUTED, deadline passed, no evidence from either party
- Awards escrow to the party who initiated the dispute
- Sets verdict = "DEFAULT", reasoning = "Resolved by default judgment — no evidence submitted"

### Evidence Validation

New constructor params:
- `string[] allowedTypes` — e.g., ["text", "json"]
- `uint256 maxEvidenceLength` — e.g., 10000
- `string constraints` — free-text constraint description

`submitEvidence()` checks `bytes(evidence).length <= maxEvidenceLength`. Type checking is informational (stored on-chain, enforced by convention).

## Section 2: Factory + Bridge Updates

### InternetCourtFactory.sol

Minimal changes:
- `createAgreement()` adds new params: `usdcToken`, `escrowAmount`, `joinDeadline`, `allowedTypes`, `maxEvidenceLength`, `constraints`
- Creator approves USDC to the Agreement contract directly (factory doesn't hold funds)
- `processBridgeMessage()` unchanged — verdict routing is the same
- `requestDispute()` unchanged — event emission is the same

### Bridge + Relay

No changes needed. Bridge carries verdict (TRUE/FALSE/UNDETERMINED) and routes to factory. Relay watches DisputeRequested events and deploys GenLayer oracles. Unaffected by escrow refactor.

### GenLayer Oracle (case_resolution.py)

No changes needed. Oracle receives statement + guidelines + evidence, evaluates, returns verdict. Doesn't know about escrow.

## Section 3: API Routes + MCP Server

### Next.js API Routes

Read endpoints (public):
- `GET /api/cases` — List cases. Params: `?party=0x...`, `?status=active`, `?page=1&limit=20`
- `GET /api/cases/[id]` — Full case details
- `GET /api/cases/[id]/evidence` — Evidence for a case

Write-helper endpoints (unsigned tx preparation):
- `POST /api/cases/prepare-create` — Returns unsigned tx data for createAgreement()
- `POST /api/cases/prepare-join` — Returns unsigned tx data for acceptAgreement()
- `POST /api/cases/prepare-submit-evidence` — Returns unsigned tx data for submitEvidence()

No private keys on server. API prepares transactions, agents sign them.

### MCP Server

Separate package (`/mcp` directory). Stdio transport.

Tools:
- `create_dispute` — Prepare/sign createAgreement tx
- `join_dispute` — Accept existing case
- `submit_evidence` — Submit evidence to disputed case
- `propose_outcome` — Propose TRUE/FALSE for mutual agreement
- `get_case` — Read case details
- `list_cases` — List/search cases
- `check_deadline` — Check evidence/join deadline status

Uses viem to talk to Base directly. Thin wrapper over smart contract ABI.

## Section 4: Testing + Migration

### Test Updates

Refactor existing 99 unit + 32 E2E tests:
- Replace ETH deposit tests with USDC approve + transferFrom
- Add: one-sided escrow tests (only creator deposits)
- Add: zero-escrow dispute tests (no-money mode)
- Add: join deadline expiry + reclaim tests
- Add: default judgment tests (no evidence → disputer wins)
- Add: evidence validation tests (max length, allowed types)
- Add: UNDETERMINED → refund to creator tests
- Reuse existing MockUSDL.sol for USDC mock

Estimate: ~30 new tests, ~50 modified tests.

### Migration

No migration needed. Old ETH-based contracts never deployed to mainnet. Fresh deploy of USDC version.

### Deployment Order

1. Deploy MockUSDC (testnet) or use real USDC address (mainnet)
2. Deploy InternetCourtFactory with USDC token address
3. Configure bridge (unchanged)
4. Deploy relay (unchanged)
5. Update frontend env vars
6. Deploy API routes + MCP server

## What's NOT in This Design

- External escrow callbacks (dropped for v1)
- Off-chain evidence storage (IPFS/Arweave — future)
- Asymmetric deposits (both parties stake different amounts — future)
- Standalone API service (using Next.js API routes for now)
