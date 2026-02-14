# GenLayer Technical Guide for internetcourt.org

> Technical reference for building internetcourt's agent-native dispute resolution system on GenLayer.

## Table of Contents
1. [GenLayer Overview](#genlayer-overview)
2. [Intelligent Contracts vs Smart Contracts](#intelligent-contracts-vs-smart-contracts)
3. [Optimistic Democracy: The AI Jury System](#optimistic-democracy-the-ai-jury-system)
4. [Writing Intelligent Contracts](#writing-intelligent-contracts)
5. [Non-Deterministic Operations & Equivalence Principles](#non-deterministic-operations--equivalence-principles)
6. [Storage & Data Types](#storage--data-types)
7. [Working with Balances & Payable Methods](#working-with-balances--payable-methods)
8. [Testing with genlayer-test](#testing-with-genlayer-test)
9. [Developer Tooling & Deployment](#developer-tooling--deployment)
10. [Frontend Integration with GenLayerJS](#frontend-integration-with-genlayerjs)
11. [Recommendations for internetcourt.org Dispute Resolution](#recommendations-for-internetcourtai-dispute-resolution)
12. [Example: Dispute Resolution Contract](#example-dispute-resolution-contract)
13. [Limitations & Gotchas](#limitations--gotchas)

---

## GenLayer Overview

GenLayer is an AI-native blockchain platform — "the Intelligence Layer of the Internet." It extends the blockchain evolution beyond Bitcoin (trustless money) and Ethereum (trustless applications) into **trustless decision-making**.

GenLayer positions itself as a **synthetic jurisdiction**: a decentralized digital court where validators running diverse Large Language Models (LLMs) resolve disputes and enforce contracts. This is exactly the infrastructure internetcourt.org needs — the judicial layer for the AI agent economy.

**Key capabilities:**
- Validators connected to different LLMs act as an AI jury
- Contracts can process natural language, access the web, and make subjective decisions
- Built-in appeal process with escalating validator counts (5 → 23 → 47 → 95...)
- Optimistic Democracy consensus mechanism based on Condorcet's Jury Theorem
- Contracts written in Python (not Solidity)
- Transaction finality after ~30 minutes; processing takes ~100 seconds

**Current state (Feb 2026):**
- Testnet Asimov launched June 2025
- Testnet Bradbury launched January 2026
- No mainnet yet — still pre-production
- $7.5M seed round led by North Island Ventures
- Partnership with io.net for decentralized GPU compute (30+ open-source models)

**References:**
- Docs: https://docs.genlayer.com/
- GitHub: https://github.com/genlayerlabs
- SDK Reference: https://sdk.genlayer.com/main/api/genlayer.html

---

## Intelligent Contracts vs Smart Contracts

| Feature | Smart Contracts (Solidity) | Intelligent Contracts (GenLayer) |
|---------|---------------------------|----------------------------------|
| Language | Solidity, Vyper | Python |
| Logic | Deterministic only | Deterministic + Non-deterministic |
| Data sources | On-chain only | On-chain + web APIs + live data |
| Decision-making | If/else rules | AI/LLM-powered subjective reasoning |
| Validation | All nodes compute identical result | AI validators reach consensus on "equivalent" results |
| NLP | Not possible | Native natural language processing |
| Use cases | DeFi, tokens, DAOs | Arbitration, prediction markets, AI agents, content moderation |

**Why this matters for internetcourt.org:** Traditional smart contracts can only handle deterministic logic ("if party A deposited by date X, release funds"). Intelligent contracts can evaluate *evidence*, interpret *arguments*, and render *judgments* — exactly what agent dispute resolution requires. When Agent A and Agent B disagree on whether a code review meets the agreement terms, GenLayer's intelligent contracts can actually *read and evaluate* the arguments.

---

## Optimistic Democracy: The AI Jury System

GenLayer's consensus mechanism is called **Optimistic Democracy**, an enhanced Delegated Proof of Stake (dPoS) system.

### How a Transaction is Processed

```
1. User submits transaction
2. System randomly selects 5 validators (1 Leader + 4 Co-Validators)
3. Leader validator processes the transaction, proposes result
4. Co-Validators independently recompute and verify
5. Majority vote determines acceptance
6. 30-minute finality window begins
```

### The Appeal Process (Critical for Dispute Resolution)

This is GenLayer's built-in court-like escalation system:

```
Initial ruling:    5 validators
First appeal:     23 validators
Second appeal:    47 validators
Third appeal:     95 validators
...and so on (doubling + 1)
```

Anyone can submit an appeal during the finality window by staking GEN tokens to cover gas costs. More validators re-examine the evidence and can overturn previous decisions.

**For internetcourt.org:** This means agent disputes get progressively more scrutiny on appeal — like a real court system. We get multi-instance adjudication *for free* at the protocol level. Agents (or their human operators) can appeal verdicts programmatically via the API.

### The Equivalence Principle

The Equivalence Principle is how developers tell validators what counts as "agreement." There are three types:

1. **Strict Equality** (`gl.eq_principle.strict_eq`) — Validators must return identical values. Best for boolean or numeric results.

2. **Prompt Comparative** (`gl.eq_principle.prompt_comparative`) — Both leader and validators do the same work, then an LLM checks if results are "equivalent enough" based on a developer-defined principle string.

3. **Prompt Non-Comparative** (`gl.eq_principle.prompt_non_comparative`) — Leader does the work; validators only *verify* it meets criteria (cheaper, faster). Ideal for qualitative outputs like dispute rulings.

---

## Writing Intelligent Contracts

Intelligent contracts are Python classes extending `gl.Contract`.

### Basic Structure

```python
from genlayer import *

class MyContract(gl.Contract):
    # State variables (persisted on-chain) — MUST be declared here with types
    owner: Address
    description: str
    amount: u256

    def __init__(self, description: str):
        """Constructor — called once on deployment."""
        self.owner = gl.message.sender_address
        self.description = description
        self.amount = u256(0)

    @gl.public.view
    def get_info(self) -> str:
        """Read-only method — no state changes, no gas cost."""
        return self.description

    @gl.public.write
    def update_description(self, new_desc: str):
        """Write method — modifies state, costs gas."""
        self.description = new_desc

    @gl.public.write.payable
    def deposit(self):
        """Payable method — can receive native GEN tokens."""
        self.amount += gl.message.value
```

### Method Decorators

| Decorator | Purpose | Gas Cost |
|-----------|---------|----------|
| `@gl.public.view` | Read-only, no state changes | Free |
| `@gl.public.write` | Modifies contract state | Costs gas |
| `@gl.public.write.payable` | Modifies state + receives tokens | Costs gas |
| `@gl.private` | Internal only (default for all methods) | N/A |

### Transaction Context

Access transaction metadata via `gl.message`:

```python
gl.message.sender_address    # Who called this method
gl.message.origin_address    # Who initiated the transaction
gl.message.value             # GEN tokens sent (u256, for payable methods)
gl.message.contract_address  # This contract's address
gl.message.chain_id          # Current chain ID
```

### Contract Properties

```python
self.address   # This contract's Address
self.balance   # This contract's native token balance
```

---

## Non-Deterministic Operations & Equivalence Principles

This is GenLayer's superpower. Non-deterministic blocks allow contracts to call LLMs, fetch web data, and make AI-powered decisions.

### Rules for Non-Deterministic Blocks

1. Non-deterministic code must be inside a function with no arguments
2. That function must be invoked via an equivalence principle function
3. **Storage cannot be accessed** from within non-deterministic blocks
4. Python interpreter state doesn't transfer back to deterministic code
5. Use `gl.storage.copy_to_memory()` to pass storage data into non-deterministic blocks

### Pattern 1: Strict Equality (Boolean/Numeric Results)

```python
@gl.public.write
def check_website(self) -> bool:
    url = "https://example.org"

    def nondet():
        web_data = gl.nondet.web.render(url)
        return 'specific-content' in web_data.body.decode()

    result = gl.eq_principle.strict_eq(nondet)
    self.website_has_content = result
    return result
```

### Pattern 2: Prompt Comparative (Fuzzy Matching)

```python
@gl.public.write
def get_rating(self, product_url: str):
    url = product_url  # capture for closure

    def nondet():
        web_data = gl.nondet.web.render(url)
        prompt = f"Extract the average rating from this page: {web_data.body.decode()}"
        return gl.nondet.exec_prompt(prompt)

    result = gl.eq_principle.prompt_comparative(
        nondet,
        principle="The ratings should be within 0.2 points of each other"
    )
    self.last_rating = result
```

### Pattern 3: Prompt Non-Comparative (Best for Dispute Resolution)

```python
@gl.public.write
def evaluate_evidence(self, case_summary: str):
    summary = case_summary  # capture for closure

    def nondet():
        prompt = f"""
        You are an impartial arbitrator. Evaluate this dispute:
        {summary}

        Respond with JSON: {{"ruling": "plaintiff"|"defendant", "reasoning": "...", "confidence": 0.0-1.0}}
        """
        return gl.nondet.exec_prompt(prompt, response_format='json')

    result = gl.eq_principle.prompt_non_comparative(
        nondet,
        task="Evaluate the dispute and provide a ruling",
        criteria="The ruling must be well-reasoned, address the key arguments, and be consistent with the evidence presented"
    )
    return result
```

### Pattern 4: Low-Level run_nondet (Maximum Control)

```python
@gl.public.write
def custom_evaluation(self, data: str):
    input_data = data

    def leader_fn():
        # Leader does the heavy lifting
        result = gl.nondet.exec_prompt(f"Analyze: {input_data}")
        return result

    def validator_fn(leader_result):
        # Validator verifies the leader's work
        check = gl.nondet.exec_prompt(
            f"Is this analysis accurate for '{input_data}'? Analysis: {leader_result}. Reply true/false."
        )
        return 'true' in check.lower()

    result = gl.vm.run_nondet(leader_fn, validator_fn)
    return result
```

### LLM Prompt Execution

```python
# Simple text response
result = gl.nondet.exec_prompt("Summarize this text: ...")

# JSON response
result = gl.nondet.exec_prompt(
    "Extract key data from: ...",
    response_format='json'
)

# With images (multimodal)
result = gl.nondet.exec_prompt(
    "Describe this image",
    images=[image_bytes]
)
```

### Web Data Access

```python
# Fetch webpage content
response = gl.nondet.web.render(url)
# response.status, response.headers, response.body

# Alternative modes may include get/post for API calls
response = gl.nondet.web.get(url, headers={"Accept": "application/json"})
```

---

## Storage & Data Types

### Supported Types

| Python Type | GenLayer Storage Type | Notes |
|-------------|----------------------|-------|
| `int` | `i32`, `u256`, `bigint` | Must use fixed-size or `bigint` |
| `bool` | `bool` | Works directly |
| `str` | `str` | Works directly |
| `bytes` | `bytes` | Works directly |
| `list[T]` | `DynArray[T]` | Dynamic persistent array |
| `dict[K,V]` | `TreeMap[K,V]` | Persistent ordered map |
| Fixed array | `Array[T]` | Fixed-size persistent array |
| Address | `Address` | 20-byte blockchain address |

### Default Values

Storage is zero-initialized:
- Integers → `0`
- Booleans → `false`
- Strings → `""`
- Collections → empty

### Custom Storage Types

```python
from genlayer import *
import dataclasses

@gl.storage.allow_storage
@dataclasses.dataclass
class DisputeCase:
    plaintiff: Address
    defendant: Address
    description: str
    status: str
    ruling: str
    stake_amount: u256

class DisputeContract(gl.Contract):
    cases: TreeMap[str, DisputeCase]
    case_count: u256
```

### Accessing Storage in Non-Deterministic Blocks

```python
# Storage is NOT accessible in non-deterministic blocks!
# Copy data to memory first:
case_data = gl.storage.copy_to_memory(self.cases[case_id])

def nondet():
    # Now case_data is available (it's a memory copy)
    prompt = f"Evaluate: {case_data.description}"
    return gl.nondet.exec_prompt(prompt)
```

---

## Working with Balances & Payable Methods

### Receiving Tokens

```python
class EscrowContract(gl.Contract):
    deposits: TreeMap[str, u256]  # keyed by address hex

    @gl.public.write.payable
    def deposit(self):
        """Accept GEN tokens into the contract."""
        sender = gl.message.sender_address.as_hex
        current = self.deposits.get(sender, u256(0))
        self.deposits[sender] = current + gl.message.value

    @gl.public.write.payable
    def __receive__(self):
        """Handle plain value transfers (no method call)."""
        pass  # tokens are automatically added to self.balance
```

### Sending Tokens

Contract-to-address transfers use the GenLayer transfer mechanism. The exact API for sending tokens from a contract is:

```python
# Transfer tokens to an address
# (Check latest SDK docs for exact syntax — API has evolved)
# Pattern: contract calls another contract's payable method with value
other_contract = gl.get_contract_at(recipient_address)
other_contract.some_payable_method().emit(value=amount)
```

### Contract Balance

```python
@gl.public.view
def get_balance(self) -> u256:
    return self.balance  # native token balance held by this contract
```

---

## Testing with genlayer-test

### Installation

```bash
pip install genlayer-test
```

### Project Setup

Create `gltest.config.yaml` in your project root:

```yaml
networks:
  default: localnet
  localnet:
    url: "http://127.0.0.1:4000/api"
    leader_only: false
  testnet_asimov:
    accounts:
      - "${ACCOUNT_PRIVATE_KEY_1}"
    from: "${ACCOUNT_PRIVATE_KEY_2}"

paths:
  contracts: "contracts"
  artifacts: "artifacts"

environment: .env
```

### Writing Tests

```python
# tests/test_dispute.py
from gltest import get_contract_factory, get_default_account
from gltest.assertions import tx_execution_succeeded, tx_execution_failed

def test_create_dispute():
    factory = get_contract_factory("DisputeResolution")
    contract = factory.deploy()

    # Read a value
    result = contract.get_case_count().call()
    assert result == 0

    # Write (create a dispute)
    tx = contract.create_dispute(
        args=["defendant_address", "Contract breach description"]
    ).transact()
    assert tx_execution_succeeded(tx)

    # Verify state changed
    count = contract.get_case_count().call()
    assert count == 1

def test_deposit_escrow():
    factory = get_contract_factory("DisputeResolution")
    contract = factory.deploy()

    tx = contract.deposit(
        args=[],
        value=1000  # send GEN tokens
    ).transact()
    assert tx_execution_succeeded(tx)
```

### Direct Mode (Fast Unit Testing)

Direct mode runs contracts in pure Python (~ms instead of ~minutes):

```python
def test_direct_mode(direct_vm, direct_deploy):
    contract = direct_deploy("contracts/DisputeResolution.py", "initial_arg")
    alice = direct_vm.sender

    # Change sender
    with direct_vm.prank(bob):
        contract.create_dispute("alice_addr", "description")

    # Snapshot and revert
    snap = direct_vm.snapshot()
    contract.update_status("resolved")
    direct_vm.revert(snap)  # undo the update

    # Expect errors
    with direct_vm.expect_revert("Unauthorized"):
        contract.admin_only_method()
```

### Mocking LLM and Web Responses

```python
# Mock LLM responses for deterministic testing
mock_llm = {
    "nondet_exec_prompt": {
        "Evaluate this dispute": '{"ruling": "plaintiff", "confidence": 0.85}'
    }
}

# Mock web responses
mock_web = {
    "nondet_web_request": {
        "https://api.example.com/evidence": {
            "method": "GET",
            "status": 200,
            "body": '{"evidence": "verified"}'
        }
    }
}

# Use in direct mode
direct_vm.mock_llm(r"Evaluate.*dispute", '{"ruling": "plaintiff"}')
direct_vm.mock_web(r"api\.example\.com", {"status": 200, "body": '{"ok": true}'})
```

### Statistical Analysis for Non-Deterministic Tests

```python
# Run a method many times to check consistency
analysis = contract.evaluate_dispute(args=["case_data"]).analyze(
    provider="openai",
    model="gpt-4o",
    runs=100
)
print(f"Success rate: {analysis.success_rate:.2f}%")
print(f"Unique outcomes: {analysis.unique_states}")
```

### Running Tests

```bash
gltest                                    # Run all tests
gltest tests/test_dispute.py              # Specific file
gltest -v                                 # Verbose
gltest --network testnet_asimov           # On testnet
gltest --leader-only                      # Leader-only mode
```

---

## Developer Tooling & Deployment

### Prerequisites

- Docker 26+
- Node.js 18+
- Python 3.12+

### GenLayer CLI Setup

```bash
# Install CLI globally
npm install -g genlayer

# Initialize environment (downloads Docker images, sets up validators)
genlayer init
# You'll be prompted for LLM provider(s) and API keys
# Options: --numValidators 5 --headless --reset-db

# Start local development environment
genlayer up
# Access GenLayer Studio at http://localhost:8080/
```

### Project Structure (Recommended)

```
internetcourt/
├── contracts/
│   ├── DisputeResolution.py      # Main dispute contract
│   ├── Escrow.py                  # Escrow contract
│   └── InternetCourt.py              # Court orchestration contract
├── deploy/
│   └── deploy.ts                  # Deployment script
├── frontend/
│   ├── src/
│   │   ├── lib/genlayer.ts       # GenLayer client setup
│   │   └── ...
│   └── package.json
├── tests/
│   ├── test_dispute.py
│   ├── test_escrow.py
│   └── conftest.py
├── gltest.config.yaml
├── package.json
└── requirements.txt
```

### Deployment

```bash
# Deploy single contract
genlayer deploy --contract contracts/DisputeResolution.py --args "arg1" "arg2"

# Deploy via script (for multi-contract setups)
genlayer deploy
# Runs scripts in deploy/ folder sequentially

# Network selection
genlayer network localnet         # Local development
genlayer network studionet        # Shared development
genlayer network testnet-asimov   # Pre-production testnet
```

### Post-Deployment Interaction

```bash
# Read from contract
genlayer call --address 0x... --function get_case_count

# Write to contract
genlayer write --address 0x... --function create_dispute --args "0xdefendant" "description"

# Check transaction receipt
genlayer receipt <txId>
```

### Deployment Workflow

```
1. Develop & test on localnet (genlayer init && genlayer up)
2. Validate on studionet (shared environment)
3. Final testing on testnet-asimov (production-like, requires faucet tokens)
4. Mainnet deployment (when available)
```

---

## Frontend Integration with GenLayerJS

### Installation

```bash
npm install genlayer-js
```

### Client Setup

```typescript
import { createClient, createAccount } from 'genlayer-js';
import { testnetAsimov } from 'genlayer-js/chains';

// Option 1: Direct signing (for server-side or dev)
const account = createAccount(process.env.PRIVATE_KEY);
const client = createClient({
  chain: testnetAsimov,
  account,
});

// Option 2: External signing (MetaMask integration)
const client = createClient({
  chain: testnetAsimov,
  account: userWalletAddress, // string address for MetaMask
});
```

### Reading Contract Data

```typescript
const caseCount = await client.readContract({
  address: contractAddress,
  functionName: 'get_case_count',
  args: [],
});

const caseDetails = await client.readContract({
  address: contractAddress,
  functionName: 'get_case',
  args: [caseId],
});
```

### Writing to Contracts

```typescript
// Create a dispute
const txHash = await client.writeContract({
  address: contractAddress,
  functionName: 'create_dispute',
  args: [defendantAddress, 'Contract breach: failed to deliver goods'],
  value: 0,
});

// Note: Escrow is handled on Base via USDC (ERC-20), not on GenLayer.
// The GenLayer contract handles AI jury evaluation only.
// See ARCHITECTURE.md for the Base-side escrow pattern.
```

### Waiting for Transaction Finality

```typescript
const receipt = await client.waitForTransactionReceipt({
  hash: txHash,
  status: 'FINALIZED',  // or 'ACCEPTED' for faster confirmation
  interval: 5_000,       // poll every 5 seconds
  retries: 10,
});

// Transaction statuses: PENDING → PROPOSING → COMMITTING → ACCEPTING → FINALIZED
```

### Appealing a Transaction

```typescript
// Built-in appeal support!
const appealTxHash = await client.appealTransaction({
  txId: originalTransactionId,
});
```

### Getting Contract Schema

```typescript
// Discover contract methods dynamically
const schema = await client.getContractSchema({
  address: contractAddress,
});
// Returns: constructor info, method signatures, parameter types, return types
```

### Full React Integration Pattern (Human Monitoring Dashboard)

The frontend is a monitoring dashboard for humans to oversee their agents' cases. Agents interact via the API directly.

```typescript
// hooks/useDisputeContract.ts
import { createClient } from 'genlayer-js';
import { useMutation, useQuery } from '@tanstack/react-query';

const client = createClient({ chain: testnetAsimov, account: userAddress });

// Dashboard: view all cases for the user's agents
export function useAgentCases(contractAddress: string) {
  return useQuery({
    queryKey: ['cases', contractAddress],
    queryFn: () => client.readContract({
      address: contractAddress,
      functionName: 'get_all_cases',
      args: [],
    }),
  });
}

// Manual intervention: human creates a dispute on behalf of their agent
export function useCreateDispute(contractAddress: string) {
  return useMutation({
    mutationFn: async ({ defendant, description, escrowAmount }) => {
      const txHash = await client.writeContract({
        address: contractAddress,
        functionName: 'create_dispute',
        args: [defendant, description],
        value: escrowAmount,
      });
      return client.waitForTransactionReceipt({
        hash: txHash,
        status: 'FINALIZED',
      });
    },
  });
}
```

---

## Recommendations for internetcourt.org Dispute Resolution

### Architecture Design

internetcourt.org should leverage GenLayer's strengths for an agent-native dispute system:

```
┌─────────────────────────────────────────────┐
│  API Layer (Primary — for AI agents)        │
│  - Agreement creation & management          │
│  - Dispute filing & argument submission     │
│  - Verdict retrieval & webhook delivery     │
│  - Agent reputation queries                 │
├─────────────────────────────────────────────┤
│  Frontend (Next.js + GenLayerJS)             │
│  - Human monitoring dashboard               │
│  - Agent case overview                      │
│  - Manual intervention interface            │
│  - Ruling display + appeal interface        │
├─────────────────────────────────────────────┤
│  GenLayer Intelligent Contracts             │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Escrow.py   │  │ DisputeResolution.py │  │
│  │ Hold funds  │  │ AI jury evaluation   │  │
│  │ Release on  │  │ Evidence processing  │  │
│  │ ruling      │  │ Ruling generation    │  │
│  └─────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────┤
│  GenLayer Protocol (Optimistic Democracy)   │
│  - 5+ AI validators per ruling              │
│  - Built-in appeal with escalation          │
│  - 30-min finality window                   │
└─────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Use `eq_principle.prompt_non_comparative` for rulings** — The leader renders a judgment, validators check it meets quality criteria. This is cheaper than having every validator generate a full ruling and more appropriate for subjective outputs.

2. **Leverage the protocol-level appeal system** — Don't build custom appeal logic. GenLayer's built-in appeal (5→23→47→95 validators) is essentially a multi-instance court. Expose the `appealTransaction()` JS SDK method in the UI.

3. **Escrow pattern for stakes** — The creator deposits USDC escrow (ERC-20) when creating the agreement. PartyB joins free. The ruling determines fund release. This creates "skin in the game." Note: the Base-side Solidity contracts handle escrow, not the GenLayer contract.

4. **Structure evidence as on-chain text** — Store case descriptions, evidence summaries, and arguments as contract state. Plain text is perfect for agents — they naturally communicate in text.

5. **Use JSON response format for structured rulings** — Force LLM outputs into structured JSON so the contract can programmatically act on rulings (release escrow, update status, etc.). Agents parse JSON trivially.

6. **External evidence via web access** — Contracts can fetch external data (URLs, APIs) to verify claims. Design cases to optionally include evidence URLs that the contract fetches during evaluation.

7. **API-first design** — Every contract interaction must be accessible programmatically. Agents interact via API/SDK, not a web browser.

### Dispute Lifecycle Design

```
1. CREATE   — Party A (agent or human) files agreement, deposits USDC escrow (via API)
2. RESPOND  — Party B accepts agreement, no deposit required (via API)
3. DISPUTE  — Either party raises dispute with argument (via API)
4. ARGUE    — Other party submits counter-argument (via API)
5. EVALUATE — AI validators evaluate case (non-deterministic LLM evaluation)
6. RULING   — Contract stores ruling, starts finality window; webhook sent to both parties
7. APPEAL   — Losing party can appeal (protocol-level, more validators, via API)
8. FINALIZE — After finality window, escrow released per ruling
```

### Prompt Engineering Considerations

The ruling quality depends heavily on how you structure the LLM prompt. Note: since agents may be more sophisticated at prompt injection than humans, the prompt framing must be robust.

```python
prompt = f"""
You are an impartial arbitrator in a dispute resolution system for the agent economy.
The parties may be AI agents, humans, or a mix. Judge based on the agreement and evidence only.

## Case Details
- Case ID: {case_id}
- Filed: {filed_date}
- Category: {category}

## Plaintiff's Claim
{plaintiff_argument}

## Defendant's Response
{defendant_argument}

## Evidence Submitted
{evidence_summary}

## Instructions
1. Evaluate both arguments fairly
2. Consider the evidence presented
3. Apply the principle: {ruling_principle}
4. Provide a clear ruling with reasoning

## Response Format (JSON)
{{
    "ruling": "plaintiff" | "defendant" | "split",
    "plaintiff_award_pct": 0-100,
    "defendant_award_pct": 0-100,
    "reasoning": "detailed explanation",
    "confidence": 0.0-1.0,
    "key_factors": ["factor1", "factor2"]
}}
"""
```

### Testing Strategy

1. **Direct mode** for fast iteration on contract logic
2. **Mock LLM responses** for deterministic unit tests
3. **Statistical analysis** to verify ruling consistency across many runs
4. **Simulator mode** for full integration tests with real consensus
5. **Testnet deployment** for production-like validation

---

## Example: Dispute Resolution Contract

Here is a complete contract skeleton for internetcourt.org's agent-native dispute system:

```python
from genlayer import *
import json
import dataclasses

# ============================================================
# Data Structures
# ============================================================

CASE_STATUS_OPEN = "open"
CASE_STATUS_RESPONDED = "responded"
CASE_STATUS_EVALUATING = "evaluating"
CASE_STATUS_RULED = "ruled"
CASE_STATUS_FINALIZED = "finalized"

# ============================================================
# Dispute Resolution Contract
# ============================================================

class InternetCourt(gl.Contract):
    # State variables
    case_count: u256
    # Store cases as serialized JSON in a TreeMap keyed by case ID string
    case_plaintiffs: TreeMap[str, str]       # case_id -> plaintiff address hex
    case_defendants: TreeMap[str, str]       # case_id -> defendant address hex
    case_descriptions: TreeMap[str, str]     # case_id -> dispute description
    case_plaintiff_args: TreeMap[str, str]   # case_id -> plaintiff arguments
    case_defendant_args: TreeMap[str, str]   # case_id -> defendant response
    case_evidence: TreeMap[str, str]         # case_id -> evidence (JSON string)
    case_statuses: TreeMap[str, str]         # case_id -> status string
    case_rulings: TreeMap[str, str]          # case_id -> ruling (JSON string)
    case_plaintiff_stakes: TreeMap[str, u256]
    case_defendant_stakes: TreeMap[str, u256]
    min_stake: u256
    court_fee_bps: u256  # basis points (e.g., 250 = 2.5%)

    def __init__(self, min_stake: u256, court_fee_bps: u256):
        self.case_count = u256(0)
        self.min_stake = min_stake
        self.court_fee_bps = court_fee_bps

    # --------------------------------------------------------
    # Case Creation
    # --------------------------------------------------------

    @gl.public.write.payable
    def file_dispute(
        self,
        defendant: str,
        description: str,
        plaintiff_argument: str,
    ) -> str:
        """Party A (agent or human) files a dispute and deposits escrow stake."""
        if gl.message.value < self.min_stake:
            raise gl.vm.UserError("Insufficient stake")

        case_id = str(self.case_count)
        self.case_count += u256(1)

        self.case_plaintiffs[case_id] = gl.message.sender_address.as_hex
        self.case_defendants[case_id] = defendant
        self.case_descriptions[case_id] = description
        self.case_plaintiff_args[case_id] = plaintiff_argument
        self.case_defendant_args[case_id] = ""
        self.case_evidence[case_id] = "[]"
        self.case_statuses[case_id] = CASE_STATUS_OPEN
        self.case_rulings[case_id] = ""
        self.case_plaintiff_stakes[case_id] = gl.message.value
        self.case_defendant_stakes[case_id] = u256(0)

        return case_id

    # --------------------------------------------------------
    # Defendant Response
    # --------------------------------------------------------

    @gl.public.write.payable
    def respond_to_dispute(
        self,
        case_id: str,
        defendant_argument: str,
    ):
        """Party B (agent or human) responds and deposits counter-stake."""
        if self.case_statuses[case_id] != CASE_STATUS_OPEN:
            raise gl.vm.UserError("Case not open for response")

        if gl.message.sender_address.as_hex != self.case_defendants[case_id]:
            raise gl.vm.UserError("Only the named defendant can respond")

        if gl.message.value < self.min_stake:
            raise gl.vm.UserError("Insufficient counter-stake")

        self.case_defendant_args[case_id] = defendant_argument
        self.case_defendant_stakes[case_id] = gl.message.value
        self.case_statuses[case_id] = CASE_STATUS_RESPONDED

    # --------------------------------------------------------
    # Evidence Submission
    # --------------------------------------------------------

    @gl.public.write
    def submit_evidence(self, case_id: str, evidence_text: str):
        """Either party can submit additional evidence."""
        sender = gl.message.sender_address.as_hex
        plaintiff = self.case_plaintiffs[case_id]
        defendant = self.case_defendants[case_id]

        if sender != plaintiff and sender != defendant:
            raise gl.vm.UserError("Only parties to the dispute can submit evidence")

        status = self.case_statuses[case_id]
        if status not in (CASE_STATUS_OPEN, CASE_STATUS_RESPONDED):
            raise gl.vm.UserError("Evidence submission closed")

        current = json.loads(self.case_evidence[case_id])
        current.append({
            "submitted_by": "plaintiff" if sender == plaintiff else "defendant",
            "content": evidence_text,
        })
        self.case_evidence[case_id] = json.dumps(current)

    # --------------------------------------------------------
    # AI Jury Evaluation (Core non-deterministic operation)
    # --------------------------------------------------------

    @gl.public.write
    def evaluate_dispute(self, case_id: str) -> str:
        """Trigger AI jury evaluation of the dispute."""
        if self.case_statuses[case_id] != CASE_STATUS_RESPONDED:
            raise gl.vm.UserError("Case not ready for evaluation")

        self.case_statuses[case_id] = CASE_STATUS_EVALUATING

        # Copy storage data to memory for non-deterministic block
        description = gl.storage.copy_to_memory(self.case_descriptions[case_id])
        p_args = gl.storage.copy_to_memory(self.case_plaintiff_args[case_id])
        d_args = gl.storage.copy_to_memory(self.case_defendant_args[case_id])
        evidence = gl.storage.copy_to_memory(self.case_evidence[case_id])

        def nondet():
            prompt = f"""You are an impartial AI arbitrator in InternetCourt, a dispute resolution system for the agent economy.
The parties may be AI agents, humans, or a mix. Judge based on the agreement and evidence, not on who or what the parties are.

## Dispute Description
{description}

## Plaintiff's Argument
{p_args}

## Defendant's Argument
{d_args}

## Evidence Submitted
{evidence}

## Instructions
1. Carefully consider both sides of the dispute
2. Evaluate the evidence objectively
3. Consider principles of fairness, good faith, and proportionality
4. Determine what percentage of the total escrow each party should receive

## Required Response (strict JSON only)
{{
    "ruling": "plaintiff" or "defendant" or "split",
    "plaintiff_pct": <integer 0-100>,
    "defendant_pct": <integer 0-100>,
    "reasoning": "<clear explanation of the ruling>",
    "key_factors": ["<factor1>", "<factor2>", "<factor3>"]
}}

IMPORTANT: plaintiff_pct + defendant_pct must equal 100.
"""
            result = gl.nondet.exec_prompt(prompt, response_format='json')
            return result

        ruling = gl.eq_principle.prompt_non_comparative(
            nondet,
            task="Evaluate a dispute between two parties and determine the fair allocation of escrowed funds",
            criteria="The ruling must: (1) address both parties' arguments, (2) reference submitted evidence, (3) allocate percentages that sum to 100, (4) provide clear reasoning"
        )

        self.case_rulings[case_id] = json.dumps(ruling) if isinstance(ruling, dict) else str(ruling)
        self.case_statuses[case_id] = CASE_STATUS_RULED
        return self.case_rulings[case_id]

    # --------------------------------------------------------
    # View Methods
    # --------------------------------------------------------

    @gl.public.view
    def get_case_count(self) -> u256:
        return self.case_count

    @gl.public.view
    def get_case_status(self, case_id: str) -> str:
        return self.case_statuses[case_id]

    @gl.public.view
    def get_case_ruling(self, case_id: str) -> str:
        return self.case_rulings[case_id]

    @gl.public.view
    def get_case_details(self, case_id: str) -> str:
        return json.dumps({
            "case_id": case_id,
            "plaintiff": self.case_plaintiffs[case_id],
            "defendant": self.case_defendants[case_id],
            "description": self.case_descriptions[case_id],
            "status": self.case_statuses[case_id],
            "plaintiff_stake": str(self.case_plaintiff_stakes[case_id]),
            "defendant_stake": str(self.case_defendant_stakes[case_id]),
        })

    # --------------------------------------------------------
    # Finalization (after appeal window)
    # --------------------------------------------------------

    @gl.public.write
    def finalize_and_release(self, case_id: str):
        """Release escrowed funds according to the ruling.

        Should only be called after the finality window has passed.
        NOTE: The exact mechanism for transferring funds from the
        contract to parties depends on the latest GenLayer SDK
        transfer API. Check docs for current syntax.
        """
        if self.case_statuses[case_id] != CASE_STATUS_RULED:
            raise gl.vm.UserError("Case not yet ruled or already finalized")

        ruling = json.loads(self.case_rulings[case_id])
        p_pct = int(ruling.get("plaintiff_pct", 0))
        d_pct = int(ruling.get("defendant_pct", 0))

        total_stake = self.case_plaintiff_stakes[case_id] + self.case_defendant_stakes[case_id]

        # Calculate court fee
        fee = (total_stake * self.court_fee_bps) // u256(10000)
        distributable = total_stake - fee

        # Calculate payouts
        plaintiff_payout = (distributable * u256(p_pct)) // u256(100)
        defendant_payout = (distributable * u256(d_pct)) // u256(100)

        # TODO: Execute transfers using latest GenLayer SDK transfer API
        # The exact mechanism depends on the current SDK version.
        # Options include:
        # - Direct address transfers
        # - Calling payable methods on proxy contracts
        # - Using the EVM interop layer

        self.case_statuses[case_id] = CASE_STATUS_FINALIZED
```

### Corresponding Test File

```python
# tests/test_internetcourt.py
from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded, tx_execution_failed

def test_full_dispute_lifecycle():
    factory = get_contract_factory("InternetCourt")
    contract = factory.deploy(args=[1000, 250])  # min_stake=1000, fee=2.5%

    # 1. File dispute
    tx = contract.file_dispute(
        args=["0xDEFENDANT", "Failed to deliver goods", "I paid but received nothing"],
        value=1000
    ).transact()
    assert tx_execution_succeeded(tx)

    # 2. Check case created
    count = contract.get_case_count().call()
    assert count == 1

    # 3. Check status
    status = contract.get_case_status(args=["0"]).call()
    assert status == "open"

def test_insufficient_stake_rejected():
    factory = get_contract_factory("InternetCourt")
    contract = factory.deploy(args=[1000, 250])

    tx = contract.file_dispute(
        args=["0xDEF", "description", "argument"],
        value=500  # below min_stake
    ).transact()
    assert tx_execution_failed(tx, match_std_err="Insufficient stake")

def test_direct_mode(direct_vm, direct_deploy):
    """Fast unit test using direct execution."""
    contract = direct_deploy("contracts/InternetCourt.py", 1000, 250)

    # Mock the LLM for deterministic testing
    direct_vm.mock_llm(
        r"impartial AI arbitrator",
        '{"ruling": "plaintiff", "plaintiff_pct": 80, "defendant_pct": 20, "reasoning": "Evidence supports plaintiff", "key_factors": ["payment proof", "no delivery"]}'
    )

    # File and evaluate
    contract.file_dispute("0xDEF", "Breach of contract", "Argument text")
    contract.respond_to_dispute("0", "Counter argument")
    contract.evaluate_dispute("0")

    ruling = contract.get_case_ruling(args=["0"]).call()
    assert "plaintiff" in ruling
```

---

## Limitations & Gotchas

### Platform Limitations

1. **No mainnet yet** — GenLayer is in testnet phase (Testnet Bradbury as of Jan 2026). Build and test now, but plan for potential API changes before mainnet.

2. **Transaction speed** — ~100 seconds per transaction, 30-minute finality window. Not suitable for real-time interactions. Design UI with appropriate loading states and polling.

3. **Non-deterministic block restrictions:**
   - Cannot access storage directly (must copy to memory first)
   - Python interpreter state doesn't transfer back
   - Functions must take no arguments (use closures to capture data)

4. **LLM variability** — Different validators use different LLMs (GPT-4, Claude, Llama, etc.). Prompts must be robust enough to produce consistent results across models. Test with the statistical analysis tool.

5. **Storage types are restrictive** — No plain `int` (use `u256`, `bigint`), no plain `list` (use `DynArray`), no plain `dict` (use `TreeMap`). TreeMap keys must be `str` for calldata encoding.

6. **Single contract class per file** — Each `.py` file can only contain one class extending `gl.Contract`.

7. **Gas costs** — Non-deterministic operations (LLM calls, web fetches) are more expensive than deterministic operations. Design contracts to minimize unnecessary AI calls.

### API Stability

The SDK has undergone significant restructuring:
- v0.1.0 → v0.1.3: Major renames (`ContractAt` → `get_contract_at`, `Rollback` → `UserError`, `get_webpage` → `gl.nondet.web.render`)
- v0.1.3 → v0.1.8: Calldata encoding changes

**Always check the latest SDK docs at https://sdk.genlayer.com/main/api/genlayer.html before implementing.**

### Testing Gotchas

- Direct mode is ~1000x faster but doesn't test actual consensus
- Simulator mode requires Docker and GenLayer Studio running locally
- Mock LLM responses with regex patterns for deterministic tests
- Statistical analysis needs real LLM API keys and costs money

### Design Gotchas for Agent Dispute Resolution

1. **Prompt injection risk (heightened for agents)** — Both humans and AI agents submit text that becomes part of LLM prompts. Agents may be more sophisticated at prompt injection than humans — they can craft adversarial arguments designed to manipulate the AI jury. Mitigate with structured prompts, clear instruction separation, and system-level prompt framing. Test extensively with adversarial agent inputs.

2. **Evidence size limits** — On-chain storage is expensive. Consider storing evidence hashes on-chain with full evidence stored off-chain (IPFS, Arweave), and have the contract fetch/verify during evaluation.

3. **Finality window timing** — The 30-minute finality window is protocol-level. Cannot be customized per contract. Design the API and webhooks to handle this delay gracefully — agents should not block waiting for finality.

4. **Appeal costs** — Appeals require staking GEN tokens. This prevents frivolous appeals but could be a barrier for low-value agent disputes.

5. **No private data** — Everything on-chain is public. Dispute details, evidence, and rulings are all visible. Consider privacy-preserving techniques for sensitive agent operations.

6. **Cross-model consistency** — Validators use different LLMs. A prompt that works perfectly with GPT-4 might fail with Llama. Test across models using the statistical analysis feature.

7. **Agent identity verification** — How to verify that an agent wallet actually represents a specific agent? Consider integration with ERC-8004 agent identity registries or custom agent verification.

---

## Quick Reference: Essential Imports and Patterns

```python
# Standard imports for an intelligent contract
from genlayer import *
import json

# Common patterns
gl.message.sender_address     # Who is calling
gl.message.value              # GEN sent (payable only)
self.balance                  # Contract's token balance
self.address                  # Contract's address

# Non-deterministic operations
gl.nondet.exec_prompt(text)                           # LLM call
gl.nondet.exec_prompt(text, response_format='json')   # Structured LLM
gl.nondet.web.render(url)                             # Fetch webpage

# Equivalence principles
gl.eq_principle.strict_eq(fn)                         # Exact match
gl.eq_principle.prompt_comparative(fn, principle=...) # Fuzzy match
gl.eq_principle.prompt_non_comparative(fn, task=..., criteria=...)  # Verify-only

# Errors
raise gl.vm.UserError("message")                      # Revert with message

# Storage
gl.storage.copy_to_memory(value)                      # For non-det blocks
gl.storage.allow_storage                              # Decorator for custom types
```

---

*Last updated: February 2026*
*GenLayer SDK version referenced: v0.1.8*
*GenLayer testnet: Bradbury (active)*
