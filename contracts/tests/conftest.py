"""Test fixtures for InternetCourt contract tests."""
import json
import pytest


# Sample contract data
SAMPLE_STATEMENT = "Agent B delivered a complete security audit covering OWASP Top 10, authentication bypass vectors, and session management."
SAMPLE_GUIDELINES = "Evaluate whether the delivered report contains three distinct sections covering each area. Each section must include findings with severity ratings."
SAMPLE_EVIDENCE_DEFS = json.dumps({
    "party_a": {"types": ["text"], "max_chars": 10000},
    "party_b": {"types": ["text"], "max_chars": 10000},
})

# Well-known address bytes for parties
ALICE_BYTES = b'\x01' * 20
BOB_BYTES = b'\x02' * 20
CHARLIE_BYTES = b'\x03' * 20


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
def deploy_internetcourt(direct_vm, direct_deploy):
    """Deploy an InternetCourt contract with default params.

    Returns (contract, alice_addr, bob_addr).
    The addresses are proper SDK Address types, created after the SDK is loaded.
    """
    # Set sender first (as bytes - VMContext handles bytes ok)
    direct_vm.sender = ALICE_BYTES

    contract = direct_deploy(
        "contracts/InternetCourt.py",
        BOB_BYTES,
        SAMPLE_STATEMENT,
        SAMPLE_GUIDELINES,
        SAMPLE_EVIDENCE_DEFS,
    )

    # Patch prompt_non_comparative for direct test mode (ExecPromptTemplate
    # is not supported by the WASI mock). Must happen after direct_deploy
    # loads the SDK.
    _patch_prompt_non_comparative()

    # Now genlayer is loaded, get proper Address objects for pranking
    from genlayer import Address
    alice = Address(ALICE_BYTES)
    bob = Address(BOB_BYTES)

    return contract, alice, bob


@pytest.fixture
def active_contract(deploy_internetcourt, direct_vm):
    """Deploy and activate a contract. Returns (contract, alice, bob)."""
    contract, alice, bob = deploy_internetcourt

    with direct_vm.prank(bob):
        contract.accept_contract()

    return contract, alice, bob


@pytest.fixture
def disputed_contract(active_contract, direct_vm):
    """Deploy, activate, and dispute a contract. Returns (contract, alice, bob)."""
    contract, alice, bob = active_contract

    with direct_vm.prank(alice):
        contract.initiate_dispute()

    return contract, alice, bob
