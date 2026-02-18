"""Smoke test to verify basic contract flows work in direct mode."""
import json


def test_deploy(deploy_internetcourt):
    """Test basic contract deployment."""
    contract, alice, bob = deploy_internetcourt
    status = json.loads(contract.get_status())
    assert status["status"] == "created"


def test_accept(deploy_internetcourt, direct_vm):
    """Test Party B can accept."""
    contract, alice, bob = deploy_internetcourt
    with direct_vm.prank(bob):
        contract.accept_contract()
    assert contract.status == "active"


def test_mutual_resolve(active_contract, direct_vm):
    """Test mutual agreement resolves without AI."""
    contract, alice, bob = active_contract
    with direct_vm.prank(alice):
        contract.propose_outcome("PARTY_A")
    with direct_vm.prank(bob):
        contract.propose_outcome("PARTY_A")
    assert contract.status == "resolved"
    assert contract.verdict == "PARTY_A"


def test_dispute_and_resolve(active_contract, direct_vm):
    """Test full dispute + AI resolution flow."""
    contract, alice, bob = active_contract

    with direct_vm.prank(alice):
        contract.initiate_dispute()
    assert contract.status == "disputed"

    with direct_vm.prank(alice):
        contract.submit_evidence("The audit only covers code quality, missing security and performance.")

    # Mock AI jury response before second submission — auto-resolve triggers
    direct_vm.mock_llm(
        r".*impartial AI juror.*",
        '{"verdict": "PARTY_B", "reasoning": "The evidence shows the audit was incomplete."}'
    )

    with direct_vm.prank(bob):
        contract.submit_evidence("The audit covers all three areas as specified.")
    assert contract.status == "resolved"
    assert contract.verdict == "PARTY_B"
