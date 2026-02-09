---
name: genlayer
version: 0.2.0
description: Comprehensive guide to building on GenLayer — AI-native blockchain with Python intelligent contracts validated by AI jurors. Covers contract development, testing, deployment, JS SDK, JSON-RPC API, and hard-won lessons from production use.
homepage: https://docs.genlayer.com
last_updated: 2026-02-09
---

# GenLayer — Complete Developer Guide

GenLayer is an AI-native blockchain where **intelligent contracts** are written in Python and validated by AI jurors running diverse LLMs. Contracts can call LLMs, fetch web data, and make subjective decisions — all validated through **Optimistic Democracy** consensus.

**Current status:** Testnet Bradbury (January 2026). No mainnet yet.

---

## Quick Start

### 1. Write a Contract

```python
# v0.1.0
# { "Depends": "py-genlayer:latest" }
from genlayer import *
import json

class HelloWorld(gl.Contract):
    greeting: str

    def __init__(self, greeting: str):
        self.greeting = greeting

    @gl.public.view
    def get_greeting(self) -> str:
        return self.greeting

    @gl.public.write
    def set_greeting(self, new_greeting: str):
        self.greeting = new_greeting
```

### 2. Test It

```bash
pip install genlayer-test cloudpickle
```

```python
# tests/test_hello.py
def test_greeting(direct_vm, direct_deploy):
    contract = direct_deploy("contracts/HelloWorld.py", "Hello GenLayer")
    assert contract.greeting == "Hello GenLayer"
    contract.set_greeting("Updated")
    assert contract.greeting == "Updated"
```

```bash
genlayer-test
```

### 3. Deploy to Studionet

```bash
npm install genlayer-js
```

```javascript
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import fs from "fs";

const account = createAccount(generatePrivateKey());
const client = createClient({ chain: studionet, account });

// Fund on testnet
await fetch("https://studio.genlayer.com/api", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0", method: "sim_fundAccount",
    params: [account.address, 10_000_000], id: 1,
  }),
});

// Initialize consensus (required before first transaction)
await client.initializeConsensusSmartContract();

// Deploy
const code = fs.readFileSync("contracts/HelloWorld.py", "utf8");
const hash = await client.deployContract({ code, args: ["Hello!"] });
const receipt = await client.waitForTransactionReceipt({
  hash,
  status: "ACCEPTED",
  retries: 120,
  interval: 5000,
});
console.log("Deployed at:", receipt.data?.contract_address);
```

---

## Contract Development

### Required File Headers

**CRITICAL:** Every contract file MUST start with these two comment lines:

```python
# v0.1.0
# { "Depends": "py-genlayer:latest" }
```

Without these headers, deployment fails with `absent_runner_comment` error. This is the #1 cause of deployment failures.

### Contract Structure

Contracts are Python classes extending `gl.Contract`. State variables are declared as class-level type annotations — they are automatically persisted on-chain.

```python
# v0.1.0
# { "Depends": "py-genlayer:latest" }
from genlayer import *
import json

class MyContract(gl.Contract):
    # State variables — persisted on-chain, MUST be declared with types
    owner: Address
    name: str
    count: u256
    items: TreeMap[str, str]
    members: DynArray[str]

    def __init__(self, name: str, initial_count: int = 0):
        """Constructor — called once on deployment."""
        self.owner = gl.message.sender_address
        self.name = name
        self.count = u256(initial_count)

    @gl.public.view
    def get_info(self) -> str:
        """Read-only method — free, no gas cost."""
        return json.dumps({"name": self.name, "count": int(self.count)})

    @gl.public.write
    def increment(self):
        """Write method — modifies state, costs gas."""
        self.count = u256(int(self.count) + 1)

    @gl.public.write.payable
    def deposit(self):
        """Payable method — can receive native tokens."""
        pass  # tokens added to self.balance automatically
```

### Method Decorators

| Decorator | Purpose | Gas Cost |
|-----------|---------|----------|
| `@gl.public.view` | Read-only, no state changes | Free |
| `@gl.public.write` | Modifies contract state | Costs gas |
| `@gl.public.write.payable` | Modifies state + receives tokens | Costs gas |
| (no decorator) | Private/internal — not callable externally | N/A |

### Transaction Context

```python
gl.message.sender_address    # Who called this method (Address)
gl.message.origin_address    # Who initiated the transaction (Address)
gl.message.value             # Tokens sent with the call (u256, payable only)
gl.message.contract_address  # This contract's address (Address)
gl.message.chain_id          # Current chain ID

self.address                 # This contract's Address
self.balance                 # This contract's native token balance
```

### Storage Types

GenLayer uses specific persistent types — you **cannot** use plain Python `int`, `list`, or `dict` for state variables.

| Python Type | GenLayer Storage Type | Notes |
|-------------|----------------------|-------|
| `int` | `u256` | Unsigned 256-bit integer. Use `u256(value)` constructor. |
| `bool` | `bool` | Works directly |
| `str` | `str` | Works directly |
| `bytes` | `bytes` | Works directly |
| `list[T]` | `DynArray[T]` | Dynamic persistent array |
| `dict[K,V]` | `TreeMap[K,V]` | Persistent ordered map. Keys must be `str` or `u256`. |
| Address | `Address` | 20-byte blockchain address |

**Default values:** Storage is zero-initialized — integers become `0`, strings become `""`, collections become empty.

**u256 arithmetic gotcha:** You must convert between `u256` and `int` for arithmetic:
```python
self.count = u256(int(self.count) + 1)  # increment
total = int(self.amount_a) + int(self.amount_b)  # addition
```

### Address Handling

**CRITICAL:** Contract constructors MUST handle multiple Address input formats. The JS SDK sends addresses as hex strings, while the Python test framework sends raw bytes:

```python
def __init__(self, party_b: Address):
    # Handle both bytes (from direct tests) and str (from JS SDK on studionet)
    if isinstance(party_b, str):
        party_b = Address(party_b)
    elif isinstance(party_b, bytes):
        party_b = Address(party_b)
    self.party_b = party_b
```

Without this, you'll get `AttributeError: 'str' object has no attribute 'as_bytes'` on studionet, or similar errors with raw bytes in tests.

### Error Handling

Use `raise ValueError("message")` for reverts:

```python
@gl.public.write
def only_owner(self):
    if gl.message.sender_address != self.owner:
        raise ValueError("Only owner can call this")
```

Note: Some older documentation shows `gl.vm.UserError` — both work, but `ValueError` is the standard pattern.

### Returning Data

View methods typically return JSON strings for structured data:

```python
@gl.public.view
def get_details(self) -> str:
    return json.dumps({
        "owner": self.owner.as_hex,
        "name": self.name,
        "count": int(self.count),
    })
```

Use `address.as_hex` to convert Address to string for JSON serialization.

---

## Non-Deterministic Blocks (AI-Powered Logic)

This is GenLayer's superpower. Non-deterministic blocks let contracts call LLMs, fetch web data, and make subjective decisions — with consensus from multiple AI validators.

### Rules

1. Non-deterministic code must be inside a **function with no arguments**
2. That function must be passed to an **equivalence principle** function
3. **Storage CANNOT be accessed** inside non-deterministic blocks — copy data to local variables first
4. Use closures to pass data into the function

### Equivalence Principles

Equivalence principles tell validators how to verify each other's work:

#### `strict_eq` — Exact Match

All validators must return identical values. Best for boolean/numeric results.

```python
@gl.public.write
def check_price(self, url: str) -> bool:
    target_url = url  # capture for closure

    def nondet():
        page = gl.nondet.web.get(target_url)
        return "in stock" in page.body.decode().lower()

    result = gl.eq_principle.strict_eq(nondet)
    self.is_available = result
    return result
```

**When to use:** Results that should be identical across all validators. Works with mocked LLMs in tests.

**WARNING on studionet:** `strict_eq` gets `MAJORITY_DISAGREE` when validators run different LLMs (GPT, Claude, Gemini, etc.) because they produce different text. Only use `strict_eq` when the output is truly deterministic (boolean, number, or mocked in tests).

#### `prompt_non_comparative` — Verify-Only (Recommended for AI Logic)

The leader validator does the work; co-validators only **verify** the leader's result meets criteria. Best for free-form LLM output.

```python
@gl.public.write
def evaluate(self, question: str) -> str:
    q = question  # copy to local for closure

    def nondet():
        prompt = f"""Evaluate this question: {q}
Respond with JSON: {{"answer": "yes" or "no", "reasoning": "..."}}"""
        result = gl.nondet.exec_prompt(prompt)
        # Strip code fences if LLM wraps response
        if isinstance(result, str):
            result = result.replace("```json", "").replace("```", "").strip()
        return result

    result_str = gl.eq_principle.prompt_non_comparative(
        nondet,
        task="Answer a yes/no question with reasoning",
        criteria="The answer must be 'yes' or 'no'. The reasoning must be logical and address the question.",
    )
    return result_str
```

**When to use:** Any free-form LLM output where different wording is acceptable as long as the conclusion is the same. This is what you want for most AI-powered contract logic.

**CRITICAL BUG:** `prompt_non_comparative` is **broken in direct test mode** — the test framework patches `gl.vm.run_nondet` with a plain function that's missing the `.lazy` attribute. You must patch it in your test conftest (see Testing section below).

#### `prompt_comparative` — Fuzzy Match

Both leader and validators do the same work, then an LLM checks if results are "equivalent enough."

```python
result = gl.eq_principle.prompt_comparative(
    nondet,
    principle="The ratings should be within 0.2 points of each other"
)
```

### LLM Prompt Execution

```python
# Simple text response
result = gl.nondet.exec_prompt("Summarize this: ...")

# JSON response
result = gl.nondet.exec_prompt(
    "Extract data as JSON: ...",
    response_format='json'
)

# With images (multimodal)
result = gl.nondet.exec_prompt(
    "Describe this image",
    images=[image_bytes]
)
```

### Web Access

```python
# HTTP GET
response = gl.nondet.web.get(url)
# response.status, response.headers, response.body (bytes)

# Render webpage (with JavaScript execution)
response = gl.nondet.web.render(url)
# Can also use mode='screenshot' for visual analysis
response = gl.nondet.web.render(url, mode='screenshot')
```

### Accessing Storage in Non-Det Blocks

Storage variables are **NOT accessible** inside non-deterministic functions. Copy them to local variables first:

```python
@gl.public.write
def evaluate(self):
    # Copy storage to local memory BEFORE the nondet block
    stmt = self.statement
    evidence = self.evidence

    def nondet():
        # stmt and evidence are available via closure
        prompt = f"Evaluate: {stmt}\nEvidence: {evidence}"
        return gl.nondet.exec_prompt(prompt)

    result = gl.eq_principle.prompt_non_comparative(nondet, task="...", criteria="...")
```

For complex storage types, use `gl.storage.copy_to_memory()`:
```python
case_data = gl.storage.copy_to_memory(self.cases[case_id])
```

---

## Real-World Contract Example

Here's a complete, production-tested contract (from MoltCourt — dispute resolution for AI agents):

```python
# v0.1.0
# { "Depends": "py-genlayer:latest" }
from genlayer import *
import json
import datetime

class MoltCourt(gl.Contract):
    party_a: Address
    party_b: Address
    statement: str          # Claim to evaluate (true/false)
    guidelines: str         # How AI jury should evaluate
    evidence_defs: str      # JSON: what evidence each side can submit
    status: str             # "created" | "active" | "disputed" | "resolving" | "resolved" | "cancelled"
    evidence_a: str
    evidence_b: str
    verdict: str            # "TRUE" | "FALSE" | "UNDETERMINED"
    reasoning: str
    proposed_outcome_a: str
    proposed_outcome_b: str
    evidence_deadline_seconds: u256
    dispute_timestamp: str

    def __init__(
        self,
        party_b: Address,
        statement: str,
        guidelines: str,
        evidence_defs: str,
        evidence_deadline_seconds: int = 0,
    ):
        self.party_a = gl.message.sender_address
        # Handle both bytes (tests) and str (JS SDK)
        if isinstance(party_b, str):
            party_b = Address(party_b)
        elif isinstance(party_b, bytes):
            party_b = Address(party_b)
        self.party_b = party_b
        self.statement = statement
        self.guidelines = guidelines
        self.evidence_defs = evidence_defs
        self.status = "created"
        self.evidence_a = ""
        self.evidence_b = ""
        self.verdict = ""
        self.reasoning = ""
        self.proposed_outcome_a = ""
        self.proposed_outcome_b = ""
        self.evidence_deadline_seconds = u256(evidence_deadline_seconds)
        self.dispute_timestamp = ""

    @gl.public.write
    def accept_contract(self) -> None:
        if self.status != "created":
            raise ValueError("Contract not in created state")
        if gl.message.sender_address != self.party_b:
            raise ValueError("Only party B can accept")
        self.status = "active"

    @gl.public.write
    def propose_outcome(self, outcome: str) -> None:
        """Three-key mutual agreement — if both parties agree, no AI jury needed."""
        if self.status != "active":
            raise ValueError("Contract not active")
        if outcome not in ("TRUE", "FALSE"):
            raise ValueError("Outcome must be TRUE or FALSE")
        sender = gl.message.sender_address
        if sender != self.party_a and sender != self.party_b:
            raise ValueError("Not a party to this contract")
        if sender == self.party_a:
            self.proposed_outcome_a = outcome
        else:
            self.proposed_outcome_b = outcome
        if (self.proposed_outcome_a != ""
            and self.proposed_outcome_b != ""
            and self.proposed_outcome_a == self.proposed_outcome_b):
            self.verdict = self.proposed_outcome_a
            self.reasoning = "Resolved by mutual agreement (2-of-2)"
            self.status = "resolved"

    @gl.public.write
    def initiate_dispute(self) -> None:
        if self.status != "active":
            raise ValueError("Contract not active")
        sender = gl.message.sender_address
        if sender != self.party_a and sender != self.party_b:
            raise ValueError("Not a party to this contract")
        self.status = "disputed"
        self.dispute_timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

    @gl.public.write
    def submit_evidence(self, evidence: str) -> None:
        if self.status != "disputed":
            raise ValueError("No active dispute")
        sender = gl.message.sender_address
        defs = json.loads(self.evidence_defs)
        if sender == self.party_a:
            if self.evidence_a != "":
                raise ValueError("Party A already submitted evidence")
            max_chars = defs.get("party_a", {}).get("max_chars", 50000)
            if len(evidence) > max_chars:
                raise ValueError(f"Evidence exceeds max length of {max_chars} characters")
            self.evidence_a = evidence
        elif sender == self.party_b:
            if self.evidence_b != "":
                raise ValueError("Party B already submitted evidence")
            max_chars = defs.get("party_b", {}).get("max_chars", 50000)
            if len(evidence) > max_chars:
                raise ValueError(f"Evidence exceeds max length of {max_chars} characters")
            self.evidence_b = evidence
        else:
            raise ValueError("Not a party to this contract")

    @gl.public.write
    def resolve(self) -> None:
        """Trigger AI jury evaluation."""
        if self.status != "disputed":
            raise ValueError("No active dispute to resolve")
        if self.evidence_a == "" or self.evidence_b == "":
            raise ValueError("Both parties must submit evidence before resolution")
        self.status = "resolving"

        # Copy storage to local vars for non-det block
        stmt = self.statement
        guide = self.guidelines
        ev_a = self.evidence_a
        ev_b = self.evidence_b

        def nondet():
            prompt = f"""You are an impartial AI juror in MoltCourt.
## Statement to Evaluate
{stmt}
## Evaluation Guidelines
{guide}
## Party A's Evidence (supports TRUE)
{ev_a}
## Party B's Evidence (supports FALSE)
{ev_b}
## Instructions
Evaluate based ONLY on the evidence and guidelines.
Respond with ONLY a JSON object:
{{"verdict": "TRUE" or "FALSE" or "UNDETERMINED", "reasoning": "2-3 sentence explanation"}}
"""
            result = gl.nondet.exec_prompt(prompt)
            if isinstance(result, str):
                result = result.replace("```json", "").replace("```", "").strip()
            return result

        result_str = gl.eq_principle.prompt_non_comparative(
            nondet,
            task="Evaluate a dispute and render a verdict as JSON",
            criteria="The verdict must be TRUE, FALSE, or UNDETERMINED. The reasoning must address the evidence.",
        )

        if isinstance(result_str, str):
            result = json.loads(result_str)
        elif isinstance(result_str, dict):
            result = result_str
        else:
            result = json.loads(str(result_str))

        self.verdict = result["verdict"]
        self.reasoning = result["reasoning"]
        self.status = "resolved"

    @gl.public.view
    def get_status(self) -> str:
        return json.dumps({
            "status": self.status,
            "statement": self.statement,
            "party_a": self.party_a.as_hex,
            "party_b": self.party_b.as_hex,
            "verdict": self.verdict,
            "reasoning": self.reasoning,
        })
```

---

## Factory / Registry Pattern

For managing multiple contract instances, use a factory pattern with `TreeMap` + JSON-based indexing:

```python
# v0.1.0
# { "Depends": "py-genlayer:latest" }
from genlayer import *
import json

class MyFactory(gl.Contract):
    owner: Address
    registry: TreeMap[u256, str]       # id -> JSON metadata
    next_id: u256
    type_index: TreeMap[str, str]      # type -> JSON array of IDs
    deployer_index: TreeMap[str, str]  # deployer hex -> JSON array of IDs
    registered_types: TreeMap[str, str]  # type_name -> "true"/"false"

    def __init__(self):
        self.owner = gl.message.sender_address
        self.next_id = u256(0)

    @gl.public.write
    def register_type(self, contract_type: str) -> None:
        if gl.message.sender_address != self.owner:
            raise ValueError("Only owner can register types")
        self.registered_types[contract_type] = "true"

    @gl.public.write
    def register_contract(self, contract_address: str, contract_type: str, params: str) -> u256:
        existing = self.registered_types.get(contract_type)
        if existing is None or existing != "true":
            raise ValueError("Contract type not registered")

        contract_id = self.next_id
        deployer = gl.message.sender_address

        self.registry[contract_id] = json.dumps({
            "id": int(contract_id),
            "address": contract_address,
            "contract_type": contract_type,
            "deployer": deployer.as_hex,
            "params": params,
        })

        # Update type index (JSON array pattern for nested collections)
        type_ids = self.type_index.get(contract_type)
        id_list = json.loads(type_ids) if type_ids is not None else []
        id_list.append(int(contract_id))
        self.type_index[contract_type] = json.dumps(id_list)

        self.next_id = u256(int(self.next_id) + 1)
        return contract_id

    @gl.public.view
    def get_contracts_by_type(self, contract_type: str) -> str:
        type_ids = self.type_index.get(contract_type)
        if type_ids is None:
            return json.dumps([])
        id_list = json.loads(type_ids)
        results = []
        for cid in id_list:
            metadata = self.registry.get(u256(cid))
            if metadata is not None:
                results.append(json.loads(metadata))
        return json.dumps(results)
```

**Key pattern:** Since `TreeMap` can't nest (no `TreeMap[str, DynArray]`), use JSON strings to store arrays within TreeMap values.

---

## Testing with genlayer-test

### Setup

```bash
pip install genlayer-test cloudpickle
```

`cloudpickle` is required as a dependency for `strict_eq` / `run_nondet_unsafe`. Without it, you'll get import errors at runtime.

Create `gltest.config.yaml` in your project root:

```yaml
networks:
  default: localnet
  localnet:
    leader_only: true
  studionet:
    leader_only: true

paths:
  contracts: "contracts"
  artifacts: "artifacts"

environment: .env
```

### Direct Mode (Fast Unit Testing)

Direct mode runs contracts in-process with Python — **extremely fast** (~0.4 seconds for 60+ tests). This is your primary testing mode.

**Key fixtures** (provided by gltest plugin — no imports needed):
- `direct_vm` — VM context for test utilities
- `direct_deploy` — Deploy contracts from source files

```python
def test_basic(direct_vm, direct_deploy):
    # Set the sender address (as raw bytes)
    direct_vm.sender = b'\x01' * 20

    # Deploy contract with constructor args
    contract = direct_deploy(
        "contracts/MyContract.py",  # relative to project root
        "constructor_arg_1",
        "constructor_arg_2",
    )

    # Read state directly
    assert contract.name == "constructor_arg_1"

    # Call view methods
    info = contract.get_info()

    # Call write methods
    contract.update_name("New Name")
    assert contract.name == "New Name"
```

**IMPORTANT:** The `genlayer` module is ONLY importable AFTER `direct_deploy` runs — it downloads and extracts the SDK from GitHub releases on first use. You cannot `from genlayer import Address` at the top of your test file.

```python
def test_with_address(direct_vm, direct_deploy):
    direct_vm.sender = b'\x01' * 20
    contract = direct_deploy("contracts/MyContract.py", b'\x02' * 20, "test")

    # NOW genlayer is loaded — import Address here
    from genlayer import Address
    alice = Address(b'\x01' * 20)
    bob = Address(b'\x02' * 20)
```

### Test Utilities

```python
# Mock LLM responses (regex pattern -> response string)
direct_vm.mock_llm(r".*impartial AI juror.*", '{"verdict": "TRUE", "reasoning": "Test."}')

# Impersonate a sender
with direct_vm.prank(some_address):
    contract.some_method()

# Assert that a method reverts with a specific error message
with direct_vm.expect_revert("Only owner can call this"):
    contract.admin_method()

# Snapshot and revert state
snap = direct_vm.snapshot()
contract.change_something()
direct_vm.revert(snap)  # undo changes

# Time manipulation
direct_vm.warp("2025-06-15T12:00:00Z")  # set current time
```

**Note:** `create_address()` from gltest returns raw `bytes`, not `Address` objects. Use `Address(bytes_value)` after `direct_deploy` has loaded the SDK.

### Patching `prompt_non_comparative` for Tests

`prompt_non_comparative` is **broken in direct test mode** because the test framework patches `gl.vm.run_nondet` with a plain function missing the `.lazy` attribute. You must add this patch to your `conftest.py`:

```python
# conftest.py
import json
import pytest

ALICE_BYTES = b'\x01' * 20
BOB_BYTES = b'\x02' * 20

def _patch_prompt_non_comparative():
    """Patch prompt_non_comparative to use strict_eq in direct test mode.

    prompt_non_comparative uses ExecPromptTemplate gl_calls internally,
    which the direct test WASI mock doesn't handle. Since tests mock LLM
    responses to return identical results anyway, strict_eq gives the same
    behavior. On studionet, the real prompt_non_comparative is used.
    """
    import genlayer.gl.eq_principle as eq_mod
    import genlayer.gl.vm as vm_mod
    from genlayer.gl._internal import _lazy_api
    from genlayer.py.types import Lazy
    import typing

    @_lazy_api
    def patched_prompt_non_comparative(
        fn: typing.Callable[[], str], *, task: str, criteria: str
    ) -> Lazy[str]:
        def validator_fn(leaders_res: vm_mod.Result) -> bool:
            my_res = vm_mod.spawn_sandbox(fn)
            return my_res == leaders_res
        return vm_mod.run_nondet_unsafe.lazy(fn, validator_fn)

    eq_mod.prompt_non_comparative = patched_prompt_non_comparative
    import genlayer.gl as gl_mod
    gl_mod.eq_principle.prompt_non_comparative = patched_prompt_non_comparative


@pytest.fixture
def deploy_mycontract(direct_vm, direct_deploy):
    """Deploy contract with standard test setup."""
    direct_vm.sender = ALICE_BYTES
    contract = direct_deploy("contracts/MyContract.py", BOB_BYTES, "Test")

    # MUST patch after direct_deploy loads the SDK
    _patch_prompt_non_comparative()

    from genlayer import Address
    alice = Address(ALICE_BYTES)
    bob = Address(BOB_BYTES)
    return contract, alice, bob
```

### Test File Gotchas

- **Don't `from conftest import ...`** — pytest loads conftest automatically, but the module isn't on `sys.path` for regular imports. Duplicate constants in test files if needed.
- **conftest fixtures are still available** without explicit imports — pytest handles this automatically.
- **SDK artifacts are cached** at `~/.cache/gltest-direct/extracted/` — delete this directory if you need a clean SDK download.

### Full Test Example

```python
"""Tests for MyContract."""
import json
import pytest

# Duplicate constants from conftest (can't import from conftest)
SAMPLE_DATA = "test data"
CHARLIE_BYTES = b'\x03' * 20

class TestDeployment:
    def test_initial_state(self, deploy_mycontract):
        contract, alice, bob = deploy_mycontract
        assert contract.status == "created"

    def test_stores_parties(self, deploy_mycontract):
        contract, alice, bob = deploy_mycontract
        assert contract.party_a == alice
        assert contract.party_b == bob

class TestAccessControl:
    def test_only_party_b_can_accept(self, deploy_mycontract, direct_vm):
        contract, alice, bob = deploy_mycontract
        with direct_vm.expect_revert("Only party B can accept"):
            with direct_vm.prank(alice):
                contract.accept()

    def test_party_b_accepts(self, deploy_mycontract, direct_vm):
        contract, alice, bob = deploy_mycontract
        with direct_vm.prank(bob):
            contract.accept()
        assert contract.status == "active"

class TestAIResolution:
    def test_resolve_with_mocked_llm(self, deploy_mycontract, direct_vm):
        contract, alice, bob = deploy_mycontract
        # Setup: activate, dispute, submit evidence
        with direct_vm.prank(bob):
            contract.accept()
        with direct_vm.prank(alice):
            contract.initiate_dispute()
        with direct_vm.prank(alice):
            contract.submit_evidence("Evidence A")
        with direct_vm.prank(bob):
            contract.submit_evidence("Evidence B")

        # Mock the LLM response
        direct_vm.mock_llm(
            r".*impartial AI juror.*",
            '{"verdict": "TRUE", "reasoning": "Evidence supports the claim."}'
        )
        contract.resolve()

        assert contract.status == "resolved"
        assert contract.verdict == "TRUE"

class TestSnapshotRevert:
    def test_revert_undoes_state_changes(self, deploy_mycontract, direct_vm):
        contract, alice, bob = deploy_mycontract
        snap = direct_vm.snapshot()

        with direct_vm.prank(bob):
            contract.accept()
        assert contract.status == "active"

        direct_vm.revert(snap)
        assert contract.status == "created"
```

### Running Tests

```bash
genlayer-test                           # Run all tests (direct mode)
genlayer-test tests/test_contract.py    # Specific file
genlayer-test -v                        # Verbose output
genlayer-test -k "test_resolve"         # Filter by name
genlayer-test --network studionet       # On hosted studionet
```

---

## Studionet Deployment

### Network Info

| Property | Value |
|----------|-------|
| **Network** | Testnet Bradbury / Studionet |
| **RPC Endpoint** | `https://studio.genlayer.com/api` |
| **Protocol** | JSON-RPC 2.0 |
| **Transaction Time** | ~100 seconds |
| **Finality Window** | ~30 minutes |
| **Validators** | 5 with mixed LLMs (GPT-5.1, Gemini 3, Grok 4, Claude Sonnet 4.5, DeepSeek V3.2) |

### Transaction Lifecycle

```
PENDING → PROPOSING → COMMITTING → REVEALING → ACCEPTED → FINALIZED
```

| Stage | Description |
|-------|-------------|
| **PENDING** | Submitted, waiting for validator selection |
| **PROPOSING** | Leader validator processing the transaction |
| **COMMITTING** | Co-validators independently verifying |
| **REVEALING** | Votes being revealed |
| **ACCEPTED** | Majority consensus reached |
| **FINALIZED** | Confirmed after finality window (~30 min) |

For most operations, waiting for `ACCEPTED` is sufficient. Full `FINALIZED` takes ~30 minutes.

### The Appeal Process

GenLayer has a built-in escalation system:

```
Initial ruling:    5 validators
First appeal:     23 validators
Second appeal:    47 validators
Third appeal:     95 validators
```

Anyone can appeal during the finality window by staking GEN tokens. More validators re-examine the evidence and can overturn decisions.

---

## genlayer-js SDK

### Installation

```bash
npm install genlayer-js
```

### Client Setup

```javascript
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

// Create new account
const account = createAccount(generatePrivateKey());

// Or import existing private key
const account = createAccount("0xYourPrivateKey");

// Create client
const client = createClient({ chain: studionet, account });

// REQUIRED: Initialize consensus before first transaction
await client.initializeConsensusSmartContract();
```

### Funding (Free — No Tokens Needed)

GenLayer Studionet is a simulation environment with **no real gas fees**. `sim_fundAccount` gives you free simulation balance instantly — no faucet, no bridge, no tokens required.

```javascript
// Fund your account (free, instant, call as many times as you want)
await fetch("https://studio.genlayer.com/api", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    method: "sim_fundAccount",
    params: [account.address, 10_000_000],
    id: 1,
  }),
});
```

### Reading Contracts (Free)

```javascript
const result = await client.readContract({
  address: "0xContractAddress",
  functionName: "get_status",
  args: [],
});

// Results may be strings — parse JSON if needed
const data = typeof result === "string" ? JSON.parse(result) : result;
```

### Writing to Contracts

```javascript
const hash = await client.writeContract({
  address: "0xContractAddress",
  functionName: "accept_contract",
  args: [],
  leaderOnly: false,  // Use full consensus
});

// Wait for acceptance
const receipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.ACCEPTED,
  retries: 120,
  interval: 5000,  // Poll every 5 seconds
});

// Check success
const SUCCESS_RESULTS = ["SUCCESS", "MAJORITY_AGREE", "AGREE"];
const isSuccess = receipt.result === 0 || SUCCESS_RESULTS.includes(receipt.result_name);
```

### Deploying Contracts

```javascript
import fs from "fs";

const code = fs.readFileSync("contracts/MyContract.py", "utf8");
const hash = await client.deployContract({
  code,
  args: ["constructor_arg_1", "constructor_arg_2"],
  leaderOnly: false,
});

const receipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.ACCEPTED,
  retries: 120,
  interval: 5000,
});

const contractAddress = receipt.data?.contract_address || receipt.to_address;
```

### Getting Contract Schema

```javascript
const schema = await client.getContractSchema({
  address: "0xContractAddress",
});
// Returns constructor info, method signatures, parameter types, return types
```

### Read Retries for Propagation

After deploying or writing, reads may fail briefly while state propagates. Use retry logic:

```javascript
async function readWithRetry(client, address, functionName, args = []) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await client.readContract({ address, functionName, args });
    } catch (e) {
      if (attempt < 4 && e.message?.includes("not deployed")) {
        await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
}
```

---

## JSON-RPC API

For environments without the JS SDK, use direct JSON-RPC calls:

### Read a Contract (Free)

```bash
curl -s https://studio.genlayer.com/api -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "call_contract_function",
    "params": ["0xContractAddress", "get_status", []],
    "id": 1
  }'
```

### Key Methods

| Method | Description | Cost |
|--------|-------------|------|
| `call_contract_function` | Call view method (read) | Free |
| `gen_getContractSchema` | Get method signatures | Free |
| `gen_getTransactionReceipt` | Check transaction status | Free |
| `gen_getContractState` | Get raw contract state | Free |
| `sim_fundAccount` | Fund testnet account | Testnet only |
| `sim_createAccount` | Create testnet account | Testnet only |

### Frontend Integration (TypeScript)

```typescript
const RPC = "https://studio.genlayer.com/api";

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

// Read contract
const status = await rpcCall("call_contract_function", [
  "0xContractAddress", "get_status", []
]);
```

---

## Common Errors & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| `absent_runner_comment` | Missing file headers | Add `# v0.1.0` and `# { "Depends": "py-genlayer:latest" }` as the first two lines |
| `AttributeError: 'str' object has no attribute 'as_bytes'` | JS SDK sends Address args as hex strings | Add `if isinstance(param, str): param = Address(param)` in constructor |
| `MAJORITY_DISAGREE` on non-det methods | Different LLMs produce different text | Use `prompt_non_comparative` instead of `strict_eq` for free-form output |
| `prompt_non_comparative` crashes in tests | Missing `.lazy` attribute in test mock | Patch with the `_patch_prompt_non_comparative()` function shown above |
| `ImportError: cloudpickle` | Missing dependency for `strict_eq` | `pip install cloudpickle` |
| `genlayer` module not found in tests | Tried to import before `direct_deploy` | Import `genlayer` types AFTER calling `direct_deploy()` |
| `from conftest import ...` fails | conftest not on sys.path | Don't import from conftest — duplicate constants or use fixtures |
| `Contract not deployed` after write | State propagation delay on studionet | Add 3-5 second delay after writes; use retry logic for reads |
| `Insufficient funds` | Account not funded | Call `sim_fundAccount` on testnet |
| Timeout on `resolve()` | AI evaluation takes time | Use `retries: 120, interval: 5000` for waitForTransactionReceipt |

---

## Platform Limitations

1. **No mainnet yet** — testnet only, expect API changes
2. **~100s per write transaction** — not real-time; design for async
3. **~30 min finality** — design for `ACCEPTED` status in most cases
4. **Storage types are restrictive** — no plain `int`/`list`/`dict`; use `u256`/`DynArray`/`TreeMap`
5. **Single contract class per file** — each `.py` file can only contain one `gl.Contract` subclass
6. **Non-det blocks can't access storage** — copy to local vars first
7. **Non-det functions take no arguments** — use closures
8. **TreeMap keys must be `str` or `u256`** — for calldata encoding compatibility
9. **LLM variability across validators** — 5 different LLMs; prompts must be robust across models
10. **Gas cost** — non-det operations (LLM calls, web fetches) cost more than deterministic operations

---

## Useful Resources

| Resource | URL |
|----------|-----|
| GenLayer Docs | https://docs.genlayer.com |
| Python SDK Reference | https://sdk.genlayer.com/main/api/genlayer.html |
| genlayer-js (npm) | https://www.npmjs.com/package/genlayer-js |
| GenLayer GitHub | https://github.com/genlayerlabs |
| GenLayer Studio | https://studio.genlayer.com |
| Node API Reference | https://docs.genlayer.com/api-references/genlayer-node |
| JS SDK Reference | https://docs.genlayer.com/api-references/genlayer-js |
| Python SDK Reference | https://docs.genlayer.com/api-references/genlayer-py |

---

*Last updated: February 2026 | GenLayer SDK v0.1.8 | Testnet Bradbury*
