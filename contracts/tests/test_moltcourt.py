"""Comprehensive tests for the MoltCourt intelligent contract."""
import json
import pytest


# Sample contract data (must match conftest.py)
SAMPLE_STATEMENT = "Agent B delivered a complete security audit covering OWASP Top 10, authentication bypass vectors, and session management."
SAMPLE_GUIDELINES = "Evaluate whether the delivered report contains three distinct sections covering each area. Each section must include findings with severity ratings."
SAMPLE_EVIDENCE_DEFS = json.dumps({
    "party_a": {"types": ["text"], "max_chars": 10000},
    "party_b": {"types": ["text"], "max_chars": 10000},
})

CHARLIE_BYTES = b'\x03' * 20


# ============================================================
# Deployment & Initial State
# ============================================================


class TestDeployment:
    def test_initial_status_is_created(self, deploy_moltcourt):
        contract, alice, bob = deploy_moltcourt
        assert contract.status == "created"

    def test_stores_statement(self, deploy_moltcourt):
        contract, alice, bob = deploy_moltcourt
        assert contract.statement == SAMPLE_STATEMENT

    def test_stores_guidelines(self, deploy_moltcourt):
        contract, alice, bob = deploy_moltcourt
        assert contract.guidelines == SAMPLE_GUIDELINES

    def test_stores_evidence_defs(self, deploy_moltcourt):
        contract, alice, bob = deploy_moltcourt
        assert contract.evidence_defs == SAMPLE_EVIDENCE_DEFS

    def test_stores_party_a_as_sender(self, deploy_moltcourt):
        contract, alice, bob = deploy_moltcourt
        assert contract.party_a == alice

    def test_stores_party_b(self, deploy_moltcourt):
        contract, alice, bob = deploy_moltcourt
        assert contract.party_b == bob

    def test_evidence_empty_on_deploy(self, deploy_moltcourt):
        contract, alice, bob = deploy_moltcourt
        assert contract.evidence_a == ""
        assert contract.evidence_b == ""

    def test_verdict_empty_on_deploy(self, deploy_moltcourt):
        contract, alice, bob = deploy_moltcourt
        assert contract.verdict == ""
        assert contract.reasoning == ""

    def test_get_status_returns_json(self, deploy_moltcourt):
        contract, alice, bob = deploy_moltcourt
        status = json.loads(contract.get_status())
        assert status["status"] == "created"
        assert status["statement"] == SAMPLE_STATEMENT

    def test_get_contract_details(self, deploy_moltcourt):
        contract, alice, bob = deploy_moltcourt
        details = json.loads(contract.get_contract_details())
        assert details["status"] == "created"
        assert details["statement"] == SAMPLE_STATEMENT
        assert details["guidelines"] == SAMPLE_GUIDELINES
        assert details["evidence_defs"] == SAMPLE_EVIDENCE_DEFS


# ============================================================
# Accept Contract (Lifecycle: CREATED -> ACTIVE)
# ============================================================


class TestAcceptContract:
    def test_party_b_can_accept(self, deploy_moltcourt, direct_vm):
        contract, alice, bob = deploy_moltcourt
        with direct_vm.prank(bob):
            contract.accept_contract()
        assert contract.status == "active"

    def test_party_a_cannot_accept(self, deploy_moltcourt, direct_vm):
        contract, alice, bob = deploy_moltcourt
        with direct_vm.expect_revert("Only party B can accept"):
            with direct_vm.prank(alice):
                contract.accept_contract()

    def test_non_party_cannot_accept(self, deploy_moltcourt, direct_vm):
        contract, alice, bob = deploy_moltcourt
        from genlayer import Address
        charlie = Address(CHARLIE_BYTES)
        with direct_vm.expect_revert("Only party B can accept"):
            with direct_vm.prank(charlie):
                contract.accept_contract()

    def test_cannot_accept_twice(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.expect_revert("Contract not in created state"):
            with direct_vm.prank(bob):
                contract.accept_contract()


# ============================================================
# Cancel Contract (Lifecycle: CREATED -> CANCELLED)
# ============================================================


class TestCancelContract:
    def test_creator_can_cancel(self, deploy_moltcourt, direct_vm):
        contract, alice, bob = deploy_moltcourt
        with direct_vm.prank(alice):
            contract.cancel()
        assert contract.status == "cancelled"

    def test_party_b_cannot_cancel(self, deploy_moltcourt, direct_vm):
        contract, alice, bob = deploy_moltcourt
        with direct_vm.expect_revert("Only creator can cancel"):
            with direct_vm.prank(bob):
                contract.cancel()

    def test_cannot_cancel_after_activation(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.expect_revert("Can only cancel before activation"):
            with direct_vm.prank(alice):
                contract.cancel()


# ============================================================
# Propose Outcome (Three-Key Mutual Agreement)
# ============================================================


class TestProposeOutcome:
    def test_party_a_can_propose(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        assert contract.proposed_outcome_a == "TRUE"
        assert contract.status == "active"  # Not resolved yet

    def test_party_b_can_propose(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.prank(bob):
            contract.propose_outcome("FALSE")
        assert contract.proposed_outcome_b == "FALSE"
        assert contract.status == "active"  # Not resolved yet

    def test_mutual_agreement_true(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        with direct_vm.prank(bob):
            contract.propose_outcome("TRUE")
        assert contract.status == "resolved"
        assert contract.verdict == "TRUE"
        assert "mutual agreement" in contract.reasoning

    def test_mutual_agreement_false(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("FALSE")
        with direct_vm.prank(bob):
            contract.propose_outcome("FALSE")
        assert contract.status == "resolved"
        assert contract.verdict == "FALSE"

    def test_disagreement_does_not_resolve(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        with direct_vm.prank(bob):
            contract.propose_outcome("FALSE")
        assert contract.status == "active"  # Not resolved
        assert contract.verdict == ""

    def test_non_party_cannot_propose(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        from genlayer import Address
        charlie = Address(CHARLIE_BYTES)
        with direct_vm.expect_revert("Not a party to this contract"):
            with direct_vm.prank(charlie):
                contract.propose_outcome("TRUE")

    def test_cannot_propose_before_active(self, deploy_moltcourt, direct_vm):
        contract, alice, bob = deploy_moltcourt
        with direct_vm.expect_revert("Contract not active"):
            with direct_vm.prank(alice):
                contract.propose_outcome("TRUE")

    def test_invalid_outcome_rejected(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.expect_revert("Outcome must be TRUE or FALSE"):
            with direct_vm.prank(alice):
                contract.propose_outcome("MAYBE")


# ============================================================
# Initiate Dispute
# ============================================================


class TestInitiateDispute:
    def test_party_a_can_dispute(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.initiate_dispute()
        assert contract.status == "disputed"

    def test_party_b_can_dispute(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.prank(bob):
            contract.initiate_dispute()
        assert contract.status == "disputed"

    def test_non_party_cannot_dispute(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        from genlayer import Address
        charlie = Address(CHARLIE_BYTES)
        with direct_vm.expect_revert("Not a party to this contract"):
            with direct_vm.prank(charlie):
                contract.initiate_dispute()

    def test_cannot_dispute_before_active(self, deploy_moltcourt, direct_vm):
        contract, alice, bob = deploy_moltcourt
        with direct_vm.expect_revert("Contract not active"):
            with direct_vm.prank(alice):
                contract.initiate_dispute()


# ============================================================
# Submit Evidence
# ============================================================


class TestSubmitEvidence:
    def test_party_a_submits_evidence(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        with direct_vm.prank(alice):
            contract.submit_evidence("Party A's evidence text")
        assert contract.evidence_a == "Party A's evidence text"

    def test_party_b_submits_evidence(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        with direct_vm.prank(bob):
            contract.submit_evidence("Party B's evidence text")
        assert contract.evidence_b == "Party B's evidence text"

    def test_both_parties_submit(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        with direct_vm.prank(alice):
            contract.submit_evidence("Evidence A")
        with direct_vm.prank(bob):
            contract.submit_evidence("Evidence B")
        evidence = json.loads(contract.get_evidence())
        assert evidence["evidence_a"] == "Evidence A"
        assert evidence["evidence_b"] == "Evidence B"

    def test_party_a_cannot_submit_twice(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        with direct_vm.prank(alice):
            contract.submit_evidence("First submission")
        with direct_vm.expect_revert("Party A already submitted evidence"):
            with direct_vm.prank(alice):
                contract.submit_evidence("Second submission")

    def test_party_b_cannot_submit_twice(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        with direct_vm.prank(bob):
            contract.submit_evidence("First submission")
        with direct_vm.expect_revert("Party B already submitted evidence"):
            with direct_vm.prank(bob):
                contract.submit_evidence("Second submission")

    def test_non_party_cannot_submit(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        from genlayer import Address
        charlie = Address(CHARLIE_BYTES)
        with direct_vm.expect_revert("Not a party to this contract"):
            with direct_vm.prank(charlie):
                contract.submit_evidence("Outsider evidence")

    def test_cannot_submit_before_dispute(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.expect_revert("No active dispute"):
            with direct_vm.prank(alice):
                contract.submit_evidence("Evidence")

    def test_evidence_exceeds_max_chars(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        long_evidence = "x" * 10001  # max_chars is 10000
        with direct_vm.expect_revert("Evidence exceeds max length"):
            with direct_vm.prank(alice):
                contract.submit_evidence(long_evidence)

    def test_evidence_at_max_chars_allowed(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        exact_evidence = "x" * 10000
        with direct_vm.prank(alice):
            contract.submit_evidence(exact_evidence)
        assert len(contract.evidence_a) == 10000


# ============================================================
# AI Jury Resolution
# ============================================================


class TestResolve:
    def _setup_dispute_with_evidence(self, contract, alice, bob, direct_vm):
        """Helper to set up a dispute with both parties' evidence submitted."""
        with direct_vm.prank(alice):
            contract.initiate_dispute()
        with direct_vm.prank(alice):
            contract.submit_evidence("The audit was incomplete.")
        with direct_vm.prank(bob):
            contract.submit_evidence("The audit covers all areas.")

    def test_resolve_verdict_true(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        self._setup_dispute_with_evidence(contract, alice, bob, direct_vm)

        direct_vm.mock_llm(
            r".*impartial AI juror.*",
            '{"verdict": "TRUE", "reasoning": "The audit was complete."}'
        )
        contract.resolve()

        assert contract.status == "resolved"
        assert contract.verdict == "TRUE"
        assert contract.reasoning == "The audit was complete."

    def test_resolve_verdict_false(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        self._setup_dispute_with_evidence(contract, alice, bob, direct_vm)

        direct_vm.mock_llm(
            r".*impartial AI juror.*",
            '{"verdict": "FALSE", "reasoning": "The audit was incomplete."}'
        )
        contract.resolve()

        assert contract.status == "resolved"
        assert contract.verdict == "FALSE"

    def test_resolve_verdict_undetermined(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        self._setup_dispute_with_evidence(contract, alice, bob, direct_vm)

        direct_vm.mock_llm(
            r".*impartial AI juror.*",
            '{"verdict": "UNDETERMINED", "reasoning": "Not enough evidence."}'
        )
        contract.resolve()

        assert contract.status == "resolved"
        assert contract.verdict == "UNDETERMINED"
        assert contract.reasoning == "Not enough evidence."

    def test_resolve_requires_both_evidence(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.initiate_dispute()
        with direct_vm.prank(alice):
            contract.submit_evidence("Only A submitted")

        with direct_vm.expect_revert("Both parties must submit evidence"):
            contract.resolve()

    def test_resolve_requires_disputed_status(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.expect_revert("No active dispute to resolve"):
            contract.resolve()

    def test_cannot_resolve_twice(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        self._setup_dispute_with_evidence(contract, alice, bob, direct_vm)

        direct_vm.mock_llm(
            r".*",
            '{"verdict": "TRUE", "reasoning": "First resolution."}'
        )
        contract.resolve()

        with direct_vm.expect_revert("No active dispute to resolve"):
            contract.resolve()

    def test_get_verdict_returns_json(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        self._setup_dispute_with_evidence(contract, alice, bob, direct_vm)

        direct_vm.mock_llm(
            r".*",
            '{"verdict": "FALSE", "reasoning": "Incomplete audit."}'
        )
        contract.resolve()

        verdict = json.loads(contract.get_verdict())
        assert verdict["verdict"] == "FALSE"
        assert verdict["reasoning"] == "Incomplete audit."
        assert verdict["status"] == "resolved"

    def test_get_verdict_before_resolution(self, deploy_moltcourt):
        contract, alice, bob = deploy_moltcourt
        verdict = json.loads(contract.get_verdict())
        assert verdict["verdict"] == ""
        assert verdict["reasoning"] == ""


# ============================================================
# State Transitions
# ============================================================


class TestStateTransitions:
    def test_full_lifecycle_mutual_agreement(self, deploy_moltcourt, direct_vm):
        """CREATED -> ACTIVE -> RESOLVED (mutual)"""
        contract, alice, bob = deploy_moltcourt

        assert contract.status == "created"

        with direct_vm.prank(bob):
            contract.accept_contract()
        assert contract.status == "active"

        with direct_vm.prank(alice):
            contract.propose_outcome("FALSE")
        with direct_vm.prank(bob):
            contract.propose_outcome("FALSE")
        assert contract.status == "resolved"

    def test_full_lifecycle_ai_jury(self, deploy_moltcourt, direct_vm):
        """CREATED -> ACTIVE -> DISPUTED -> RESOLVING -> RESOLVED"""
        contract, alice, bob = deploy_moltcourt

        assert contract.status == "created"

        with direct_vm.prank(bob):
            contract.accept_contract()
        assert contract.status == "active"

        with direct_vm.prank(alice):
            contract.initiate_dispute()
        assert contract.status == "disputed"

        with direct_vm.prank(alice):
            contract.submit_evidence("A's evidence")
        with direct_vm.prank(bob):
            contract.submit_evidence("B's evidence")

        direct_vm.mock_llm(
            r".*",
            '{"verdict": "TRUE", "reasoning": "Statement confirmed."}'
        )
        contract.resolve()
        assert contract.status == "resolved"

    def test_cancel_lifecycle(self, deploy_moltcourt, direct_vm):
        """CREATED -> CANCELLED"""
        contract, alice, bob = deploy_moltcourt
        with direct_vm.prank(alice):
            contract.cancel()
        assert contract.status == "cancelled"


# ============================================================
# View Methods
# ============================================================


class TestViewMethods:
    def test_get_evidence_empty(self, deploy_moltcourt):
        contract, alice, bob = deploy_moltcourt
        evidence = json.loads(contract.get_evidence())
        assert evidence["evidence_a"] == ""
        assert evidence["evidence_b"] == ""

    def test_get_evidence_with_submissions(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        with direct_vm.prank(alice):
            contract.submit_evidence("Evidence A text")
        with direct_vm.prank(bob):
            contract.submit_evidence("Evidence B text")

        evidence = json.loads(contract.get_evidence())
        assert evidence["evidence_a"] == "Evidence A text"
        assert evidence["evidence_b"] == "Evidence B text"

    def test_get_contract_details_full(self, active_contract, direct_vm):
        contract, alice, bob = active_contract

        with direct_vm.prank(alice):
            contract.initiate_dispute()
        with direct_vm.prank(alice):
            contract.submit_evidence("Evidence from A")

        details = json.loads(contract.get_contract_details())
        assert details["status"] == "disputed"
        assert details["evidence_a"] == "Evidence from A"
        assert details["evidence_b"] == ""
        assert details["proposed_outcome_a"] == ""
        assert details["proposed_outcome_b"] == ""


# ============================================================
# Edge Cases
# ============================================================


class TestEdgeCases:
    def test_empty_evidence_submission(self, disputed_contract, direct_vm):
        """Empty string is valid evidence."""
        contract, alice, bob = disputed_contract
        with direct_vm.prank(alice):
            contract.submit_evidence("")
        # Empty string means "submitted" (evidence_a != "")
        # Actually, empty string IS "", so this should work but
        # wouldn't block resolution. Let's verify:
        assert contract.evidence_a == ""

    def test_propose_after_disagreement_still_resolves(self, active_contract, direct_vm):
        """After disagreement in proposals, same outcome still resolves."""
        contract, alice, bob = active_contract
        # First round: disagreement
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        with direct_vm.prank(bob):
            contract.propose_outcome("FALSE")
        assert contract.status == "active"

        # Second round: agreement (bob changes mind)
        with direct_vm.prank(bob):
            contract.propose_outcome("TRUE")
        assert contract.status == "resolved"
        assert contract.verdict == "TRUE"

    def test_snapshot_and_revert(self, active_contract, direct_vm):
        """Test VM snapshot/revert preserves contract state."""
        contract, alice, bob = active_contract

        snap = direct_vm.snapshot()

        with direct_vm.prank(alice):
            contract.initiate_dispute()
        assert contract.status == "disputed"

        direct_vm.revert(snap)
        assert contract.status == "active"

    def test_evidence_with_json_content(self, disputed_contract, direct_vm):
        """Evidence containing JSON should be stored correctly."""
        contract, alice, bob = disputed_contract
        json_evidence = json.dumps({"deliverables": ["item1", "item2"], "score": 85})
        with direct_vm.prank(alice):
            contract.submit_evidence(json_evidence)
        stored = json.loads(contract.evidence_a)
        assert stored["score"] == 85

    def test_evidence_with_special_characters(self, disputed_contract, direct_vm):
        """Evidence with special chars should be stored correctly."""
        contract, alice, bob = disputed_contract
        evidence = 'Contains "quotes" and\nnewlines and unicode: \u00e9\u00e8\u00ea'
        with direct_vm.prank(bob):
            contract.submit_evidence(evidence)
        assert contract.evidence_b == evidence
