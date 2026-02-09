"""Comprehensive tests for the MoltCourt intelligent contract."""
import json
import pytest


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


# ============================================================
# Invalid State Transition Tests
# ============================================================


class TestInvalidStateTransitions:
    """Test that methods revert when called in wrong states."""

    def test_cannot_cancel_after_dispute(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        with direct_vm.expect_revert("Can only cancel before activation"):
            with direct_vm.prank(alice):
                contract.cancel()

    def test_cannot_cancel_after_resolution(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        with direct_vm.prank(bob):
            contract.propose_outcome("TRUE")
        assert contract.status == "resolved"
        with direct_vm.expect_revert("Can only cancel before activation"):
            with direct_vm.prank(alice):
                contract.cancel()

    def test_cannot_accept_cancelled_contract(self, deploy_moltcourt, direct_vm):
        contract, alice, bob = deploy_moltcourt
        with direct_vm.prank(alice):
            contract.cancel()
        with direct_vm.expect_revert("Contract not in created state"):
            with direct_vm.prank(bob):
                contract.accept_contract()

    def test_cannot_accept_disputed_contract(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        with direct_vm.expect_revert("Contract not in created state"):
            with direct_vm.prank(bob):
                contract.accept_contract()

    def test_cannot_propose_on_cancelled_contract(self, deploy_moltcourt, direct_vm):
        contract, alice, bob = deploy_moltcourt
        with direct_vm.prank(alice):
            contract.cancel()
        with direct_vm.expect_revert("Contract not active"):
            with direct_vm.prank(alice):
                contract.propose_outcome("TRUE")

    def test_cannot_propose_on_disputed_contract(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        with direct_vm.expect_revert("Contract not active"):
            with direct_vm.prank(alice):
                contract.propose_outcome("TRUE")

    def test_cannot_propose_on_resolved_contract(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("FALSE")
        with direct_vm.prank(bob):
            contract.propose_outcome("FALSE")
        assert contract.status == "resolved"
        with direct_vm.expect_revert("Contract not active"):
            with direct_vm.prank(alice):
                contract.propose_outcome("TRUE")

    def test_cannot_dispute_cancelled_contract(self, deploy_moltcourt, direct_vm):
        contract, alice, bob = deploy_moltcourt
        with direct_vm.prank(alice):
            contract.cancel()
        with direct_vm.expect_revert("Contract not active"):
            with direct_vm.prank(alice):
                contract.initiate_dispute()

    def test_cannot_dispute_resolved_contract(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        with direct_vm.prank(bob):
            contract.propose_outcome("TRUE")
        with direct_vm.expect_revert("Contract not active"):
            with direct_vm.prank(alice):
                contract.initiate_dispute()

    def test_cannot_dispute_already_disputed_contract(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        with direct_vm.expect_revert("Contract not active"):
            with direct_vm.prank(alice):
                contract.initiate_dispute()

    def test_cannot_submit_evidence_on_created(self, deploy_moltcourt, direct_vm):
        contract, alice, bob = deploy_moltcourt
        with direct_vm.expect_revert("No active dispute"):
            with direct_vm.prank(alice):
                contract.submit_evidence("Evidence")

    def test_cannot_submit_evidence_on_cancelled(self, deploy_moltcourt, direct_vm):
        contract, alice, bob = deploy_moltcourt
        with direct_vm.prank(alice):
            contract.cancel()
        with direct_vm.expect_revert("No active dispute"):
            with direct_vm.prank(alice):
                contract.submit_evidence("Evidence")

    def test_cannot_submit_evidence_on_resolved(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        with direct_vm.prank(bob):
            contract.propose_outcome("TRUE")
        with direct_vm.expect_revert("No active dispute"):
            with direct_vm.prank(alice):
                contract.submit_evidence("Evidence")

    def test_cannot_resolve_created_contract(self, deploy_moltcourt, direct_vm):
        contract, alice, bob = deploy_moltcourt
        with direct_vm.expect_revert("No active dispute to resolve"):
            contract.resolve()

    def test_cannot_resolve_cancelled_contract(self, deploy_moltcourt, direct_vm):
        contract, alice, bob = deploy_moltcourt
        with direct_vm.prank(alice):
            contract.cancel()
        with direct_vm.expect_revert("No active dispute to resolve"):
            contract.resolve()


# ============================================================
# Propose Outcome Edge Cases
# ============================================================


class TestProposeOutcomeEdgeCases:
    def test_invalid_outcome_undetermined(self, active_contract, direct_vm):
        """UNDETERMINED is not a valid proposal value."""
        contract, alice, bob = active_contract
        with direct_vm.expect_revert("Outcome must be TRUE or FALSE"):
            with direct_vm.prank(alice):
                contract.propose_outcome("UNDETERMINED")

    def test_invalid_outcome_empty_string(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.expect_revert("Outcome must be TRUE or FALSE"):
            with direct_vm.prank(alice):
                contract.propose_outcome("")

    def test_invalid_outcome_lowercase(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.expect_revert("Outcome must be TRUE or FALSE"):
            with direct_vm.prank(alice):
                contract.propose_outcome("true")

    def test_party_a_can_change_proposal(self, active_contract, direct_vm):
        """Party A can update their proposal before resolution."""
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        assert contract.proposed_outcome_a == "TRUE"
        with direct_vm.prank(alice):
            contract.propose_outcome("FALSE")
        assert contract.proposed_outcome_a == "FALSE"

    def test_party_b_can_change_proposal(self, active_contract, direct_vm):
        """Party B can update their proposal before resolution."""
        contract, alice, bob = active_contract
        with direct_vm.prank(bob):
            contract.propose_outcome("FALSE")
        assert contract.proposed_outcome_b == "FALSE"
        with direct_vm.prank(bob):
            contract.propose_outcome("TRUE")
        assert contract.proposed_outcome_b == "TRUE"

    def test_change_proposal_to_match_resolves(self, active_contract, direct_vm):
        """Changing proposal to match the other party resolves."""
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        with direct_vm.prank(bob):
            contract.propose_outcome("FALSE")
        assert contract.status == "active"
        # Alice changes to match Bob
        with direct_vm.prank(alice):
            contract.propose_outcome("FALSE")
        assert contract.status == "resolved"
        assert contract.verdict == "FALSE"

    def test_b_proposes_first_then_a_matches(self, active_contract, direct_vm):
        """Order doesn't matter - B proposes first, A matches."""
        contract, alice, bob = active_contract
        with direct_vm.prank(bob):
            contract.propose_outcome("TRUE")
        assert contract.status == "active"
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        assert contract.status == "resolved"
        assert contract.verdict == "TRUE"


# ============================================================
# Evidence Validation Edge Cases
# ============================================================


class TestEvidenceValidation:
    def test_party_b_evidence_exceeds_max_chars(self, disputed_contract, direct_vm):
        """Party B also has max_chars validation."""
        contract, alice, bob = disputed_contract
        long_evidence = "y" * 10001
        with direct_vm.expect_revert("Evidence exceeds max length"):
            with direct_vm.prank(bob):
                contract.submit_evidence(long_evidence)

    def test_party_b_evidence_at_max_allowed(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        exact_evidence = "y" * 10000
        with direct_vm.prank(bob):
            contract.submit_evidence(exact_evidence)
        assert len(contract.evidence_b) == 10000

    def test_evidence_one_char(self, disputed_contract, direct_vm):
        """Single character evidence is valid."""
        contract, alice, bob = disputed_contract
        with direct_vm.prank(alice):
            contract.submit_evidence("X")
        assert contract.evidence_a == "X"

    def test_evidence_with_default_max_chars(self, direct_vm, direct_deploy):
        """When evidence_defs don't specify max_chars, default 50000 applies."""
        direct_vm.sender = b'\x01' * 20
        evidence_defs = json.dumps({
            "party_a": {"types": ["text"]},
            "party_b": {"types": ["text"]},
        })
        contract = direct_deploy(
            "contracts/MoltCourt.py",
            b'\x02' * 20,
            "Test statement",
            "Test guidelines",
            evidence_defs,
        )
        from genlayer import Address
        alice = Address(b'\x01' * 20)
        bob = Address(b'\x02' * 20)

        with direct_vm.prank(bob):
            contract.accept_contract()
        with direct_vm.prank(alice):
            contract.initiate_dispute()

        long_evidence = "z" * 50000
        with direct_vm.prank(alice):
            contract.submit_evidence(long_evidence)
        assert len(contract.evidence_a) == 50000

    def test_evidence_exceeds_default_max_chars(self, direct_vm, direct_deploy):
        """Evidence exceeding 50000 default max is rejected."""
        direct_vm.sender = b'\x01' * 20
        evidence_defs = json.dumps({
            "party_a": {"types": ["text"]},
            "party_b": {"types": ["text"]},
        })
        contract = direct_deploy(
            "contracts/MoltCourt.py",
            b'\x02' * 20,
            "Test statement",
            "Test guidelines",
            evidence_defs,
        )
        from genlayer import Address
        alice = Address(b'\x01' * 20)
        bob = Address(b'\x02' * 20)

        with direct_vm.prank(bob):
            contract.accept_contract()
        with direct_vm.prank(alice):
            contract.initiate_dispute()

        too_long = "z" * 50001
        with direct_vm.expect_revert("Evidence exceeds max length"):
            with direct_vm.prank(alice):
                contract.submit_evidence(too_long)

    def test_evidence_with_unicode(self, disputed_contract, direct_vm):
        """Unicode evidence stored correctly."""
        contract, alice, bob = disputed_contract
        evidence = "Test with unicode: \u65e5\u672c\u8a9e \u03b1\u03b2\u03b3"
        with direct_vm.prank(alice):
            contract.submit_evidence(evidence)
        assert contract.evidence_a == evidence


# ============================================================
# View Methods Across States
# ============================================================


class TestViewMethodsAcrossStates:
    def test_get_status_active(self, active_contract):
        contract, alice, bob = active_contract
        status = json.loads(contract.get_status())
        assert status["status"] == "active"
        assert status["verdict"] == ""

    def test_get_status_disputed(self, disputed_contract):
        contract, alice, bob = disputed_contract
        status = json.loads(contract.get_status())
        assert status["status"] == "disputed"

    def test_get_status_cancelled(self, deploy_moltcourt, direct_vm):
        contract, alice, bob = deploy_moltcourt
        with direct_vm.prank(alice):
            contract.cancel()
        status = json.loads(contract.get_status())
        assert status["status"] == "cancelled"
        assert status["verdict"] == ""

    def test_get_status_resolved_mutual(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        with direct_vm.prank(bob):
            contract.propose_outcome("TRUE")
        status = json.loads(contract.get_status())
        assert status["status"] == "resolved"
        assert status["verdict"] == "TRUE"
        assert "mutual agreement" in status["reasoning"]

    def test_get_verdict_on_active_contract(self, active_contract):
        contract, alice, bob = active_contract
        verdict = json.loads(contract.get_verdict())
        assert verdict["verdict"] == ""
        assert verdict["status"] == "active"

    def test_get_evidence_on_created(self, deploy_moltcourt):
        contract, alice, bob = deploy_moltcourt
        evidence = json.loads(contract.get_evidence())
        assert evidence["evidence_a"] == ""
        assert evidence["evidence_b"] == ""

    def test_get_evidence_partial_submission(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        with direct_vm.prank(alice):
            contract.submit_evidence("Only A submitted")
        evidence = json.loads(contract.get_evidence())
        assert evidence["evidence_a"] == "Only A submitted"
        assert evidence["evidence_b"] == ""

    def test_get_contract_details_after_proposals(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        details = json.loads(contract.get_contract_details())
        assert details["proposed_outcome_a"] == "TRUE"
        assert details["proposed_outcome_b"] == ""

    def test_get_contract_details_after_resolution(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.initiate_dispute()
        with direct_vm.prank(alice):
            contract.submit_evidence("Evidence A")
        with direct_vm.prank(bob):
            contract.submit_evidence("Evidence B")
        direct_vm.mock_llm(
            r".*",
            '{"verdict": "TRUE", "reasoning": "Evidence supports the claim."}'
        )
        contract.resolve()
        details = json.loads(contract.get_contract_details())
        assert details["status"] == "resolved"
        assert details["verdict"] == "TRUE"
        assert details["reasoning"] == "Evidence supports the claim."
        assert details["evidence_a"] == "Evidence A"
        assert details["evidence_b"] == "Evidence B"

    def test_get_status_party_addresses(self, deploy_moltcourt):
        """Verify party addresses are hex strings in status."""
        contract, alice, bob = deploy_moltcourt
        status = json.loads(contract.get_status())
        assert status["party_a"] == alice.as_hex
        assert status["party_b"] == bob.as_hex

    def test_get_evidence_after_ai_resolution(self, active_contract, direct_vm):
        """Evidence is preserved after resolution."""
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.initiate_dispute()
        with direct_vm.prank(alice):
            contract.submit_evidence("A evidence preserved")
        with direct_vm.prank(bob):
            contract.submit_evidence("B evidence preserved")
        direct_vm.mock_llm(
            r".*",
            '{"verdict": "FALSE", "reasoning": "Test."}'
        )
        contract.resolve()
        evidence = json.loads(contract.get_evidence())
        assert evidence["evidence_a"] == "A evidence preserved"
        assert evidence["evidence_b"] == "B evidence preserved"


# ============================================================
# AI Resolution Edge Cases
# ============================================================


class TestResolveEdgeCases:
    def _setup_full_dispute(self, contract, alice, bob, direct_vm):
        """Helper: initiate dispute and submit both evidences."""
        with direct_vm.prank(alice):
            contract.initiate_dispute()
        with direct_vm.prank(alice):
            contract.submit_evidence("A's evidence")
        with direct_vm.prank(bob):
            contract.submit_evidence("B's evidence")

    def test_resolve_requires_evidence_b(self, active_contract, direct_vm):
        """Cannot resolve with only party A's evidence."""
        contract, alice, bob = active_contract
        with direct_vm.prank(bob):
            contract.initiate_dispute()
        with direct_vm.prank(alice):
            contract.submit_evidence("Only A")
        with direct_vm.expect_revert("Both parties must submit evidence"):
            contract.resolve()

    def test_resolve_requires_evidence_a(self, active_contract, direct_vm):
        """Cannot resolve with only party B's evidence."""
        contract, alice, bob = active_contract
        with direct_vm.prank(alice):
            contract.initiate_dispute()
        with direct_vm.prank(bob):
            contract.submit_evidence("Only B")
        with direct_vm.expect_revert("Both parties must submit evidence"):
            contract.resolve()

    def test_resolve_sets_status_to_resolved(self, active_contract, direct_vm):
        contract, alice, bob = active_contract
        self._setup_full_dispute(contract, alice, bob, direct_vm)
        direct_vm.mock_llm(
            r".*",
            '{"verdict": "UNDETERMINED", "reasoning": "Insufficient info."}'
        )
        contract.resolve()
        assert contract.status == "resolved"

    def test_resolve_with_json_in_code_fence(self, active_contract, direct_vm):
        """LLM response with code fences should be handled."""
        contract, alice, bob = active_contract
        self._setup_full_dispute(contract, alice, bob, direct_vm)
        direct_vm.mock_llm(
            r".*",
            '```json\n{"verdict": "TRUE", "reasoning": "Fenced response."}\n```'
        )
        contract.resolve()
        assert contract.verdict == "TRUE"
        assert contract.reasoning == "Fenced response."


# ============================================================
# Contract Deployment Variants
# ============================================================


class TestDeploymentVariants:
    def test_deploy_with_minimal_evidence_defs(self, direct_vm, direct_deploy):
        """Deploy with minimal evidence definitions."""
        direct_vm.sender = b'\x01' * 20
        evidence_defs = json.dumps({})
        contract = direct_deploy(
            "contracts/MoltCourt.py",
            b'\x02' * 20,
            "Minimal statement",
            "Minimal guidelines",
            evidence_defs,
        )
        assert contract.status == "created"
        assert contract.evidence_defs == evidence_defs

    def test_deploy_with_long_statement(self, direct_vm, direct_deploy):
        """Deploy with a very long statement."""
        direct_vm.sender = b'\x01' * 20
        long_statement = "A" * 5000
        evidence_defs = json.dumps({"party_a": {}, "party_b": {}})
        contract = direct_deploy(
            "contracts/MoltCourt.py",
            b'\x02' * 20,
            long_statement,
            "Guidelines",
            evidence_defs,
        )
        assert contract.statement == long_statement

    def test_deploy_with_long_guidelines(self, direct_vm, direct_deploy):
        """Deploy with very long guidelines."""
        direct_vm.sender = b'\x01' * 20
        long_guidelines = "G" * 5000
        evidence_defs = json.dumps({"party_a": {}, "party_b": {}})
        contract = direct_deploy(
            "contracts/MoltCourt.py",
            b'\x02' * 20,
            "Statement",
            long_guidelines,
            evidence_defs,
        )
        assert contract.guidelines == long_guidelines

    def test_deploy_with_unicode_statement(self, direct_vm, direct_deploy):
        """Deploy with unicode in statement and guidelines."""
        direct_vm.sender = b'\x01' * 20
        evidence_defs = json.dumps({"party_a": {}, "party_b": {}})
        contract = direct_deploy(
            "contracts/MoltCourt.py",
            b'\x02' * 20,
            "Statement with unicode: \u65e5\u672c\u8a9e \u03b1\u03b2\u03b3",
            "Guidelines with unicode: \u00fcber r\u00e9sum\u00e9",
            evidence_defs,
        )
        assert "\u65e5\u672c\u8a9e" in contract.statement
        assert "\u00fcber" in contract.guidelines

    def test_proposed_outcomes_empty_on_deploy(self, deploy_moltcourt):
        """Proposed outcomes are empty strings on deploy."""
        contract, alice, bob = deploy_moltcourt
        assert contract.proposed_outcome_a == ""
        assert contract.proposed_outcome_b == ""


# ============================================================
# Snapshot & Revert Extended
# ============================================================


class TestSnapshotRevertExtended:
    def test_revert_after_evidence_submission(self, disputed_contract, direct_vm):
        """Revert restores pre-evidence state."""
        contract, alice, bob = disputed_contract
        snap = direct_vm.snapshot()

        with direct_vm.prank(alice):
            contract.submit_evidence("Will be reverted")
        assert contract.evidence_a == "Will be reverted"

        direct_vm.revert(snap)
        assert contract.evidence_a == ""

    def test_revert_after_mutual_resolution(self, active_contract, direct_vm):
        """Revert can undo a mutual resolution."""
        contract, alice, bob = active_contract
        snap = direct_vm.snapshot()

        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        with direct_vm.prank(bob):
            contract.propose_outcome("TRUE")
        assert contract.status == "resolved"

        direct_vm.revert(snap)
        assert contract.status == "active"
        assert contract.verdict == ""

    def test_revert_after_cancellation(self, deploy_moltcourt, direct_vm):
        """Revert can undo cancellation."""
        contract, alice, bob = deploy_moltcourt
        snap = direct_vm.snapshot()

        with direct_vm.prank(alice):
            contract.cancel()
        assert contract.status == "cancelled"

        direct_vm.revert(snap)
        assert contract.status == "created"


# ============================================================
# Evidence Deadline
# ============================================================


class TestEvidenceDeadline:
    """Tests for the time-based evidence submission deadline feature."""

    def _deploy_with_deadline(self, direct_vm, direct_deploy, deadline_seconds):
        """Deploy a MoltCourt contract with a specific evidence deadline."""
        direct_vm.sender = b'\x01' * 20
        contract = direct_deploy(
            "contracts/MoltCourt.py",
            b'\x02' * 20,
            SAMPLE_STATEMENT,
            SAMPLE_GUIDELINES,
            SAMPLE_EVIDENCE_DEFS,
            deadline_seconds,
        )
        _patch_prompt_non_comparative()
        from genlayer import Address
        alice = Address(b'\x01' * 20)
        bob = Address(b'\x02' * 20)
        return contract, alice, bob

    def test_evidence_deadline_set_at_creation(self, direct_vm, direct_deploy):
        """Deadline seconds are stored correctly at deployment."""
        contract, alice, bob = self._deploy_with_deadline(direct_vm, direct_deploy, 3600)
        from genlayer.py.types import u256
        assert int(contract.evidence_deadline_seconds) == 3600

    def test_evidence_deadline_zero_means_no_limit(self, direct_vm, direct_deploy):
        """A deadline of 0 means no time limit on evidence submission."""
        contract, alice, bob = self._deploy_with_deadline(direct_vm, direct_deploy, 0)
        assert int(contract.evidence_deadline_seconds) == 0

        # Activate and dispute
        with direct_vm.prank(bob):
            contract.accept_contract()
        with direct_vm.prank(alice):
            contract.initiate_dispute()

        # Warp far into the future — evidence should still be accepted
        direct_vm.warp("2099-01-01T00:00:00Z")
        with direct_vm.prank(alice):
            contract.submit_evidence("Late but allowed")
        assert contract.evidence_a == "Late but allowed"

    def test_default_deadline_is_zero(self, deploy_moltcourt):
        """Default deployment (no deadline arg) results in 0 deadline."""
        contract, alice, bob = deploy_moltcourt
        assert int(contract.evidence_deadline_seconds) == 0

    def test_dispute_timestamp_set_on_dispute(self, direct_vm, direct_deploy):
        """Dispute timestamp is recorded when dispute is initiated."""
        contract, alice, bob = self._deploy_with_deadline(direct_vm, direct_deploy, 3600)

        assert contract.dispute_timestamp == ""

        with direct_vm.prank(bob):
            contract.accept_contract()

        direct_vm.warp("2025-06-15T12:00:00Z")
        with direct_vm.prank(alice):
            contract.initiate_dispute()

        assert contract.dispute_timestamp != ""
        assert "2025-06-15" in contract.dispute_timestamp

    def test_submit_evidence_before_deadline_works(self, direct_vm, direct_deploy):
        """Evidence submitted before the deadline is accepted."""
        contract, alice, bob = self._deploy_with_deadline(direct_vm, direct_deploy, 3600)

        with direct_vm.prank(bob):
            contract.accept_contract()

        # Initiate dispute at noon
        direct_vm.warp("2025-06-15T12:00:00Z")
        with direct_vm.prank(alice):
            contract.initiate_dispute()

        # Submit evidence 30 minutes later (within 1 hour deadline)
        direct_vm.warp("2025-06-15T12:30:00Z")
        with direct_vm.prank(alice):
            contract.submit_evidence("Evidence within deadline")
        assert contract.evidence_a == "Evidence within deadline"

    def test_submit_evidence_after_deadline_fails(self, direct_vm, direct_deploy):
        """Evidence submitted after the deadline is rejected."""
        contract, alice, bob = self._deploy_with_deadline(direct_vm, direct_deploy, 3600)

        with direct_vm.prank(bob):
            contract.accept_contract()

        # Initiate dispute at noon
        direct_vm.warp("2025-06-15T12:00:00Z")
        with direct_vm.prank(alice):
            contract.initiate_dispute()

        # Try to submit evidence 2 hours later (past 1 hour deadline)
        direct_vm.warp("2025-06-15T14:00:00Z")
        with direct_vm.expect_revert("Evidence submission deadline has passed"):
            with direct_vm.prank(alice):
                contract.submit_evidence("Too late")

    def test_submit_evidence_party_b_after_deadline_fails(self, direct_vm, direct_deploy):
        """Party B also cannot submit evidence after the deadline."""
        contract, alice, bob = self._deploy_with_deadline(direct_vm, direct_deploy, 1800)

        with direct_vm.prank(bob):
            contract.accept_contract()

        direct_vm.warp("2025-06-15T12:00:00Z")
        with direct_vm.prank(alice):
            contract.initiate_dispute()

        # Party A submits within deadline
        direct_vm.warp("2025-06-15T12:15:00Z")
        with direct_vm.prank(alice):
            contract.submit_evidence("A's evidence on time")

        # Party B tries to submit after 30 min deadline
        direct_vm.warp("2025-06-15T12:45:00Z")
        with direct_vm.expect_revert("Evidence submission deadline has passed"):
            with direct_vm.prank(bob):
                contract.submit_evidence("B's late evidence")

    def test_resolve_after_deadline_with_missing_evidence(self, direct_vm, direct_deploy):
        """After deadline, resolution is allowed even if one party hasn't submitted."""
        contract, alice, bob = self._deploy_with_deadline(direct_vm, direct_deploy, 3600)

        with direct_vm.prank(bob):
            contract.accept_contract()

        direct_vm.warp("2025-06-15T12:00:00Z")
        with direct_vm.prank(alice):
            contract.initiate_dispute()

        # Only party A submits within deadline
        direct_vm.warp("2025-06-15T12:30:00Z")
        with direct_vm.prank(alice):
            contract.submit_evidence("Only A submitted")

        # Warp past deadline
        direct_vm.warp("2025-06-15T14:00:00Z")

        # Resolve should work even without B's evidence
        direct_vm.mock_llm(
            r".*impartial AI juror.*",
            '{"verdict": "TRUE", "reasoning": "Only A submitted evidence, B defaulted."}'
        )
        contract.resolve()

        assert contract.status == "resolved"
        assert contract.verdict == "TRUE"

    def test_resolve_before_deadline_requires_both_evidence(self, direct_vm, direct_deploy):
        """Before deadline, resolution still requires both parties' evidence."""
        contract, alice, bob = self._deploy_with_deadline(direct_vm, direct_deploy, 3600)

        with direct_vm.prank(bob):
            contract.accept_contract()

        direct_vm.warp("2025-06-15T12:00:00Z")
        with direct_vm.prank(alice):
            contract.initiate_dispute()

        direct_vm.warp("2025-06-15T12:30:00Z")
        with direct_vm.prank(alice):
            contract.submit_evidence("Only A submitted")

        # Try to resolve before deadline with only A's evidence
        with direct_vm.expect_revert("Both parties must submit evidence"):
            contract.resolve()

    def test_get_evidence_deadline_view(self, direct_vm, direct_deploy):
        """get_evidence_deadline returns correct info."""
        contract, alice, bob = self._deploy_with_deadline(direct_vm, direct_deploy, 7200)

        # Before dispute
        info = json.loads(contract.get_evidence_deadline())
        assert info["evidence_deadline_seconds"] == 7200
        assert info["dispute_timestamp"] == ""
        assert info["deadline_passed"] is False

        with direct_vm.prank(bob):
            contract.accept_contract()

        direct_vm.warp("2025-06-15T12:00:00Z")
        with direct_vm.prank(alice):
            contract.initiate_dispute()

        # During dispute, before deadline
        direct_vm.warp("2025-06-15T12:30:00Z")
        info = json.loads(contract.get_evidence_deadline())
        assert info["evidence_deadline_seconds"] == 7200
        assert info["dispute_timestamp"] != ""
        assert info["deadline_passed"] is False

        # After deadline (2 hours later)
        direct_vm.warp("2025-06-15T15:00:00Z")
        info = json.loads(contract.get_evidence_deadline())
        assert info["deadline_passed"] is True

    def test_get_evidence_deadline_zero_never_passes(self, deploy_moltcourt, direct_vm):
        """With deadline=0, deadline_passed is always False."""
        contract, alice, bob = deploy_moltcourt

        with direct_vm.prank(bob):
            contract.accept_contract()
        with direct_vm.prank(alice):
            contract.initiate_dispute()

        direct_vm.warp("2099-12-31T23:59:59Z")
        info = json.loads(contract.get_evidence_deadline())
        assert info["evidence_deadline_seconds"] == 0
        assert info["deadline_passed"] is False

    def test_resolve_after_deadline_no_evidence_at_all(self, direct_vm, direct_deploy):
        """After deadline, resolution is allowed even with zero evidence from either party."""
        contract, alice, bob = self._deploy_with_deadline(direct_vm, direct_deploy, 60)

        with direct_vm.prank(bob):
            contract.accept_contract()

        direct_vm.warp("2025-06-15T12:00:00Z")
        with direct_vm.prank(alice):
            contract.initiate_dispute()

        # Warp past deadline, nobody submitted anything
        direct_vm.warp("2025-06-15T12:05:00Z")

        direct_vm.mock_llm(
            r".*impartial AI juror.*",
            '{"verdict": "UNDETERMINED", "reasoning": "No evidence from either party."}'
        )
        contract.resolve()

        assert contract.status == "resolved"
        assert contract.verdict == "UNDETERMINED"
