"""Tests for InternetCourt contract creation, acceptance, and view methods."""
import json
import pytest

from .conftest import (
    STATEMENT,
    GUIDELINES,
    EVIDENCE_DEFS,
    ALICE_BYTES,
    BOB_BYTES,
    CHARLIE_BYTES,
)


# ---------------------------------------------------------------------------
# Constructor / Deploy
# ---------------------------------------------------------------------------


class TestDeploy:
    def test_deploy_sets_status_created(self, court_contract):
        contract, alice, bob = court_contract
        state = json.loads(contract.get_status())
        assert state["status"] == "created"

    def test_deploy_sets_parties(self, court_contract):
        contract, alice, bob = court_contract
        state = json.loads(contract.get_status())
        assert state["party_a"] == alice.as_hex
        assert state["party_b"] == bob.as_hex

    def test_deploy_stores_statement(self, court_contract):
        contract, alice, bob = court_contract
        state = json.loads(contract.get_status())
        assert state["statement"] == STATEMENT

    def test_deploy_stores_guidelines(self, court_contract):
        contract, alice, bob = court_contract
        details = json.loads(contract.get_contract_details())
        assert details["guidelines"] == GUIDELINES

    def test_deploy_stores_evidence_defs(self, court_contract):
        contract, alice, bob = court_contract
        details = json.loads(contract.get_contract_details())
        assert details["evidence_defs"] == EVIDENCE_DEFS

    def test_deploy_empty_evidence(self, court_contract):
        contract, alice, bob = court_contract
        evidence = json.loads(contract.get_evidence())
        assert evidence["evidence_a"] == ""
        assert evidence["evidence_b"] == ""

    def test_deploy_empty_verdict(self, court_contract):
        contract, alice, bob = court_contract
        state = json.loads(contract.get_status())
        assert state["verdict"] == ""
        assert state["reasoning"] == ""

    def test_deploy_empty_proposed_outcomes(self, court_contract):
        contract, alice, bob = court_contract
        details = json.loads(contract.get_contract_details())
        assert details["proposed_outcome_a"] == ""
        assert details["proposed_outcome_b"] == ""


# ---------------------------------------------------------------------------
# get_status()
# ---------------------------------------------------------------------------


class TestGetStatus:
    def test_get_status_returns_valid_json(self, court_contract):
        contract, alice, bob = court_contract
        raw = contract.get_status()
        data = json.loads(raw)
        assert isinstance(data, dict)

    def test_get_status_fields(self, court_contract):
        contract, alice, bob = court_contract
        data = json.loads(contract.get_status())
        expected_keys = {"status", "statement", "party_a", "party_b", "verdict", "reasoning"}
        assert set(data.keys()) == expected_keys

    def test_get_status_initial_values(self, court_contract):
        contract, alice, bob = court_contract
        data = json.loads(contract.get_status())
        assert data["status"] == "created"
        assert data["statement"] == STATEMENT
        assert data["party_a"] == alice.as_hex
        assert data["party_b"] == bob.as_hex
        assert data["verdict"] == ""
        assert data["reasoning"] == ""


# ---------------------------------------------------------------------------
# accept_contract()
# ---------------------------------------------------------------------------


class TestAcceptContract:
    def test_party_b_can_accept(self, court_contract, direct_vm):
        contract, alice, bob = court_contract
        with direct_vm.prank(bob):
            contract.accept_contract()
        state = json.loads(contract.get_status())
        assert state["status"] == "active"

    def test_party_a_cannot_accept(self, court_contract, direct_vm):
        contract, alice, bob = court_contract
        with direct_vm.prank(alice):
            with direct_vm.expect_revert("Only party B can accept"):
                contract.accept_contract()

    def test_random_address_cannot_accept(self, court_contract, direct_vm, direct_charlie):
        contract, alice, bob = court_contract
        with direct_vm.prank(direct_charlie):
            with direct_vm.expect_revert("Only party B can accept"):
                contract.accept_contract()

    def test_cannot_accept_twice(self, accepted_contract, direct_vm):
        contract, alice, bob = accepted_contract
        with direct_vm.prank(bob):
            with direct_vm.expect_revert("Contract not in created state"):
                contract.accept_contract()


# ---------------------------------------------------------------------------
# View methods on accepted contract
# ---------------------------------------------------------------------------


class TestViewMethodsAfterAccept:
    def test_get_status_after_accept(self, accepted_contract):
        contract, alice, bob = accepted_contract
        data = json.loads(contract.get_status())
        assert data["status"] == "active"

    def test_get_evidence_after_accept(self, accepted_contract):
        contract, alice, bob = accepted_contract
        evidence = json.loads(contract.get_evidence())
        assert evidence["evidence_a"] == ""
        assert evidence["evidence_b"] == ""

    def test_get_contract_details_after_accept(self, accepted_contract):
        contract, alice, bob = accepted_contract
        details = json.loads(contract.get_contract_details())
        assert details["status"] == "active"
        assert details["party_a"] == alice.as_hex
        assert details["party_b"] == bob.as_hex
        assert details["statement"] == STATEMENT
        assert details["guidelines"] == GUIDELINES
        assert details["evidence_defs"] == EVIDENCE_DEFS
        assert details["evidence_a"] == ""
        assert details["evidence_b"] == ""
        assert details["verdict"] == ""
        assert details["reasoning"] == ""
        assert details["proposed_outcome_a"] == ""
        assert details["proposed_outcome_b"] == ""

    def test_get_evidence_deadline_initial(self, court_contract):
        contract, alice, bob = court_contract
        deadline = json.loads(contract.get_evidence_deadline())
        assert deadline["evidence_deadline_seconds"] == 0
        assert deadline["dispute_timestamp"] == ""
        assert deadline["deadline_passed"] is False


# ---------------------------------------------------------------------------
# cancel()
# ---------------------------------------------------------------------------


class TestCancel:
    def test_creator_can_cancel(self, court_contract, direct_vm):
        contract, alice, bob = court_contract
        with direct_vm.prank(alice):
            contract.cancel()
        state = json.loads(contract.get_status())
        assert state["status"] == "cancelled"

    def test_party_b_cannot_cancel(self, court_contract, direct_vm):
        contract, alice, bob = court_contract
        with direct_vm.prank(bob):
            with direct_vm.expect_revert("Only creator can cancel"):
                contract.cancel()

    def test_cannot_cancel_after_accept(self, accepted_contract, direct_vm):
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            with direct_vm.expect_revert("Can only cancel before activation"):
                contract.cancel()
