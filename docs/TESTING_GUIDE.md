# Testing Guide

Developer reference for running and writing tests in the internetcourt repo.

## Test Structure

All tests live under `contracts/tests/`. Total: **~283 tests**.

| File | Tests | What it covers |
|------|-------|----------------|
| `test_internetcourt.py` | 126 | Core InternetCourt contract: deployment, accept, cancel, propose outcome, dispute, evidence submission, AI resolution, deadlines, snapshots, edge cases |
| `test_factory.py` | 63 | InternetCourtFactory contract: type registration, contract registration, querying by type/deployer/ID, ownership transfer |
| `test_smoke.py` | 4 | Quick sanity check: deploy, accept, mutual resolve, AI dispute flow |
| `direct/test_creation.py` | 22 | Contract creation and acceptance (organized subdirectory) |
| `direct/test_dispute.py` | 40 | Dispute initiation, evidence submission, access control |
| `direct/test_resolution.py` | 28 | AI jury resolution, auto-resolve, LLM response parsing |
| `integration/` | -- | Studionet scripts (`.mjs`), not pytest -- see below |

### Config

- `pytest.ini` sets `testpaths = direct` (default scope is the `direct/` subdirectory)
- Root `conftest.py` provides fixtures for `test_internetcourt.py`, `test_factory.py`, `test_smoke.py`
- `direct/conftest.py` provides separate fixtures for the `direct/` subdirectory

## Prerequisites

```bash
pip install genlayer-test>=0.12.0 pytest>=8.0.0 cloudpickle
```

`cloudpickle` is a hidden dependency required by `genlayer.gl.vm` -- not listed in requirements.txt but will cause `ImportError` if missing.

## How to Run

All commands assume you are in `contracts/tests/`:

```bash
cd contracts/tests
```

### Run everything (both root and direct/ tests)

```bash
python -m pytest . -v
```

Note: `pytest.ini` defaults to `testpaths = direct`, so bare `pytest` only runs `direct/`. Use `.` explicitly to include root-level test files.

### Run specific suites

```bash
# Core contract tests (126 tests)
python -m pytest test_internetcourt.py -v

# Factory tests (63 tests)
python -m pytest test_factory.py -v

# Smoke tests (4 tests, fast sanity check)
python -m pytest test_smoke.py -v

# Direct subdirectory tests (90 tests)
python -m pytest direct/ -v
```

### Run by pattern

```bash
python -m pytest -k "test_deploy" -v            # all deployment tests
python -m pytest -k "TestResolve" -v             # resolution test class
python -m pytest -k "deadline" -v                # evidence deadline tests
python -m pytest -k "snapshot" -v                # snapshot/revert tests
python -m pytest -k "cancel" -v                  # cancellation tests
```

### Integration tests (not pytest)

Integration tests under `contracts/tests/integration/` are Node.js scripts that run against GenLayer studionet. They are NOT pytest tests.

```bash
cd contracts/tests/integration
node deploy-and-test.mjs
node test-prime-dispute.mjs
```

## GenLayer Direct Testing Explained

"Direct testing" means running contracts in an **in-memory WASI VM** -- no network, no real consensus, no studionet required. Tests execute instantly because there is no blockchain overhead.

The `genlayer-test` package provides a pytest plugin (`gltest.direct.pytest_plugin`) with these fixtures:

| Fixture | What it gives you |
|---------|-------------------|
| `direct_vm` | The VM context -- use for pranking, mocking, snapshots, time warping |
| `direct_deploy` | Function to deploy a contract: `direct_deploy("contracts/Foo.py", *constructor_args)` |
| `direct_alice` | Pre-made Address for alice (`b'\x01' * 20`) |
| `direct_bob` | Pre-made Address for bob (`b'\x02' * 20`) |
| `direct_charlie` | Pre-made Address for charlie (`b'\x03' * 20`) |

### Importing fixtures

In `direct/conftest.py`, fixtures are explicitly imported from the plugin:

```python
from gltest.direct.pytest_plugin import (
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie,
)
```

The root `conftest.py` does NOT import these -- they are auto-discovered by pytest from the installed plugin.

## Cheatcodes Reference

All cheatcodes are methods on `direct_vm`:

### `direct_vm.prank(address)` -- Impersonate caller

```python
with direct_vm.prank(bob):
    contract.accept_contract()  # msg.sender == bob
```

### `direct_vm.expect_revert(message)` -- Assert failure

```python
with direct_vm.expect_revert("Only party B can accept"):
    with direct_vm.prank(alice):
        contract.accept_contract()
```

### `direct_vm.mock_llm(pattern, response)` -- Mock AI responses

Pattern is a regex matched against the LLM prompt. Response is the string the LLM "returns".

```python
direct_vm.mock_llm(
    r".*impartial AI juror.*",
    '{"verdict": "TRUE", "reasoning": "The audit was complete."}'
)
```

### `direct_vm.mock_web(url, response)` -- Mock HTTP calls

```python
direct_vm.mock_web("https://example.com/api", '{"result": "ok"}')
```

### `direct_vm.snapshot()` / `direct_vm.revert(id)` -- State snapshots

```python
snap = direct_vm.snapshot()
# ... mutate state ...
direct_vm.revert(snap)  # rolls back all changes
```

### `direct_vm.warp(timestamp)` -- Time travel

Accepts ISO 8601 strings:

```python
direct_vm.warp("2025-06-15T12:00:00Z")
# ... later ...
direct_vm.warp("2025-06-15T14:00:00Z")  # 2 hours later
```

### `direct_vm.run_validator(contract, method, args)` -- Simulate consensus

Run a method as if a validator were executing it (for testing non-deterministic paths).

## Common Patterns

### Setting up lifecycle stages

Tests use fixture chaining to get contracts at different stages:

```python
# deploy_internetcourt -> (contract, alice, bob)  status: "created"
# active_contract      -> (contract, alice, bob)  status: "active"
# disputed_contract    -> (contract, alice, bob)  status: "disputed"
```

Each fixture builds on the previous one. Define them in conftest.py:

```python
@pytest.fixture
def active_contract(deploy_internetcourt, direct_vm):
    contract, alice, bob = deploy_internetcourt
    with direct_vm.prank(bob):
        contract.accept_contract()
    return contract, alice, bob
```

### Testing access control

Combine `prank` + `expect_revert`:

```python
def test_non_party_cannot_accept(self, deploy_internetcourt, direct_vm):
    contract, alice, bob = deploy_internetcourt
    charlie = Address(b'\x03' * 20)
    with direct_vm.expect_revert("Only party B can accept"):
        with direct_vm.prank(charlie):
            contract.accept_contract()
```

### Testing auto-resolve (the critical pattern)

When both parties submit evidence, `submit_evidence` auto-calls `_do_resolve()`. You MUST mock the LLM **before** the second `submit_evidence` call:

```python
# Party A submits first
with direct_vm.prank(alice):
    contract.submit_evidence("A's evidence")

# Mock LLM BEFORE party B submits -- B's submission triggers auto-resolve
direct_vm.mock_llm(
    r".*impartial AI juror.*",
    '{"verdict": "TRUE", "reasoning": "Confirmed."}'
)

# Party B submits -- this triggers resolution internally
with direct_vm.prank(bob):
    contract.submit_evidence("B's evidence")

assert contract.status == "resolved"
```

### Testing time-dependent behavior

```python
direct_vm.warp("2025-06-15T12:00:00Z")  # set "now"
with direct_vm.prank(alice):
    contract.initiate_dispute()

direct_vm.warp("2025-06-15T14:00:00Z")  # 2 hours later
with direct_vm.expect_revert("Evidence submission deadline has passed"):
    with direct_vm.prank(alice):
        contract.submit_evidence("Too late")
```

## Gotchas and Lessons Learned

1. **mock_llm timing**: Must be set BEFORE the action that triggers the LLM call. With auto-resolve, that means before the second `submit_evidence`. If you mock after, the VM has already tried to call the LLM and failed.

2. **prompt_non_comparative patch**: Direct mode does not support `ExecPromptTemplate` (used by `prompt_non_comparative`). Tests patch it to use `strict_eq` instead. This patch must happen after `direct_deploy` loads the SDK. See `_patch_prompt_non_comparative()` in conftest.

3. **cloudpickle dependency**: `genlayer.gl.vm` requires `cloudpickle` at runtime. It is not listed in genlayer-test's dependencies. Install it explicitly or tests will crash with `ImportError`.

4. **Relative imports in subdirectories**: Tests in `direct/` must use relative imports: `from .conftest import STATEMENT, ...`. Absolute imports will fail because `direct/` is a package, not a standalone module.

5. **pytest.ini testpaths default**: The config sets `testpaths = direct`, so bare `pytest` only runs the subdirectory. Pass `.` to run all tests: `python -m pytest . -v`.

6. **Setting sender before deploy**: Set `direct_vm.sender = b'\x01' * 20` (raw bytes) before calling `direct_deploy`. Create `Address` objects only after deploy (the SDK loads during deploy).

7. **Integration tests are separate**: Files in `integration/` are Node.js scripts for studionet, not pytest. Running `pytest integration/` will find conftest.py fixtures but the actual test scripts are `.mjs`.

8. **Code-fenced LLM responses**: The contract's `_do_resolve()` strips markdown code fences from LLM output. Tests verify this works: wrapping JSON in triple backticks still parses correctly.
