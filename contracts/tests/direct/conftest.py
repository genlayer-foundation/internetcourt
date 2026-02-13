"""Fixtures for direct-mode InternetCourt contract tests."""
import json
import pytest

from gltest.direct.pytest_plugin import (
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
)

# ---------------------------------------------------------------------------
# Test constants
# ---------------------------------------------------------------------------

STATEMENT = (
    "Agent B delivered a complete security audit covering OWASP Top 10, "
    "authentication bypass vectors, and session management."
)
GUIDELINES = (
    "Evaluate whether the delivered report contains three distinct sections "
    "covering each area. Each section must include findings with severity ratings."
)
EVIDENCE_DEFS = json.dumps(
    {
        "party_a": {"types": ["text"], "max_chars": 10000},
        "party_b": {"types": ["text"], "max_chars": 10000},
    }
)
DEADLINE_SECONDS = 3600  # 1 hour default deadline for tests that need one

ALICE_BYTES = b"\x01" * 20
BOB_BYTES = b"\x02" * 20
CHARLIE_BYTES = b"\x03" * 20


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _patch_prompt_non_comparative():
    """Patch prompt_non_comparative to use strict_eq in direct test mode.

    prompt_non_comparative uses ExecPromptTemplate gl_calls internally,
    which the direct test WASI mock doesn't handle. Since tests mock LLM
    responses to return identical results anyway, strict_eq gives the same
    behavior.
    """
    import genlayer.gl.eq_principle as eq_mod
    import genlayer.gl.vm as vm_mod
    from genlayer.gl._internal import _lazy_api
    from genlayer.py.types import Lazy
    import typing

    @_lazy_api
    def patched(
        fn: typing.Callable[[], str], *, task: str, criteria: str
    ) -> Lazy[str]:
        def validator_fn(leaders_res: vm_mod.Result) -> bool:
            my_res = vm_mod.spawn_sandbox(fn)
            return my_res == leaders_res

        return vm_mod.run_nondet_unsafe.lazy(fn, validator_fn)

    eq_mod.prompt_non_comparative = patched
    import genlayer.gl as gl_mod
    gl_mod.eq_principle.prompt_non_comparative = patched


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def court_contract(direct_vm, direct_deploy):
    """Deploy an InternetCourt contract.

    Alice (party A) deploys, Bob is party B.
    Returns (contract, alice_address, bob_address).
    """
    direct_vm.sender = ALICE_BYTES

    contract = direct_deploy(
        "contracts/InternetCourt.py",
        BOB_BYTES,
        STATEMENT,
        GUIDELINES,
        EVIDENCE_DEFS,
    )

    _patch_prompt_non_comparative()

    from genlayer import Address

    alice = Address(ALICE_BYTES)
    bob = Address(BOB_BYTES)

    return contract, alice, bob


@pytest.fixture
def accepted_contract(court_contract, direct_vm):
    """Deploy and accept a contract (status: active).

    Returns (contract, alice, bob).
    """
    contract, alice, bob = court_contract

    with direct_vm.prank(bob):
        contract.accept_contract()

    return contract, alice, bob


@pytest.fixture
def disputed_contract(accepted_contract, direct_vm):
    """Deploy, accept, propose conflicting outcomes, and initiate dispute.

    Both parties propose different outcomes (disagreement) then alice
    initiates a dispute, moving the contract to 'disputed' status.
    Returns (contract, alice, bob).
    """
    contract, alice, bob = accepted_contract

    # Both propose different outcomes (disagreement)
    with direct_vm.prank(alice):
        contract.propose_outcome("TRUE")
    with direct_vm.prank(bob):
        contract.propose_outcome("FALSE")

    # Alice initiates dispute
    with direct_vm.prank(alice):
        contract.initiate_dispute()

    return contract, alice, bob
