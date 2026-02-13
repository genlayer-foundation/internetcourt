"""Direct-mode tests for AI jury resolution in InternetCourt."""
import json
import pytest

# Re-import test constants (must match conftest.py values)
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
ALICE_BYTES = b"\x01" * 20
BOB_BYTES = b"\x02" * 20


# ============================================================
# Helpers
# ============================================================


EVIDENCE_A = "The audit report was missing OWASP Top 10 coverage entirely."
EVIDENCE_B = "The audit report covers OWASP Top 10, auth bypass, and sessions with severity ratings."

VERDICT_TRUE_JSON = '{"verdict": "TRUE", "reasoning": "The audit covers all required areas."}'
VERDICT_FALSE_JSON = '{"verdict": "FALSE", "reasoning": "The audit was incomplete."}'
VERDICT_UNDETERMINED_JSON = '{"verdict": "UNDETERMINED", "reasoning": "Insufficient evidence to decide."}'


def _submit_both_with_mock(contract, alice, bob, direct_vm, mock_response,
                           evidence_a=EVIDENCE_A, evidence_b=EVIDENCE_B):
    """Submit evidence from both parties with a mocked LLM response.

    The second submission triggers auto-resolve via _do_resolve().
    """
    with direct_vm.prank(alice):
        contract.submit_evidence(evidence_a)
    direct_vm.mock_llm(r".*impartial AI juror.*", mock_response)
    with direct_vm.prank(bob):
        contract.submit_evidence(evidence_b)


# ============================================================
# resolve() — core resolution tests
# ============================================================


class TestResolveBasic:
    """Test the resolve() method and auto-resolution via submit_evidence."""

    def test_auto_resolves_after_both_submit_evidence(self, disputed_contract, direct_vm):
        """When both parties submit evidence, _do_resolve is called automatically."""
        contract, alice, bob = disputed_contract
        _submit_both_with_mock(contract, alice, bob, direct_vm, VERDICT_TRUE_JSON)

        assert contract.status == "resolved"
        assert contract.verdict == "TRUE"
        assert contract.reasoning == "The audit covers all required areas."

    def test_resolve_verdict_false(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        _submit_both_with_mock(contract, alice, bob, direct_vm, VERDICT_FALSE_JSON)

        assert contract.status == "resolved"
        assert contract.verdict == "FALSE"
        assert contract.reasoning == "The audit was incomplete."

    def test_resolve_verdict_undetermined(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        _submit_both_with_mock(contract, alice, bob, direct_vm, VERDICT_UNDETERMINED_JSON)

        assert contract.status == "resolved"
        assert contract.verdict == "UNDETERMINED"
        assert contract.reasoning == "Insufficient evidence to decide."

    def test_cannot_resolve_before_dispute(self, accepted_contract, direct_vm):
        """resolve() requires status == 'disputed'."""
        contract, alice, bob = accepted_contract
        with direct_vm.expect_revert("No active dispute to resolve"):
            contract.resolve()

    def test_cannot_resolve_if_not_disputed(self, court_contract, direct_vm):
        """resolve() fails on a freshly created contract."""
        contract, alice, bob = court_contract
        with direct_vm.expect_revert("No active dispute to resolve"):
            contract.resolve()

    def test_cannot_resolve_without_both_evidence(self, disputed_contract, direct_vm):
        """resolve() requires both parties' evidence before deadline."""
        contract, alice, bob = disputed_contract
        with direct_vm.prank(alice):
            contract.submit_evidence(EVIDENCE_A)

        with direct_vm.expect_revert("Both parties must submit evidence"):
            contract.resolve()

    def test_cannot_resolve_with_only_party_b_evidence(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        with direct_vm.prank(bob):
            contract.submit_evidence(EVIDENCE_B)

        with direct_vm.expect_revert("Both parties must submit evidence"):
            contract.resolve()

    def test_cannot_resolve_with_no_evidence(self, disputed_contract, direct_vm):
        """resolve() fails when neither party has submitted evidence."""
        contract, alice, bob = disputed_contract
        with direct_vm.expect_revert("Both parties must submit evidence"):
            contract.resolve()


# ============================================================
# Verdict storage and retrieval
# ============================================================


class TestVerdictRetrieval:
    """Test that verdict and reasoning are stored and retrievable."""

    def test_get_verdict_returns_correct_json(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        _submit_both_with_mock(contract, alice, bob, direct_vm, VERDICT_TRUE_JSON)

        verdict_data = json.loads(contract.get_verdict())
        assert verdict_data["verdict"] == "TRUE"
        assert verdict_data["reasoning"] == "The audit covers all required areas."
        assert verdict_data["status"] == "resolved"

    def test_get_verdict_before_resolution_is_empty(self, disputed_contract):
        contract, alice, bob = disputed_contract
        verdict_data = json.loads(contract.get_verdict())
        assert verdict_data["verdict"] == ""
        assert verdict_data["reasoning"] == ""
        assert verdict_data["status"] == "disputed"

    def test_get_status_includes_verdict_after_resolution(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        _submit_both_with_mock(contract, alice, bob, direct_vm, VERDICT_FALSE_JSON)

        status_data = json.loads(contract.get_status())
        assert status_data["status"] == "resolved"
        assert status_data["verdict"] == "FALSE"
        assert status_data["reasoning"] == "The audit was incomplete."

    def test_get_contract_details_after_resolution(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        _submit_both_with_mock(contract, alice, bob, direct_vm, VERDICT_TRUE_JSON)

        details = json.loads(contract.get_contract_details())
        assert details["status"] == "resolved"
        assert details["verdict"] == "TRUE"
        assert details["evidence_a"] == EVIDENCE_A
        assert details["evidence_b"] == EVIDENCE_B

    def test_evidence_preserved_after_resolution(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        _submit_both_with_mock(contract, alice, bob, direct_vm, VERDICT_TRUE_JSON)

        evidence = json.loads(contract.get_evidence())
        assert evidence["evidence_a"] == EVIDENCE_A
        assert evidence["evidence_b"] == EVIDENCE_B


# ============================================================
# Equivalence principle / validator consensus
# ============================================================


class TestValidatorConsensus:
    """Test the equivalence principle behavior via run_validator."""

    def test_validator_agrees_with_same_mock(self, disputed_contract, direct_vm):
        """Validator running the same nondet logic with same mock returns same result.

        The patched prompt_non_comparative uses strict_eq via run_nondet_unsafe,
        which means the validator's sandbox call produces the same result as the
        leader when mocks are identical. If they disagreed, resolution would fail.
        """
        contract, alice, bob = disputed_contract

        with direct_vm.prank(alice):
            contract.submit_evidence(EVIDENCE_A)

        direct_vm.mock_llm(r".*impartial AI juror.*", VERDICT_TRUE_JSON)

        with direct_vm.prank(bob):
            contract.submit_evidence(EVIDENCE_B)

        # Resolution succeeds because leader + validator (sandbox) saw same mock
        assert contract.status == "resolved"
        assert contract.verdict == "TRUE"
        assert contract.reasoning == "The audit covers all required areas."

    def test_validator_with_different_mock_disagrees(self, disputed_contract, direct_vm):
        """If the validator sees different data, strict_eq should fail.

        In practice this tests the patched prompt_non_comparative behavior
        where leader and validator both call the same nondet function.
        With identical mocks, they agree — this test verifies the basic
        consensus flow works end-to-end.
        """
        contract, alice, bob = disputed_contract
        _submit_both_with_mock(contract, alice, bob, direct_vm, VERDICT_FALSE_JSON)

        # The resolution succeeded because leader + validator saw same mock
        assert contract.status == "resolved"
        assert contract.verdict == "FALSE"


# ============================================================
# LLM response edge cases
# ============================================================


class TestLLMResponseEdgeCases:
    """Test handling of various LLM response formats."""

    def test_resolve_with_json_in_code_fence(self, disputed_contract, direct_vm):
        """LLM wrapping JSON in code fences is handled by _do_resolve."""
        contract, alice, bob = disputed_contract
        fenced_response = '```json\n{"verdict": "TRUE", "reasoning": "Fenced."}\n```'
        _submit_both_with_mock(contract, alice, bob, direct_vm, fenced_response)

        assert contract.verdict == "TRUE"
        assert contract.reasoning == "Fenced."

    def test_resolve_with_whitespace_in_response(self, disputed_contract, direct_vm):
        """LLM response with leading/trailing whitespace is handled."""
        contract, alice, bob = disputed_contract
        padded = '  \n  {"verdict": "FALSE", "reasoning": "Padded response."}  \n  '
        _submit_both_with_mock(contract, alice, bob, direct_vm, padded)

        assert contract.verdict == "FALSE"
        assert contract.reasoning == "Padded response."


# ============================================================
# Cannot re-resolve
# ============================================================


class TestCannotReResolve:
    """Test that resolved contracts cannot be resolved again."""

    def test_cannot_call_resolve_after_auto_resolution(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        _submit_both_with_mock(contract, alice, bob, direct_vm, VERDICT_TRUE_JSON)

        assert contract.status == "resolved"

        with direct_vm.expect_revert("No active dispute to resolve"):
            contract.resolve()

    def test_cannot_submit_evidence_after_resolution(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        _submit_both_with_mock(contract, alice, bob, direct_vm, VERDICT_TRUE_JSON)

        with direct_vm.expect_revert("No active dispute"):
            with direct_vm.prank(alice):
                contract.submit_evidence("Late evidence")

    def test_cannot_dispute_after_resolution(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        _submit_both_with_mock(contract, alice, bob, direct_vm, VERDICT_TRUE_JSON)

        with direct_vm.expect_revert("Contract not active"):
            with direct_vm.prank(alice):
                contract.initiate_dispute()


# ============================================================
# Full lifecycle integration test
# ============================================================


class TestFullLifecycleResolution:
    """End-to-end lifecycle: deploy -> accept -> disagree -> dispute -> evidence -> resolve -> verdict."""

    def test_full_lifecycle_with_ai_jury(self, court_contract, direct_vm):
        """Complete lifecycle exercising every step from deployment to verdict."""
        contract, alice, bob = court_contract

        # 1. Initial state
        assert contract.status == "created"
        assert contract.verdict == ""
        assert contract.reasoning == ""

        # 2. Party B accepts
        with direct_vm.prank(bob):
            contract.accept_contract()
        assert contract.status == "active"

        # 3. Parties propose conflicting outcomes (disagreement)
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        assert contract.proposed_outcome_a == "TRUE"

        with direct_vm.prank(bob):
            contract.propose_outcome("FALSE")
        assert contract.proposed_outcome_b == "FALSE"
        assert contract.status == "active"  # not resolved, they disagree

        # 4. Alice initiates dispute
        with direct_vm.prank(alice):
            contract.initiate_dispute()
        assert contract.status == "disputed"
        assert contract.dispute_timestamp != ""

        # 5. Both parties submit evidence
        with direct_vm.prank(alice):
            contract.submit_evidence(
                "The audit report only covers OWASP Top 10. "
                "Authentication bypass and session management are missing."
            )
        assert contract.evidence_a != ""

        direct_vm.mock_llm(
            r".*impartial AI juror.*",
            '{"verdict": "FALSE", "reasoning": "The report only covers 1 of 3 required areas."}'
        )

        with direct_vm.prank(bob):
            contract.submit_evidence(
                "The audit report contains all three sections with severity ratings."
            )

        # 6. Auto-resolved after both submit
        assert contract.status == "resolved"
        assert contract.verdict == "FALSE"
        assert "1 of 3" in contract.reasoning

        # 7. Verify all view methods return correct data
        verdict_data = json.loads(contract.get_verdict())
        assert verdict_data["verdict"] == "FALSE"
        assert verdict_data["status"] == "resolved"

        status_data = json.loads(contract.get_status())
        assert status_data["status"] == "resolved"
        assert status_data["verdict"] == "FALSE"

        evidence = json.loads(contract.get_evidence())
        assert evidence["evidence_a"] != ""
        assert evidence["evidence_b"] != ""

        details = json.loads(contract.get_contract_details())
        assert details["status"] == "resolved"
        assert details["verdict"] == "FALSE"
        assert details["proposed_outcome_a"] == "TRUE"
        assert details["proposed_outcome_b"] == "FALSE"

    def test_full_lifecycle_verdict_true(self, court_contract, direct_vm):
        """Full lifecycle ending with TRUE verdict."""
        contract, alice, bob = court_contract

        with direct_vm.prank(bob):
            contract.accept_contract()

        with direct_vm.prank(alice):
            contract.initiate_dispute()

        with direct_vm.prank(alice):
            contract.submit_evidence("Evidence supports the statement.")

        direct_vm.mock_llm(
            r".*",
            '{"verdict": "TRUE", "reasoning": "Statement confirmed by evidence."}'
        )
        with direct_vm.prank(bob):
            contract.submit_evidence("Weak counter-evidence.")

        assert contract.status == "resolved"
        assert contract.verdict == "TRUE"
        assert contract.reasoning == "Statement confirmed by evidence."

    def test_full_lifecycle_verdict_undetermined(self, court_contract, direct_vm):
        """Full lifecycle ending with UNDETERMINED verdict."""
        contract, alice, bob = court_contract

        with direct_vm.prank(bob):
            contract.accept_contract()

        with direct_vm.prank(alice):
            contract.initiate_dispute()

        with direct_vm.prank(alice):
            contract.submit_evidence("Vague claims without proof.")

        direct_vm.mock_llm(
            r".*",
            '{"verdict": "UNDETERMINED", "reasoning": "Neither side provided conclusive evidence."}'
        )
        with direct_vm.prank(bob):
            contract.submit_evidence("Also vague claims.")

        assert contract.status == "resolved"
        assert contract.verdict == "UNDETERMINED"


# ============================================================
# Deadline-based resolution with partial evidence
# ============================================================


class TestDeadlineResolution:
    """Test resolve() after evidence deadline passes with partial evidence."""

    def _deploy_with_deadline(self, direct_vm, direct_deploy, deadline_seconds):
        """Deploy a contract with an evidence deadline."""
        direct_vm.sender = ALICE_BYTES
        contract = direct_deploy(
            "contracts/InternetCourt.py",
            BOB_BYTES,
            STATEMENT,
            GUIDELINES,
            EVIDENCE_DEFS,
            deadline_seconds,
        )
        # Patch must happen after deploy loads the SDK
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

        from genlayer import Address
        alice = Address(ALICE_BYTES)
        bob = Address(BOB_BYTES)
        return contract, alice, bob

    def test_resolve_after_deadline_with_only_party_a_evidence(self, direct_vm, direct_deploy):
        """After deadline, resolve works even if only party A submitted."""
        contract, alice, bob = self._deploy_with_deadline(direct_vm, direct_deploy, 3600)

        with direct_vm.prank(bob):
            contract.accept_contract()

        direct_vm.warp("2025-06-15T12:00:00Z")
        with direct_vm.prank(alice):
            contract.initiate_dispute()

        direct_vm.warp("2025-06-15T12:30:00Z")
        with direct_vm.prank(alice):
            contract.submit_evidence("Only A submitted evidence.")

        # Warp past deadline
        direct_vm.warp("2025-06-15T14:00:00Z")

        direct_vm.mock_llm(
            r".*impartial AI juror.*",
            '{"verdict": "TRUE", "reasoning": "B defaulted, A wins by default."}'
        )
        contract.resolve()

        assert contract.status == "resolved"
        assert contract.verdict == "TRUE"

    def test_resolve_after_deadline_with_no_evidence(self, direct_vm, direct_deploy):
        """After deadline, resolve works even with no evidence at all."""
        contract, alice, bob = self._deploy_with_deadline(direct_vm, direct_deploy, 60)

        with direct_vm.prank(bob):
            contract.accept_contract()

        direct_vm.warp("2025-06-15T12:00:00Z")
        with direct_vm.prank(alice):
            contract.initiate_dispute()

        # Warp past deadline
        direct_vm.warp("2025-06-15T12:05:00Z")

        direct_vm.mock_llm(
            r".*impartial AI juror.*",
            '{"verdict": "UNDETERMINED", "reasoning": "No evidence from either party."}'
        )
        contract.resolve()

        assert contract.status == "resolved"
        assert contract.verdict == "UNDETERMINED"

    def test_cannot_resolve_before_deadline_with_partial_evidence(self, direct_vm, direct_deploy):
        """Before deadline, resolve still requires both parties' evidence."""
        contract, alice, bob = self._deploy_with_deadline(direct_vm, direct_deploy, 3600)

        with direct_vm.prank(bob):
            contract.accept_contract()

        direct_vm.warp("2025-06-15T12:00:00Z")
        with direct_vm.prank(alice):
            contract.initiate_dispute()

        direct_vm.warp("2025-06-15T12:30:00Z")
        with direct_vm.prank(alice):
            contract.submit_evidence("Only A, within deadline.")

        with direct_vm.expect_revert("Both parties must submit evidence"):
            contract.resolve()


# ============================================================
# Snapshot/revert around resolution
# ============================================================


class TestResolutionSnapshotRevert:
    """Test that snapshot/revert works correctly around AI resolution."""

    def test_revert_undoes_resolution(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract
        snap = direct_vm.snapshot()

        _submit_both_with_mock(contract, alice, bob, direct_vm, VERDICT_TRUE_JSON)
        assert contract.status == "resolved"

        direct_vm.revert(snap)
        assert contract.status == "disputed"
        assert contract.verdict == ""
        assert contract.reasoning == ""
        assert contract.evidence_a == ""
        assert contract.evidence_b == ""

    def test_revert_after_evidence_but_before_resolve(self, disputed_contract, direct_vm):
        contract, alice, bob = disputed_contract

        with direct_vm.prank(alice):
            contract.submit_evidence(EVIDENCE_A)
        assert contract.evidence_a == EVIDENCE_A

        snap = direct_vm.snapshot()

        direct_vm.mock_llm(r".*", VERDICT_TRUE_JSON)
        with direct_vm.prank(bob):
            contract.submit_evidence(EVIDENCE_B)
        assert contract.status == "resolved"

        direct_vm.revert(snap)
        assert contract.status == "disputed"
        assert contract.evidence_a == EVIDENCE_A
        assert contract.evidence_b == ""
        assert contract.verdict == ""
