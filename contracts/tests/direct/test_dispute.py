"""Direct tests for proposals, disputes, and evidence in InternetCourt."""
import json
import pytest

from .conftest import STATEMENT, GUIDELINES, EVIDENCE_DEFS


# ============================================================
# Propose Outcome (Three-Key Mutual Agreement)
# ============================================================


class TestProposeOutcome:
    def test_party_a_proposes_true_stored(self, accepted_contract, direct_vm):
        """Party A proposes TRUE and it is stored."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        assert contract.proposed_outcome_a == "TRUE"
        assert contract.status == "active"

    def test_party_b_proposes_true_stored(self, accepted_contract, direct_vm):
        """Party B proposes TRUE and it is stored."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(bob):
            contract.propose_outcome("TRUE")
        assert contract.proposed_outcome_b == "TRUE"
        assert contract.status == "active"

    def test_both_agree_true_resolves_immediately(self, accepted_contract, direct_vm):
        """Both parties propose TRUE -> contract resolves immediately."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        with direct_vm.prank(bob):
            contract.propose_outcome("TRUE")
        assert contract.status == "resolved"
        assert contract.verdict == "TRUE"
        assert "mutual agreement" in contract.reasoning

    def test_both_agree_false_resolves_immediately(self, accepted_contract, direct_vm):
        """Both parties propose FALSE -> contract resolves immediately."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("FALSE")
        with direct_vm.prank(bob):
            contract.propose_outcome("FALSE")
        assert contract.status == "resolved"
        assert contract.verdict == "FALSE"
        assert "mutual agreement" in contract.reasoning

    def test_disagreement_does_not_resolve(self, accepted_contract, direct_vm):
        """Party A proposes TRUE, party B proposes FALSE -> stays active."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        with direct_vm.prank(bob):
            contract.propose_outcome("FALSE")
        assert contract.status == "active"
        assert contract.verdict == ""
        assert contract.proposed_outcome_a == "TRUE"
        assert contract.proposed_outcome_b == "FALSE"

    def test_non_party_cannot_propose(self, accepted_contract, direct_vm, direct_charlie):
        """A non-party (charlie) cannot propose an outcome."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(direct_charlie):
            with direct_vm.expect_revert("Not a party to this contract"):
                contract.propose_outcome("TRUE")

    def test_cannot_propose_before_accepted(self, court_contract, direct_vm):
        """Cannot propose outcome before the contract is accepted (status: created)."""
        contract, alice, bob = court_contract
        with direct_vm.prank(alice):
            with direct_vm.expect_revert("Contract not active"):
                contract.propose_outcome("TRUE")

    def test_invalid_outcome_rejected(self, accepted_contract, direct_vm):
        """Outcome must be TRUE or FALSE."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            with direct_vm.expect_revert("Outcome must be TRUE or FALSE"):
                contract.propose_outcome("MAYBE")

    def test_invalid_outcome_undetermined(self, accepted_contract, direct_vm):
        """UNDETERMINED is not a valid proposal value."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            with direct_vm.expect_revert("Outcome must be TRUE or FALSE"):
                contract.propose_outcome("UNDETERMINED")

    def test_invalid_outcome_lowercase(self, accepted_contract, direct_vm):
        """Lowercase outcomes are rejected."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            with direct_vm.expect_revert("Outcome must be TRUE or FALSE"):
                contract.propose_outcome("true")

    def test_party_can_change_proposal(self, accepted_contract, direct_vm):
        """A party can update their proposal before resolution."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        assert contract.proposed_outcome_a == "TRUE"
        with direct_vm.prank(alice):
            contract.propose_outcome("FALSE")
        assert contract.proposed_outcome_a == "FALSE"

    def test_change_proposal_to_match_resolves(self, accepted_contract, direct_vm):
        """Changing a proposal to match the other party triggers resolution."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        with direct_vm.prank(bob):
            contract.propose_outcome("FALSE")
        assert contract.status == "active"
        # Bob changes mind to match Alice
        with direct_vm.prank(bob):
            contract.propose_outcome("TRUE")
        assert contract.status == "resolved"
        assert contract.verdict == "TRUE"

    def test_proposals_readable_via_get_contract_details(self, accepted_contract, direct_vm):
        """Proposals are readable via get_contract_details."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        details = json.loads(contract.get_contract_details())
        assert details["proposed_outcome_a"] == "TRUE"
        assert details["proposed_outcome_b"] == ""


# ============================================================
# Initiate Dispute
# ============================================================


class TestInitiateDispute:
    def test_party_a_can_initiate_dispute(self, accepted_contract, direct_vm):
        """Party A can initiate dispute -> status becomes 'disputed'."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            contract.initiate_dispute()
        assert contract.status == "disputed"

    def test_party_b_can_initiate_dispute(self, accepted_contract, direct_vm):
        """Party B can initiate dispute -> status becomes 'disputed'."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(bob):
            contract.initiate_dispute()
        assert contract.status == "disputed"

    def test_dispute_after_disagreement(self, accepted_contract, direct_vm):
        """After proposal disagreement, either party can initiate dispute."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        with direct_vm.prank(bob):
            contract.propose_outcome("FALSE")
        assert contract.status == "active"
        with direct_vm.prank(alice):
            contract.initiate_dispute()
        assert contract.status == "disputed"

    def test_cannot_dispute_before_accepted(self, court_contract, direct_vm):
        """Cannot dispute before the contract is accepted (status: created)."""
        contract, alice, bob = court_contract
        with direct_vm.prank(alice):
            with direct_vm.expect_revert("Contract not active"):
                contract.initiate_dispute()

    def test_non_party_cannot_dispute(self, accepted_contract, direct_vm, direct_charlie):
        """A non-party (charlie) cannot initiate a dispute."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(direct_charlie):
            with direct_vm.expect_revert("Not a party to this contract"):
                contract.initiate_dispute()

    def test_cannot_dispute_already_disputed(self, disputed_contract, direct_vm):
        """Cannot dispute a contract that is already in 'disputed' status."""
        contract, alice, bob = disputed_contract
        with direct_vm.prank(alice):
            with direct_vm.expect_revert("Contract not active"):
                contract.initiate_dispute()

    def test_dispute_sets_timestamp(self, accepted_contract, direct_vm):
        """Dispute initiation sets the dispute_timestamp."""
        contract, alice, bob = accepted_contract
        assert contract.dispute_timestamp == ""
        with direct_vm.prank(alice):
            contract.initiate_dispute()
        assert contract.dispute_timestamp != ""
        import datetime
        parsed = datetime.datetime.fromisoformat(contract.dispute_timestamp)
        assert parsed is not None


# ============================================================
# Submit Evidence
# ============================================================


class TestSubmitEvidence:
    def test_party_a_submits_evidence(self, disputed_contract, direct_vm):
        """Party A submits evidence -> stored in evidence_a."""
        contract, alice, bob = disputed_contract
        with direct_vm.prank(alice):
            contract.submit_evidence("Party A's evidence text")
        assert contract.evidence_a == "Party A's evidence text"

    def test_party_b_submits_evidence(self, disputed_contract, direct_vm):
        """Party B submits evidence -> stored in evidence_b."""
        contract, alice, bob = disputed_contract
        with direct_vm.prank(bob):
            contract.submit_evidence("Party B's evidence text")
        assert contract.evidence_b == "Party B's evidence text"

    def test_cannot_submit_before_dispute(self, accepted_contract, direct_vm):
        """Cannot submit evidence before a dispute is initiated (status: active)."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            with direct_vm.expect_revert("No active dispute"):
                contract.submit_evidence("Evidence")

    def test_cannot_submit_on_created_contract(self, court_contract, direct_vm):
        """Cannot submit evidence on a contract that is not yet accepted."""
        contract, alice, bob = court_contract
        with direct_vm.prank(alice):
            with direct_vm.expect_revert("No active dispute"):
                contract.submit_evidence("Evidence")

    def test_non_party_cannot_submit(self, disputed_contract, direct_vm, direct_charlie):
        """A non-party (charlie) cannot submit evidence."""
        contract, alice, bob = disputed_contract
        with direct_vm.prank(direct_charlie):
            with direct_vm.expect_revert("Not a party to this contract"):
                contract.submit_evidence("Outsider evidence")

    def test_party_a_cannot_submit_twice(self, disputed_contract, direct_vm):
        """Party A cannot submit evidence twice."""
        contract, alice, bob = disputed_contract
        with direct_vm.prank(alice):
            contract.submit_evidence("First submission")
        with direct_vm.prank(alice):
            with direct_vm.expect_revert("Party A already submitted evidence"):
                contract.submit_evidence("Second submission")

    def test_party_b_cannot_submit_twice(self, disputed_contract, direct_vm):
        """Party B cannot submit evidence twice."""
        contract, alice, bob = disputed_contract
        with direct_vm.prank(bob):
            contract.submit_evidence("First submission")
        with direct_vm.prank(bob):
            with direct_vm.expect_revert("Party B already submitted evidence"):
                contract.submit_evidence("Second submission")

    def test_evidence_exceeds_max_chars(self, disputed_contract, direct_vm):
        """Evidence exceeding max_chars (10000) is rejected."""
        contract, alice, bob = disputed_contract
        long_evidence = "x" * 10001
        with direct_vm.prank(alice):
            with direct_vm.expect_revert("Evidence exceeds max length"):
                contract.submit_evidence(long_evidence)

    def test_evidence_at_max_chars_allowed(self, disputed_contract, direct_vm):
        """Evidence at exactly max_chars (10000) is accepted."""
        contract, alice, bob = disputed_contract
        exact_evidence = "x" * 10000
        with direct_vm.prank(alice):
            contract.submit_evidence(exact_evidence)
        assert len(contract.evidence_a) == 10000

    def test_both_submit_auto_resolves(self, disputed_contract, direct_vm):
        """When both parties submit evidence, contract auto-resolves via AI jury."""
        contract, alice, bob = disputed_contract
        with direct_vm.prank(alice):
            contract.submit_evidence("Evidence A")
        direct_vm.mock_llm(
            r".*impartial AI juror.*",
            '{"verdict": "TRUE", "reasoning": "Auto-resolved after both submitted."}'
        )
        with direct_vm.prank(bob):
            contract.submit_evidence("Evidence B")
        assert contract.status == "resolved"
        assert contract.verdict == "TRUE"
        assert contract.reasoning == "Auto-resolved after both submitted."

    def test_evidence_with_json_content(self, disputed_contract, direct_vm):
        """Evidence containing JSON is stored correctly."""
        contract, alice, bob = disputed_contract
        json_evidence = json.dumps({"deliverables": ["item1", "item2"], "score": 85})
        with direct_vm.prank(alice):
            contract.submit_evidence(json_evidence)
        stored = json.loads(contract.evidence_a)
        assert stored["score"] == 85

    def test_evidence_with_special_characters(self, disputed_contract, direct_vm):
        """Evidence with special characters is stored correctly."""
        contract, alice, bob = disputed_contract
        evidence = 'Contains "quotes" and\nnewlines and unicode: \u00e9\u00e8\u00ea'
        with direct_vm.prank(bob):
            contract.submit_evidence(evidence)
        assert contract.evidence_b == evidence


# ============================================================
# View Methods (Evidence & Proposals)
# ============================================================


class TestViewMethods:
    def test_get_evidence_empty_before_submissions(self, disputed_contract):
        """get_evidence returns empty strings before any submissions."""
        contract, alice, bob = disputed_contract
        evidence = json.loads(contract.get_evidence())
        assert evidence["evidence_a"] == ""
        assert evidence["evidence_b"] == ""

    def test_get_evidence_after_party_a_submits(self, disputed_contract, direct_vm):
        """get_evidence returns party A's evidence after submission."""
        contract, alice, bob = disputed_contract
        with direct_vm.prank(alice):
            contract.submit_evidence("Evidence from A")
        evidence = json.loads(contract.get_evidence())
        assert evidence["evidence_a"] == "Evidence from A"
        assert evidence["evidence_b"] == ""

    def test_get_evidence_after_both_submit(self, disputed_contract, direct_vm):
        """get_evidence returns both parties' evidence after both submit."""
        contract, alice, bob = disputed_contract
        with direct_vm.prank(alice):
            contract.submit_evidence("Evidence A text")
        direct_vm.mock_llm(
            r".*",
            '{"verdict": "TRUE", "reasoning": "Test."}'
        )
        with direct_vm.prank(bob):
            contract.submit_evidence("Evidence B text")
        evidence = json.loads(contract.get_evidence())
        assert evidence["evidence_a"] == "Evidence A text"
        assert evidence["evidence_b"] == "Evidence B text"

    def test_proposals_readable_before_any(self, accepted_contract):
        """Proposals are empty strings before anyone proposes."""
        contract, alice, bob = accepted_contract
        details = json.loads(contract.get_contract_details())
        assert details["proposed_outcome_a"] == ""
        assert details["proposed_outcome_b"] == ""

    def test_proposals_readable_after_one_party(self, accepted_contract, direct_vm):
        """Only the proposing party's outcome is set."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(bob):
            contract.propose_outcome("FALSE")
        details = json.loads(contract.get_contract_details())
        assert details["proposed_outcome_a"] == ""
        assert details["proposed_outcome_b"] == "FALSE"

    def test_proposals_readable_after_both_parties(self, accepted_contract, direct_vm):
        """Both proposals are readable after both parties propose (with disagreement)."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        with direct_vm.prank(bob):
            contract.propose_outcome("FALSE")
        details = json.loads(contract.get_contract_details())
        assert details["proposed_outcome_a"] == "TRUE"
        assert details["proposed_outcome_b"] == "FALSE"

    def test_get_verdict_after_mutual_agreement(self, accepted_contract, direct_vm):
        """get_verdict returns correct data after mutual agreement resolution."""
        contract, alice, bob = accepted_contract
        with direct_vm.prank(alice):
            contract.propose_outcome("TRUE")
        with direct_vm.prank(bob):
            contract.propose_outcome("TRUE")
        verdict = json.loads(contract.get_verdict())
        assert verdict["verdict"] == "TRUE"
        assert verdict["status"] == "resolved"
        assert "mutual agreement" in verdict["reasoning"]

    def test_get_status_shows_disputed(self, disputed_contract):
        """get_status reflects 'disputed' status after dispute initiation."""
        contract, alice, bob = disputed_contract
        status = json.loads(contract.get_status())
        assert status["status"] == "disputed"
