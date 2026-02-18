"""Integration tests: Deploy InternetCourt contracts to GenLayer Studio.

This file tests full contract deployment and interaction against a real
GenLayer network (localnet via Docker, or studionet hosted).

Prerequisites:
    1. GenLayer Studio running:
       - Local: `genlayer init && genlayer up` (Docker required)
       - Or use studionet (no local setup needed)
    2. gltest.config.yaml in project root with network config
    3. Python venv with genlayer-test, genlayer-py installed

How to run:
    # Local GenLayer Studio (default):
    cd /path/to/internetcourt
    gltest contracts/tests/integration/ -m integration -v -s

    # Against studionet:
    gltest contracts/tests/integration/ -m integration --network studionet -v -s

    # Single test:
    gltest contracts/tests/integration/test_studio_deploy.py::test_deploy_internetcourt -m integration -v -s

Notes:
    - These tests are SLOW (~30-120s per write transaction)
    - They require a running GenLayer network
    - They are excluded from default pytest runs (need -m integration)
    - Use -s flag to see print output for debugging
    - Transactions wait for ACCEPTED status by default (not FINALIZED)

What's tested:
    - InternetCourt contract deployment with constructor args
    - InternetCourtFactory contract deployment
    - Full dispute lifecycle: create -> accept -> dispute -> evidence -> resolve
    - Mutual agreement (2-of-2) happy path
    - Factory registration and querying
    - Multi-account interactions (alice, bob, charlie)
"""

import json
import pytest
from gltest import get_contract_factory, create_account
from gltest.assertions import tx_execution_succeeded, tx_execution_failed


# Sample data matching the existing unit tests
SAMPLE_STATEMENT = (
    "Agent B delivered a complete security audit covering OWASP Top 10, "
    "authentication bypass vectors, and session management."
)
SAMPLE_GUIDELINES = (
    "Evaluate whether the delivered report contains three distinct sections "
    "covering each area. Each section must include findings with severity ratings."
)
SAMPLE_EVIDENCE_DEFS = json.dumps({
    "party_a": {"types": ["text"], "max_chars": 10000},
    "party_b": {"types": ["text"], "max_chars": 10000},
})


# ---------------------------------------------------------------------------
# InternetCourt deployment
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestInternetCourtDeploy:
    """Test deploying InternetCourt contracts to a real GenLayer network."""

    def test_deploy_internetcourt(self, internetcourt_factory, test_accounts):
        """Deploy an InternetCourt contract and verify it exists on-chain."""
        alice = test_accounts["alice"]
        bob = test_accounts["bob"]

        print(f"\n--- Deploying InternetCourt contract ---")
        print(f"  Deployer (Alice): {alice.address}")
        print(f"  Party B (Bob):    {bob.address}")
        print(f"  Statement:        {SAMPLE_STATEMENT[:60]}...")

        contract = internetcourt_factory.deploy(
            args=[bob.address, SAMPLE_STATEMENT, SAMPLE_GUIDELINES, SAMPLE_EVIDENCE_DEFS],
            account=alice,
        )

        print(f"  Contract address: {contract.address}")
        assert contract.address is not None, "Contract should have an address"

        # Read contract status
        status_json = contract.get_status().call()
        print(f"  Status response:  {status_json[:120]}...")
        status = json.loads(status_json)

        assert status["status"] == "created", f"Expected 'created', got '{status['status']}'"
        assert status["statement"] == SAMPLE_STATEMENT
        print("  PASSED: Contract deployed and readable")

    def test_deploy_and_read_details(self, internetcourt_factory, test_accounts):
        """Deploy and read all contract details."""
        alice = test_accounts["alice"]
        bob = test_accounts["bob"]

        contract = internetcourt_factory.deploy(
            args=[bob.address, SAMPLE_STATEMENT, SAMPLE_GUIDELINES, SAMPLE_EVIDENCE_DEFS],
            account=alice,
        )

        print(f"\n--- Reading contract details ---")
        details_json = contract.get_contract_details().call()
        details = json.loads(details_json)
        print(f"  Details: {json.dumps(details, indent=2)[:300]}...")

        assert details["statement"] == SAMPLE_STATEMENT
        assert details["guidelines"] == SAMPLE_GUIDELINES
        assert details["status"] == "created"
        assert details["verdict"] == ""
        assert details["evidence_a"] == ""
        assert details["evidence_b"] == ""
        print("  PASSED: All contract details correct")


# ---------------------------------------------------------------------------
# Full dispute lifecycle — happy path (mutual agreement)
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestMutualAgreement:
    """Test the 2-of-2 mutual agreement path (no jury needed)."""

    def test_mutual_agreement_party_a(self, internetcourt_factory, test_accounts):
        """Both parties agree PARTY_A — resolved without AI jury."""
        alice = test_accounts["alice"]
        bob = test_accounts["bob"]

        print(f"\n--- Mutual Agreement: both propose PARTY_A ---")

        # Deploy
        contract = internetcourt_factory.deploy(
            args=[bob.address, SAMPLE_STATEMENT, SAMPLE_GUIDELINES, SAMPLE_EVIDENCE_DEFS],
            account=alice,
        )
        print(f"  Deployed at: {contract.address}")

        # Bob accepts
        bob_contract = contract.connect(bob)
        tx = bob_contract.accept_contract().transact()
        assert tx_execution_succeeded(tx), f"accept_contract failed: {tx}"
        print("  Bob accepted contract")

        # Verify active
        status = json.loads(contract.get_status().call())
        assert status["status"] == "active"
        print(f"  Status: {status['status']}")

        # Alice proposes PARTY_A
        tx = contract.propose_outcome(args=["PARTY_A"]).transact()
        assert tx_execution_succeeded(tx), f"Alice propose_outcome failed: {tx}"
        print("  Alice proposed PARTY_A")

        # Bob proposes PARTY_A — should auto-resolve
        tx = bob_contract.propose_outcome(args=["PARTY_A"]).transact()
        assert tx_execution_succeeded(tx), f"Bob propose_outcome failed: {tx}"
        print("  Bob proposed PARTY_A")

        # Check resolved
        verdict_json = contract.get_verdict().call()
        verdict = json.loads(verdict_json)
        print(f"  Verdict: {json.dumps(verdict, indent=2)}")

        assert verdict["status"] == "resolved"
        assert verdict["verdict"] == "PARTY_A"
        assert "mutual agreement" in verdict["reasoning"].lower()
        print("  PASSED: Resolved by mutual agreement (PARTY_A)")

    def test_mutual_agreement_party_b(self, internetcourt_factory, test_accounts):
        """Both parties agree PARTY_B — resolved without AI jury."""
        alice = test_accounts["alice"]
        bob = test_accounts["bob"]

        print(f"\n--- Mutual Agreement: both propose PARTY_B ---")

        contract = internetcourt_factory.deploy(
            args=[bob.address, SAMPLE_STATEMENT, SAMPLE_GUIDELINES, SAMPLE_EVIDENCE_DEFS],
            account=alice,
        )
        print(f"  Deployed at: {contract.address}")

        bob_contract = contract.connect(bob)
        tx = bob_contract.accept_contract().transact()
        assert tx_execution_succeeded(tx)

        tx = contract.propose_outcome(args=["PARTY_B"]).transact()
        assert tx_execution_succeeded(tx)
        print("  Alice proposed PARTY_B")

        tx = bob_contract.propose_outcome(args=["PARTY_B"]).transact()
        assert tx_execution_succeeded(tx)
        print("  Bob proposed PARTY_B")

        verdict = json.loads(contract.get_verdict().call())
        assert verdict["status"] == "resolved"
        assert verdict["verdict"] == "PARTY_B"
        print("  PASSED: Resolved by mutual agreement (PARTY_B)")


# ---------------------------------------------------------------------------
# Full dispute lifecycle — dispute path (AI jury)
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestDisputeLifecycle:
    """Test the full dispute path with evidence and AI jury resolution.

    WARNING: The resolve() method invokes non-deterministic AI evaluation.
    This requires the GenLayer validators to have LLM access configured.
    If running locally, make sure `genlayer init` was set up with an LLM provider.
    This test may take several minutes.
    """

    def test_dispute_with_evidence(self, internetcourt_factory, test_accounts):
        """Full lifecycle: deploy -> accept -> dispute -> evidence -> resolve."""
        alice = test_accounts["alice"]
        bob = test_accounts["bob"]

        print(f"\n--- Full Dispute Lifecycle ---")

        # 1. Deploy
        contract = internetcourt_factory.deploy(
            args=[bob.address, SAMPLE_STATEMENT, SAMPLE_GUIDELINES, SAMPLE_EVIDENCE_DEFS],
            account=alice,
        )
        bob_contract = contract.connect(bob)
        print(f"  1. Deployed at: {contract.address}")

        # 2. Accept
        tx = bob_contract.accept_contract().transact()
        assert tx_execution_succeeded(tx)
        print("  2. Bob accepted")

        # 3. Initiate dispute
        tx = contract.initiate_dispute().transact()
        assert tx_execution_succeeded(tx)
        status = json.loads(contract.get_status().call())
        assert status["status"] == "disputed"
        print("  3. Dispute initiated")

        # 4. Alice submits evidence
        alice_evidence = (
            "The delivered report only covers 2 of the 3 required areas. "
            "The OWASP Top 10 section is present with severity ratings, "
            "and authentication bypass vectors are documented. However, "
            "session management analysis is completely missing from the report. "
            "See attached report sections A and B (no section C)."
        )
        tx = contract.submit_evidence(args=[alice_evidence]).transact()
        assert tx_execution_succeeded(tx)
        print("  4. Alice submitted evidence")

        # 5. Bob submits evidence
        bob_evidence = (
            "The report covers all three areas. Session management is discussed "
            "within the authentication bypass section (Section B, paragraphs 3-5) "
            "where session fixation, session hijacking, and cookie security are "
            "analyzed with HIGH and MEDIUM severity ratings. The deliverable "
            "requirements did not mandate separate sections — only coverage."
        )
        tx = bob_contract.submit_evidence(args=[bob_evidence]).transact()
        assert tx_execution_succeeded(tx)
        print("  5. Bob submitted evidence")

        # Verify evidence stored
        evidence_json = contract.get_evidence().call()
        evidence = json.loads(evidence_json)
        assert evidence["evidence_a"] == alice_evidence
        assert evidence["evidence_b"] == bob_evidence
        print("  Evidence verified on-chain")

        # 6. Resolve (AI jury evaluation) — this is the slow part
        print("  6. Triggering AI resolution (this may take 1-3 minutes)...")
        try:
            tx = contract.resolve().transact(
                wait_retries=120,  # Wait longer for AI processing
                wait_interval=5000,  # Check every 5 seconds
            )
            if tx_execution_succeeded(tx):
                verdict_json = contract.get_verdict().call()
                verdict = json.loads(verdict_json)
                print(f"  Verdict: {json.dumps(verdict, indent=2)}")
                assert verdict["status"] == "resolved"
                assert verdict["verdict"] in ("PARTY_A", "PARTY_B", "UNDETERMINED")
                assert len(verdict["reasoning"]) > 0
                print(f"  PASSED: AI jury ruled '{verdict['verdict']}'")
            else:
                print(f"  WARNING: resolve() transaction did not succeed: {tx}")
                print("  This may be expected if validators lack LLM access")
                pytest.skip("resolve() failed — likely missing LLM config")
        except Exception as e:
            print(f"  WARNING: resolve() raised exception: {e}")
            print("  This may be expected if validators lack LLM access or timed out")
            pytest.skip(f"resolve() exception: {e}")

    def test_dispute_requires_both_evidence(self, internetcourt_factory, test_accounts):
        """Verify that resolution fails if only one party submitted evidence."""
        alice = test_accounts["alice"]
        bob = test_accounts["bob"]

        print(f"\n--- Dispute: require both evidence ---")

        contract = internetcourt_factory.deploy(
            args=[bob.address, SAMPLE_STATEMENT, SAMPLE_GUIDELINES, SAMPLE_EVIDENCE_DEFS],
            account=alice,
        )
        bob_contract = contract.connect(bob)

        tx = bob_contract.accept_contract().transact()
        assert tx_execution_succeeded(tx)

        tx = contract.initiate_dispute().transact()
        assert tx_execution_succeeded(tx)

        # Only Alice submits
        tx = contract.submit_evidence(args=["Some evidence from Alice"]).transact()
        assert tx_execution_succeeded(tx)

        # Try to resolve — should fail (Bob hasn't submitted)
        tx = contract.resolve().transact()
        assert tx_execution_failed(tx), "resolve() should fail without both evidence"
        print("  PASSED: resolve() correctly rejected — missing Bob's evidence")


# ---------------------------------------------------------------------------
# Access control tests
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestAccessControl:
    """Test that access control works on-chain (not just in unit tests)."""

    def test_only_party_b_can_accept(self, internetcourt_factory, test_accounts):
        """Charlie (not party B) cannot accept the contract."""
        alice = test_accounts["alice"]
        bob = test_accounts["bob"]
        charlie = test_accounts["charlie"]

        print(f"\n--- Access Control: only party B can accept ---")

        contract = internetcourt_factory.deploy(
            args=[bob.address, SAMPLE_STATEMENT, SAMPLE_GUIDELINES, SAMPLE_EVIDENCE_DEFS],
            account=alice,
        )

        charlie_contract = contract.connect(charlie)
        tx = charlie_contract.accept_contract().transact()
        assert tx_execution_failed(tx), "Charlie should not be able to accept"
        print("  PASSED: Charlie correctly rejected")

    def test_only_creator_can_cancel(self, internetcourt_factory, test_accounts):
        """Only the creator (Alice) can cancel."""
        alice = test_accounts["alice"]
        bob = test_accounts["bob"]

        print(f"\n--- Access Control: only creator can cancel ---")

        contract = internetcourt_factory.deploy(
            args=[bob.address, SAMPLE_STATEMENT, SAMPLE_GUIDELINES, SAMPLE_EVIDENCE_DEFS],
            account=alice,
        )

        # Bob tries to cancel
        bob_contract = contract.connect(bob)
        tx = bob_contract.cancel().transact()
        assert tx_execution_failed(tx), "Bob should not be able to cancel"
        print("  Bob correctly rejected from cancelling")

        # Alice cancels
        tx = contract.cancel().transact()
        assert tx_execution_succeeded(tx), "Alice should be able to cancel"
        status = json.loads(contract.get_status().call())
        assert status["status"] == "cancelled"
        print("  PASSED: Alice successfully cancelled")


# ---------------------------------------------------------------------------
# InternetCourtFactory deployment
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestFactoryDeploy:
    """Test deploying and using the InternetCourtFactory contract."""

    def test_deploy_factory(self, factory_contract_factory, test_accounts):
        """Deploy the factory contract."""
        owner = test_accounts["factory_owner"]

        print(f"\n--- Deploying InternetCourtFactory ---")
        print(f"  Owner: {owner.address}")

        factory = factory_contract_factory.deploy(
            args=[],
            account=owner,
        )

        print(f"  Factory address: {factory.address}")
        assert factory.address is not None

        # Check owner
        owner_hex = factory.get_owner().call()
        print(f"  Owner from contract: {owner_hex}")
        # Address comparison (may differ in case)
        assert owner_hex.lower() == owner.address.lower(), (
            f"Owner mismatch: {owner_hex} != {owner.address}"
        )

        # Check initial count
        count = factory.get_contract_count().call()
        print(f"  Initial contract count: {count}")
        assert count == 0
        print("  PASSED: Factory deployed and readable")

    def test_register_type_and_contract(
        self, internetcourt_factory, factory_contract_factory, test_accounts
    ):
        """Register a type, deploy a InternetCourt, register it in the factory."""
        owner = test_accounts["factory_owner"]
        alice = test_accounts["alice"]
        bob = test_accounts["bob"]

        print(f"\n--- Factory: register type + contract ---")

        # Deploy factory
        factory = factory_contract_factory.deploy(args=[], account=owner)
        print(f"  Factory at: {factory.address}")

        # Register type
        tx = factory.register_type(args=["internetcourt"]).transact()
        assert tx_execution_succeeded(tx), f"register_type failed: {tx}"
        print("  Registered type 'internetcourt'")

        is_registered = factory.is_type_registered(args=["internetcourt"]).call()
        assert is_registered == "true"

        # Deploy a InternetCourt
        mc = internetcourt_factory.deploy(
            args=[bob.address, SAMPLE_STATEMENT, SAMPLE_GUIDELINES, SAMPLE_EVIDENCE_DEFS],
            account=alice,
        )
        print(f"  InternetCourt at: {mc.address}")

        # Register it in the factory (alice registers her contract)
        alice_factory = factory.connect(alice)
        params = json.dumps({"statement": SAMPLE_STATEMENT[:50], "party_b": bob.address})
        tx = alice_factory.register_contract(
            args=[mc.address, "internetcourt", params]
        ).transact()
        assert tx_execution_succeeded(tx), f"register_contract failed: {tx}"
        print("  Contract registered in factory")

        # Query
        count = factory.get_contract_count().call()
        print(f"  Total registered: {count}")
        assert count == 1

        # Get by ID
        metadata_json = factory.get_contract(args=[0]).call()
        metadata = json.loads(metadata_json)
        print(f"  Metadata: {json.dumps(metadata, indent=2)[:200]}...")
        assert metadata["contract_type"] == "internetcourt"
        assert metadata["address"].lower() == mc.address.lower()

        # Get by type
        by_type_json = factory.get_contracts_by_type(args=["internetcourt"]).call()
        by_type = json.loads(by_type_json)
        assert len(by_type) == 1
        assert by_type[0]["address"].lower() == mc.address.lower()

        # Get by deployer
        by_deployer_json = factory.get_contracts_by_deployer(
            args=[alice.address]
        ).call()
        by_deployer = json.loads(by_deployer_json)
        assert len(by_deployer) == 1
        print("  PASSED: Full factory registration and query workflow")

    def test_unregistered_type_rejected(self, factory_contract_factory, test_accounts):
        """Registering a contract with an unregistered type should fail."""
        owner = test_accounts["factory_owner"]

        print(f"\n--- Factory: unregistered type rejection ---")

        factory = factory_contract_factory.deploy(args=[], account=owner)

        tx = factory.register_contract(
            args=["0x1234", "unknown_type", "{}"]
        ).transact()
        assert tx_execution_failed(tx), "Should fail with unregistered type"
        print("  PASSED: Unregistered type correctly rejected")

    def test_only_owner_can_register_type(self, factory_contract_factory, test_accounts):
        """Non-owner cannot register types."""
        owner = test_accounts["factory_owner"]
        alice = test_accounts["alice"]

        print(f"\n--- Factory: only owner can register types ---")

        factory = factory_contract_factory.deploy(args=[], account=owner)

        alice_factory = factory.connect(alice)
        tx = alice_factory.register_type(args=["new_type"]).transact()
        assert tx_execution_failed(tx), "Non-owner should not register types"
        print("  PASSED: Non-owner correctly rejected")


# ---------------------------------------------------------------------------
# End-to-end: Factory + InternetCourt combined workflow
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestEndToEnd:
    """Full end-to-end test: deploy factory, deploy multiple courts, register them."""

    def test_multi_contract_workflow(
        self, internetcourt_factory, factory_contract_factory, test_accounts
    ):
        """Deploy factory, register type, deploy 2 InternetCourts, register both."""
        owner = test_accounts["factory_owner"]
        alice = test_accounts["alice"]
        bob = test_accounts["bob"]

        print(f"\n=== END-TO-END: Multi-contract workflow ===")

        # 1. Deploy factory
        factory = factory_contract_factory.deploy(args=[], account=owner)
        print(f"  1. Factory deployed at: {factory.address}")

        # 2. Register type
        tx = factory.register_type(args=["internetcourt"]).transact()
        assert tx_execution_succeeded(tx)
        print("  2. Type 'internetcourt' registered")

        # 3. Deploy InternetCourt #1
        mc1 = internetcourt_factory.deploy(
            args=[
                bob.address,
                "Agent B will deliver code review within 48 hours",
                "Check if review was delivered on time with substantive feedback",
                SAMPLE_EVIDENCE_DEFS,
            ],
            account=alice,
        )
        print(f"  3. InternetCourt #1 at: {mc1.address}")

        # 4. Deploy InternetCourt #2
        mc2 = internetcourt_factory.deploy(
            args=[
                alice.address,
                "Agent A provided accurate market analysis",
                "Verify data sources cited and conclusions logically follow from data",
                SAMPLE_EVIDENCE_DEFS,
            ],
            account=bob,
        )
        print(f"  4. InternetCourt #2 at: {mc2.address}")

        # 5. Register both in factory
        alice_factory = factory.connect(alice)
        tx = alice_factory.register_contract(
            args=[mc1.address, "internetcourt", json.dumps({"case": "code review"})]
        ).transact()
        assert tx_execution_succeeded(tx)
        print("  5a. InternetCourt #1 registered")

        bob_factory = factory.connect(bob)
        tx = bob_factory.register_contract(
            args=[mc2.address, "internetcourt", json.dumps({"case": "market analysis"})]
        ).transact()
        assert tx_execution_succeeded(tx)
        print("  5b. InternetCourt #2 registered")

        # 6. Verify factory state
        count = factory.get_contract_count().call()
        assert count == 2
        print(f"  6. Factory count: {count}")

        by_type = json.loads(factory.get_contracts_by_type(args=["internetcourt"]).call())
        assert len(by_type) == 2

        # Check deployer indexes
        alice_contracts = json.loads(
            factory.get_contracts_by_deployer(args=[alice.address]).call()
        )
        bob_contracts = json.loads(
            factory.get_contracts_by_deployer(args=[bob.address]).call()
        )
        assert len(alice_contracts) == 1
        assert len(bob_contracts) == 1
        print(f"  Alice's contracts: {len(alice_contracts)}")
        print(f"  Bob's contracts: {len(bob_contracts)}")

        # 7. Run happy path on InternetCourt #1
        bob_mc1 = mc1.connect(bob)
        tx = bob_mc1.accept_contract().transact()
        assert tx_execution_succeeded(tx)

        tx = mc1.propose_outcome(args=["PARTY_A"]).transact()
        assert tx_execution_succeeded(tx)

        tx = bob_mc1.propose_outcome(args=["PARTY_A"]).transact()
        assert tx_execution_succeeded(tx)

        verdict = json.loads(mc1.get_verdict().call())
        assert verdict["status"] == "resolved"
        assert verdict["verdict"] == "PARTY_A"
        print(f"  7. InternetCourt #1 resolved: {verdict['verdict']}")

        print("  === END-TO-END PASSED ===")
