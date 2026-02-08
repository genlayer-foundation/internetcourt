"""Test fixtures for MoltCourt contract tests."""
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


@pytest.fixture
def deploy_moltcourt(direct_vm, direct_deploy):
    """Deploy a MoltCourt contract with default params.

    Returns (contract, alice_addr, bob_addr).
    The addresses are proper SDK Address types, created after the SDK is loaded.
    """
    # direct_deploy loads the SDK, which makes genlayer importable
    # We need to call it to trigger SDK setup. But we also need to pass
    # Address objects as arguments. The trick: deploy_contract internally
    # converts bytes to Address when setting up storage.
    # So we let the contract __init__ receive the raw bytes and the storage
    # layer will handle conversion.

    # Set sender first (as bytes - VMContext handles bytes ok)
    direct_vm.sender = ALICE_BYTES

    contract = direct_deploy(
        "contracts/MoltCourt.py",
        BOB_BYTES,
        SAMPLE_STATEMENT,
        SAMPLE_GUIDELINES,
        SAMPLE_EVIDENCE_DEFS,
    )

    # Now genlayer is loaded, get proper Address objects for pranking
    from genlayer import Address
    alice = Address(ALICE_BYTES)
    bob = Address(BOB_BYTES)

    return contract, alice, bob


@pytest.fixture
def active_contract(deploy_moltcourt, direct_vm):
    """Deploy and activate a contract. Returns (contract, alice, bob)."""
    contract, alice, bob = deploy_moltcourt

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
