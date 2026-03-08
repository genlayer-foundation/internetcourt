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

## Writing New Court / Oracle Contracts

> For the full GenLayer developer guide (all storage types, testing framework, SDK reference), see the `genlayer` skill. This section covers the minimum needed to create a new InternetCourt-compatible contract.

### File Headers (Required)

Every GenLayer contract MUST start with these two lines or deployment fails with `absent_runner_comment`:

```python
# v0.1.0
# { "Depends": "py-genlayer:latest" }
```

### Contract Skeleton — Court Type

```python
# v0.1.0
# { "Depends": "py-genlayer:latest" }
from genlayer import *
import json

class MyNewCourt(gl.Contract):
    statement: str
    evidence_a: str
    evidence_b: str
    verdict: str        # "TRUE" | "FALSE" | "UNDETERMINED"
    reasoning: str
    status: str

    def __init__(self, statement: str, evidence_a: str, evidence_b: str):
        self.statement = statement
        self.evidence_a = evidence_a
        self.evidence_b = evidence_b
        self.verdict = ""
        self.reasoning = ""
        self.status = "pending"

    @gl.public.write
    def resolve(self) -> None:
        # Copy storage to locals — storage NOT accessible inside nondet blocks
        stmt = self.statement
        ev_a = self.evidence_a
        ev_b = self.evidence_b

        def nondet():
            prompt = f"""You are an impartial AI juror.
## Statement
{stmt}
## Party A Evidence
{ev_a}
## Party B Evidence
{ev_b}
Respond with JSON: {{"verdict": "TRUE" or "FALSE" or "UNDETERMINED", "reasoning": "..."}}"""
            result = gl.nondet.exec_prompt(prompt)
            if isinstance(result, str):
                result = result.replace("```json", "").replace("```", "").strip()
            return result

        # USE prompt_non_comparative for AI reasoning (not prompt_comparative)
        result_str = gl.eq_principle.prompt_non_comparative(
            nondet,
            task="Evaluate a dispute and return a verdict",
            criteria="Verdict must be TRUE, FALSE, or UNDETERMINED. Reasoning must address evidence.",
        )

        parsed = json.loads(result_str) if isinstance(result_str, str) else result_str
        self.verdict = parsed["verdict"]
        self.reasoning = parsed["reasoning"]
        self.status = "resolved"

    @gl.public.view
    def get_status(self) -> str:
        return json.dumps({"status": self.status, "verdict": self.verdict, "reasoning": self.reasoning})
```

### Contract Skeleton — Oracle Type

```python
# v0.1.0
# { "Depends": "py-genlayer:latest" }
from genlayer import *
import json

class MyNewOracle(gl.Contract):
    result: str
    status: str

    def __init__(self, query_url: str):
        self.status = "pending"
        self.result = ""

        # For oracles: USE prompt_comparative (all validators fetch independently)
        url = query_url

        def nondet():
            resp = gl.nondet.web.get(url)
            data = json.loads(resp.body.decode())
            return json.dumps({"value": data["rate"], "source": url})

        result_str = gl.eq_principle.prompt_comparative(
            nondet,
            principle="Results are equivalent if the numeric values are within 1% of each other",
        )
        self.result = result_str
        self.status = "resolved"

    @gl.public.view
    def get_result(self) -> str:
        return self.result
```

### Choosing the Right Equivalence Principle

| Task | Use | Why |
|------|-----|-----|
| AI jury / reasoning / evaluation | `prompt_non_comparative` | Different LLMs produce different prose; only the verdict matters |
| Oracle / price feed / API data | `prompt_comparative` or `strict_eq` | All validators should independently get the same value |

**Key rule:** If two honest validators would produce legitimately different text (AI reasoning), use `prompt_non_comparative`. If they should get the same number, use `prompt_comparative`.

### Storage Types Quick Reference

| Python | GenLayer | Notes |
|--------|----------|-------|
| `int` | `u256` | `u256(value)`, arithmetic needs `int()` conversion |
| `list` | `DynArray[T]` | Persistent array |
| `dict` | `TreeMap[K,V]` | Keys must be `str` or `u256` |
| address | `Address` | Handle both `str` and `bytes` in constructor |

### Testing Quick Reference

```bash
pip install genlayer-test cloudpickle
genlayer-test
```

```python
def test_court(direct_vm, direct_deploy):
    direct_vm.sender = b'\x01' * 20
    direct_vm.mock_llm(r".*impartial AI juror.*", '{"verdict": "TRUE", "reasoning": "Test."}')
    contract = direct_deploy("contracts/MyNewCourt.py", "statement", "ev_a", "ev_b")
    contract.resolve()
    assert contract.verdict == "TRUE"
```

**Critical:** `prompt_non_comparative` is broken in direct test mode. Patch it in `conftest.py`:

```python
def _patch_prompt_non_comparative():
    import genlayer.gl.eq_principle as eq_mod
    import genlayer.gl.vm as vm_mod
    from genlayer.gl._internal import _lazy_api
    from genlayer.py.types import Lazy
    import typing

    @_lazy_api
    def patched(fn: typing.Callable[[], str], *, task: str, criteria: str) -> Lazy[str]:
        def validator_fn(leaders_res: vm_mod.Result) -> bool:
            return vm_mod.spawn_sandbox(fn) == leaders_res
        return vm_mod.run_nondet_unsafe.lazy(fn, validator_fn)

    eq_mod.prompt_non_comparative = patched
    import genlayer.gl as gl_mod
    gl_mod.eq_principle.prompt_non_comparative = patched
```

Call `_patch_prompt_non_comparative()` **after** `direct_deploy()` loads the SDK.

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
