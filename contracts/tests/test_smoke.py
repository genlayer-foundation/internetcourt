"""Smoke test to verify basic contract flows work in direct mode."""
import json


def test_deploy(deploy_moltcourt):
    """Test basic contract deployment."""
    contract, alice, bob = deploy_moltcourt
    status = json.loads(contract.get_status())
    assert status["status"] == "created"


def test_accept(deploy_moltcourt, direct_vm):
    """Test Party B can accept."""
    contract, alice, bob = deploy_moltcourt
    with direct_vm.prank(bob):
        contract.accept_contract()
    assert contract.status == "active"


def test_mutual_resolve(active_contract, direct_vm):
    """Test mutual agreement resolves without AI."""
    contract, alice, bob = active_contract
    with direct_vm.prank(alice):
        contract.propose_outcome("TRUE")
    with direct_vm.prank(bob):
        contract.propose_outcome("TRUE")
    assert contract.status == "resolved"
    assert contract.verdict == "TRUE"


def test_dispute_and_resolve(active_contract, direct_vm):
    """Test full dispute + AI resolution flow."""
    contract, alice, bob = active_contract

    with direct_vm.prank(alice):
        contract.initiate_dispute()
    assert contract.status == "disputed"

    with direct_vm.prank(alice):
        contract.submit_evidence("The audit only covers code quality, missing security and performance.")
    with direct_vm.prank(bob):
        contract.submit_evidence("The audit covers all three areas as specified.")

    # Mock AI jury response
    direct_vm.mock_llm(
        r".*impartial AI juror.*",
        '{"verdict": "FALSE", "reasoning": "The evidence shows the audit was incomplete."}'
    )

    contract.resolve()
    assert contract.status == "resolved"
    assert contract.verdict == "FALSE"
