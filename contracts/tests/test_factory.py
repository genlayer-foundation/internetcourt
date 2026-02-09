"""Comprehensive tests for the MoltCourtFactory intelligent contract."""
import json
import pytest


# Well-known address bytes for parties
ALICE_BYTES = b'\x01' * 20
BOB_BYTES = b'\x02' * 20
CHARLIE_BYTES = b'\x03' * 20


@pytest.fixture
def deploy_factory(direct_vm, direct_deploy):
    """Deploy a MoltCourtFactory contract.

    Returns (contract, owner_addr).
    """
    direct_vm.sender = ALICE_BYTES

    contract = direct_deploy("contracts/MoltCourtFactory.py")

    from genlayer import Address
    owner = Address(ALICE_BYTES)

    return contract, owner


@pytest.fixture
def factory_with_type(deploy_factory, direct_vm):
    """Deploy factory and register 'MoltCourt' type."""
    contract, owner = deploy_factory

    with direct_vm.prank(owner):
        contract.register_type("MoltCourt")

    return contract, owner


# ============================================================
# Deployment & Initial State
# ============================================================


class TestDeployment:
    def test_initial_owner_is_deployer(self, deploy_factory):
        contract, owner = deploy_factory
        assert contract.get_owner() == owner.as_hex

    def test_initial_count_is_zero(self, deploy_factory):
        contract, owner = deploy_factory
        assert int(contract.get_contract_count()) == 0


# ============================================================
# Type Registration
# ============================================================


class TestTypeRegistration:
    def test_owner_can_register_type(self, deploy_factory, direct_vm):
        contract, owner = deploy_factory
        with direct_vm.prank(owner):
            contract.register_type("MoltCourt")
        assert contract.is_type_registered("MoltCourt") == "true"

    def test_non_owner_cannot_register_type(self, deploy_factory, direct_vm):
        contract, owner = deploy_factory
        from genlayer import Address
        bob = Address(BOB_BYTES)
        with direct_vm.expect_revert("Only owner can register types"):
            with direct_vm.prank(bob):
                contract.register_type("MoltCourt")

    def test_cannot_register_empty_type(self, deploy_factory, direct_vm):
        contract, owner = deploy_factory
        with direct_vm.expect_revert("Contract type cannot be empty"):
            with direct_vm.prank(owner):
                contract.register_type("")

    def test_cannot_register_duplicate_type(self, factory_with_type, direct_vm):
        contract, owner = factory_with_type
        with direct_vm.expect_revert("Contract type already registered"):
            with direct_vm.prank(owner):
                contract.register_type("MoltCourt")

    def test_unregistered_type_returns_false(self, deploy_factory):
        contract, owner = deploy_factory
        assert contract.is_type_registered("NonExistent") == "false"

    def test_owner_can_unregister_type(self, factory_with_type, direct_vm):
        contract, owner = factory_with_type
        assert contract.is_type_registered("MoltCourt") == "true"
        with direct_vm.prank(owner):
            contract.unregister_type("MoltCourt")
        assert contract.is_type_registered("MoltCourt") == "false"

    def test_non_owner_cannot_unregister_type(self, factory_with_type, direct_vm):
        contract, owner = factory_with_type
        from genlayer import Address
        bob = Address(BOB_BYTES)
        with direct_vm.expect_revert("Only owner can unregister types"):
            with direct_vm.prank(bob):
                contract.unregister_type("MoltCourt")

    def test_cannot_unregister_nonexistent_type(self, deploy_factory, direct_vm):
        contract, owner = deploy_factory
        with direct_vm.expect_revert("Contract type not registered"):
            with direct_vm.prank(owner):
                contract.unregister_type("DoesNotExist")

    def test_register_multiple_types(self, deploy_factory, direct_vm):
        contract, owner = deploy_factory
        with direct_vm.prank(owner):
            contract.register_type("MoltCourt")
        with direct_vm.prank(owner):
            contract.register_type("Escrow")
        with direct_vm.prank(owner):
            contract.register_type("Arbitration")
        assert contract.is_type_registered("MoltCourt") == "true"
        assert contract.is_type_registered("Escrow") == "true"
        assert contract.is_type_registered("Arbitration") == "true"


# ============================================================
# Contract Registration
# ============================================================


class TestContractRegistration:
    def test_register_contract(self, factory_with_type, direct_vm):
        contract, owner = factory_with_type
        with direct_vm.prank(owner):
            cid = contract.register_contract(
                "0xdeadbeef1234567890abcdef",
                "MoltCourt",
                '{"statement": "test"}',
            )
        assert int(cid) == 0
        assert int(contract.get_contract_count()) == 1

    def test_register_increments_id(self, factory_with_type, direct_vm):
        contract, owner = factory_with_type
        with direct_vm.prank(owner):
            cid1 = contract.register_contract("0xaddr1", "MoltCourt", "{}")
        with direct_vm.prank(owner):
            cid2 = contract.register_contract("0xaddr2", "MoltCourt", "{}")
        assert int(cid1) == 0
        assert int(cid2) == 1
        assert int(contract.get_contract_count()) == 2

    def test_register_stores_metadata(self, factory_with_type, direct_vm):
        contract, owner = factory_with_type
        params = json.dumps({"statement": "test claim"})
        with direct_vm.prank(owner):
            cid = contract.register_contract("0xcontractaddr", "MoltCourt", params)

        from genlayer import u256
        metadata = json.loads(contract.get_contract(u256(int(cid))))
        assert metadata["address"] == "0xcontractaddr"
        assert metadata["contract_type"] == "MoltCourt"
        assert metadata["deployer"] == owner.as_hex
        assert metadata["params"] == params

    def test_register_rejects_unregistered_type(self, deploy_factory, direct_vm):
        contract, owner = deploy_factory
        with direct_vm.expect_revert("Contract type not registered"):
            with direct_vm.prank(owner):
                contract.register_contract("0xaddr", "UnknownType", "{}")

    def test_register_rejects_empty_address(self, factory_with_type, direct_vm):
        contract, owner = factory_with_type
        with direct_vm.expect_revert("Contract address cannot be empty"):
            with direct_vm.prank(owner):
                contract.register_contract("", "MoltCourt", "{}")

    def test_register_rejects_empty_type(self, factory_with_type, direct_vm):
        contract, owner = factory_with_type
        with direct_vm.expect_revert("Contract type cannot be empty"):
            with direct_vm.prank(owner):
                contract.register_contract("0xaddr", "", "{}")

    def test_anyone_can_register_contract(self, factory_with_type, direct_vm):
        """Any user can register contracts, not just the owner."""
        contract, owner = factory_with_type
        from genlayer import Address
        bob = Address(BOB_BYTES)
        with direct_vm.prank(bob):
            cid = contract.register_contract("0xbobcontract", "MoltCourt", "{}")
        assert int(cid) == 0

        from genlayer import u256
        metadata = json.loads(contract.get_contract(u256(0)))
        assert metadata["deployer"] == bob.as_hex

    def test_register_after_type_unregistered(self, factory_with_type, direct_vm):
        """Cannot register contracts for unregistered types."""
        contract, owner = factory_with_type
        with direct_vm.prank(owner):
            contract.unregister_type("MoltCourt")
        with direct_vm.expect_revert("Contract type not registered"):
            with direct_vm.prank(owner):
                contract.register_contract("0xaddr", "MoltCourt", "{}")


# ============================================================
# Query: By ID
# ============================================================


class TestGetContract:
    def test_get_existing_contract(self, factory_with_type, direct_vm):
        contract, owner = factory_with_type
        with direct_vm.prank(owner):
            contract.register_contract("0xaddr1", "MoltCourt", '{"key": "val"}')

        from genlayer import u256
        metadata = json.loads(contract.get_contract(u256(0)))
        assert metadata["id"] == 0
        assert metadata["address"] == "0xaddr1"

    def test_get_nonexistent_contract(self, deploy_factory, direct_vm):
        contract, owner = deploy_factory
        from genlayer import u256
        with direct_vm.expect_revert("Contract not found"):
            contract.get_contract(u256(999))


# ============================================================
# Query: By Type
# ============================================================


class TestGetContractsByType:
    def test_get_by_type_empty(self, deploy_factory):
        contract, owner = deploy_factory
        result = json.loads(contract.get_contracts_by_type("MoltCourt"))
        assert result == []

    def test_get_by_type_with_contracts(self, factory_with_type, direct_vm):
        contract, owner = factory_with_type
        with direct_vm.prank(owner):
            contract.register_contract("0xaddr1", "MoltCourt", '{"a": 1}')
        with direct_vm.prank(owner):
            contract.register_contract("0xaddr2", "MoltCourt", '{"a": 2}')

        result = json.loads(contract.get_contracts_by_type("MoltCourt"))
        assert len(result) == 2
        assert result[0]["address"] == "0xaddr1"
        assert result[1]["address"] == "0xaddr2"

    def test_get_by_type_filters_correctly(self, deploy_factory, direct_vm):
        """Different types should not mix."""
        contract, owner = deploy_factory
        with direct_vm.prank(owner):
            contract.register_type("TypeA")
        with direct_vm.prank(owner):
            contract.register_type("TypeB")

        with direct_vm.prank(owner):
            contract.register_contract("0xa1", "TypeA", "{}")
        with direct_vm.prank(owner):
            contract.register_contract("0xb1", "TypeB", "{}")
        with direct_vm.prank(owner):
            contract.register_contract("0xa2", "TypeA", "{}")

        type_a = json.loads(contract.get_contracts_by_type("TypeA"))
        type_b = json.loads(contract.get_contracts_by_type("TypeB"))
        assert len(type_a) == 2
        assert len(type_b) == 1
        assert type_a[0]["address"] == "0xa1"
        assert type_a[1]["address"] == "0xa2"
        assert type_b[0]["address"] == "0xb1"


# ============================================================
# Query: By Deployer
# ============================================================


class TestGetContractsByDeployer:
    def test_get_by_deployer_empty(self, deploy_factory):
        contract, owner = deploy_factory
        result = json.loads(contract.get_contracts_by_deployer("0xnonexistent"))
        assert result == []

    def test_get_by_deployer_with_contracts(self, factory_with_type, direct_vm):
        contract, owner = factory_with_type
        with direct_vm.prank(owner):
            contract.register_contract("0xaddr1", "MoltCourt", "{}")
        with direct_vm.prank(owner):
            contract.register_contract("0xaddr2", "MoltCourt", "{}")

        result = json.loads(contract.get_contracts_by_deployer(owner.as_hex))
        assert len(result) == 2

    def test_get_by_deployer_filters_correctly(self, factory_with_type, direct_vm):
        """Different deployers should have separate registries."""
        contract, owner = factory_with_type
        from genlayer import Address
        bob = Address(BOB_BYTES)

        with direct_vm.prank(owner):
            contract.register_contract("0xowner1", "MoltCourt", "{}")
        with direct_vm.prank(bob):
            contract.register_contract("0xbob1", "MoltCourt", "{}")
        with direct_vm.prank(owner):
            contract.register_contract("0xowner2", "MoltCourt", "{}")

        owner_contracts = json.loads(contract.get_contracts_by_deployer(owner.as_hex))
        bob_contracts = json.loads(contract.get_contracts_by_deployer(bob.as_hex))
        assert len(owner_contracts) == 2
        assert len(bob_contracts) == 1
        assert owner_contracts[0]["address"] == "0xowner1"
        assert owner_contracts[1]["address"] == "0xowner2"
        assert bob_contracts[0]["address"] == "0xbob1"


# ============================================================
# Ownership
# ============================================================


class TestOwnership:
    def test_transfer_ownership(self, deploy_factory, direct_vm):
        contract, owner = deploy_factory
        from genlayer import Address
        bob = Address(BOB_BYTES)

        with direct_vm.prank(owner):
            contract.transfer_ownership(bob)
        assert contract.get_owner() == bob.as_hex

    def test_new_owner_can_register_types(self, deploy_factory, direct_vm):
        contract, owner = deploy_factory
        from genlayer import Address
        bob = Address(BOB_BYTES)

        with direct_vm.prank(owner):
            contract.transfer_ownership(bob)

        with direct_vm.prank(bob):
            contract.register_type("NewType")
        assert contract.is_type_registered("NewType") == "true"

    def test_old_owner_cannot_register_after_transfer(self, deploy_factory, direct_vm):
        contract, owner = deploy_factory
        from genlayer import Address
        bob = Address(BOB_BYTES)

        with direct_vm.prank(owner):
            contract.transfer_ownership(bob)

        with direct_vm.expect_revert("Only owner can register types"):
            with direct_vm.prank(owner):
                contract.register_type("ShouldFail")

    def test_non_owner_cannot_transfer(self, deploy_factory, direct_vm):
        contract, owner = deploy_factory
        from genlayer import Address
        bob = Address(BOB_BYTES)

        with direct_vm.expect_revert("Only owner can transfer ownership"):
            with direct_vm.prank(bob):
                contract.transfer_ownership(bob)


# ============================================================
# Snapshot & Revert
# ============================================================


class TestSnapshotRevert:
    def test_snapshot_revert_preserves_state(self, factory_with_type, direct_vm):
        contract, owner = factory_with_type

        snap = direct_vm.snapshot()

        with direct_vm.prank(owner):
            contract.register_contract("0xsnap", "MoltCourt", "{}")
        assert int(contract.get_contract_count()) == 1

        direct_vm.revert(snap)
        assert int(contract.get_contract_count()) == 0


# ============================================================
# Edge Cases
# ============================================================


class TestEdgeCases:
    def test_register_with_large_params(self, factory_with_type, direct_vm):
        """Large params string should be stored correctly."""
        contract, owner = factory_with_type
        large_params = json.dumps({"data": "x" * 5000})
        with direct_vm.prank(owner):
            cid = contract.register_contract("0xlarge", "MoltCourt", large_params)

        from genlayer import u256
        metadata = json.loads(contract.get_contract(u256(int(cid))))
        assert metadata["params"] == large_params

    def test_register_with_special_chars_in_params(self, factory_with_type, direct_vm):
        """Params with special chars should be stored correctly."""
        contract, owner = factory_with_type
        params = json.dumps({"text": 'Contains "quotes" and\nnewlines'})
        with direct_vm.prank(owner):
            cid = contract.register_contract("0xspecial", "MoltCourt", params)

        from genlayer import u256
        metadata = json.loads(contract.get_contract(u256(int(cid))))
        stored_params = json.loads(metadata["params"])
        assert "quotes" in stored_params["text"]

    def test_multiple_types_and_deployers(self, deploy_factory, direct_vm):
        """Complex scenario with multiple types and deployers."""
        contract, owner = deploy_factory
        from genlayer import Address
        bob = Address(BOB_BYTES)
        charlie = Address(CHARLIE_BYTES)

        with direct_vm.prank(owner):
            contract.register_type("MoltCourt")
        with direct_vm.prank(owner):
            contract.register_type("Escrow")

        # Alice deploys MoltCourt
        with direct_vm.prank(owner):
            contract.register_contract("0xa_mc1", "MoltCourt", "{}")
        # Bob deploys MoltCourt
        with direct_vm.prank(bob):
            contract.register_contract("0xb_mc1", "MoltCourt", "{}")
        # Charlie deploys Escrow
        with direct_vm.prank(charlie):
            contract.register_contract("0xc_es1", "Escrow", "{}")
        # Alice deploys Escrow
        with direct_vm.prank(owner):
            contract.register_contract("0xa_es1", "Escrow", "{}")

        assert int(contract.get_contract_count()) == 4

        mc_contracts = json.loads(contract.get_contracts_by_type("MoltCourt"))
        es_contracts = json.loads(contract.get_contracts_by_type("Escrow"))
        assert len(mc_contracts) == 2
        assert len(es_contracts) == 2

        alice_contracts = json.loads(contract.get_contracts_by_deployer(owner.as_hex))
        bob_contracts = json.loads(contract.get_contracts_by_deployer(bob.as_hex))
        charlie_contracts = json.loads(contract.get_contracts_by_deployer(charlie.as_hex))
        assert len(alice_contracts) == 2
        assert len(bob_contracts) == 1
        assert len(charlie_contracts) == 1


# ============================================================
# Re-registration of Types
# ============================================================


class TestTypeReregistration:
    def test_reregister_unregistered_type(self, factory_with_type, direct_vm):
        """Can re-register a type that was previously unregistered."""
        contract, owner = factory_with_type
        with direct_vm.prank(owner):
            contract.unregister_type("MoltCourt")
        assert contract.is_type_registered("MoltCourt") == "false"
        with direct_vm.prank(owner):
            contract.register_type("MoltCourt")
        assert contract.is_type_registered("MoltCourt") == "true"

    def test_cannot_unregister_twice(self, factory_with_type, direct_vm):
        """Unregistering an already-unregistered type fails."""
        contract, owner = factory_with_type
        with direct_vm.prank(owner):
            contract.unregister_type("MoltCourt")
        with direct_vm.expect_revert("Contract type not registered"):
            with direct_vm.prank(owner):
                contract.unregister_type("MoltCourt")

    def test_register_contract_after_type_reregistered(self, factory_with_type, direct_vm):
        """After unregister + re-register, can register contracts again."""
        contract, owner = factory_with_type
        with direct_vm.prank(owner):
            contract.unregister_type("MoltCourt")
        with direct_vm.prank(owner):
            contract.register_type("MoltCourt")
        with direct_vm.prank(owner):
            cid = contract.register_contract("0xreregistered", "MoltCourt", "{}")
        assert int(cid) == 0


# ============================================================
# Ownership Transfer Extended
# ============================================================


class TestOwnershipExtended:
    def test_new_owner_can_unregister_types(self, deploy_factory, direct_vm):
        """New owner can unregister types after ownership transfer."""
        contract, owner = deploy_factory
        from genlayer import Address
        bob = Address(BOB_BYTES)

        with direct_vm.prank(owner):
            contract.register_type("TestType")
        with direct_vm.prank(owner):
            contract.transfer_ownership(bob)

        with direct_vm.prank(bob):
            contract.unregister_type("TestType")
        assert contract.is_type_registered("TestType") == "false"

    def test_old_owner_cannot_unregister_after_transfer(self, deploy_factory, direct_vm):
        contract, owner = deploy_factory
        from genlayer import Address
        bob = Address(BOB_BYTES)

        with direct_vm.prank(owner):
            contract.register_type("TestType")
        with direct_vm.prank(owner):
            contract.transfer_ownership(bob)

        with direct_vm.expect_revert("Only owner can unregister types"):
            with direct_vm.prank(owner):
                contract.unregister_type("TestType")

    def test_old_owner_cannot_transfer_after_transfer(self, deploy_factory, direct_vm):
        """After transfer, original owner cannot transfer again."""
        contract, owner = deploy_factory
        from genlayer import Address
        bob = Address(BOB_BYTES)
        charlie = Address(CHARLIE_BYTES)

        with direct_vm.prank(owner):
            contract.transfer_ownership(bob)
        with direct_vm.expect_revert("Only owner can transfer ownership"):
            with direct_vm.prank(owner):
                contract.transfer_ownership(charlie)

    def test_double_transfer(self, deploy_factory, direct_vm):
        """Transfer from A->B->C works correctly."""
        contract, owner = deploy_factory
        from genlayer import Address
        bob = Address(BOB_BYTES)
        charlie = Address(CHARLIE_BYTES)

        with direct_vm.prank(owner):
            contract.transfer_ownership(bob)
        assert contract.get_owner() == bob.as_hex
        with direct_vm.prank(bob):
            contract.transfer_ownership(charlie)
        assert contract.get_owner() == charlie.as_hex


# ============================================================
# Query Edge Cases
# ============================================================


class TestQueryEdgeCases:
    def test_is_type_registered_empty_string(self, deploy_factory):
        """Empty string type is not registered."""
        contract, owner = deploy_factory
        assert contract.is_type_registered("") == "false"

    def test_get_contracts_by_nonexistent_type(self, deploy_factory):
        """Query by type that never had contracts returns empty."""
        contract, owner = deploy_factory
        result = json.loads(contract.get_contracts_by_type("NeverRegistered"))
        assert result == []

    def test_get_contract_count_after_multiple(self, factory_with_type, direct_vm):
        """Count increments correctly with each registration."""
        contract, owner = factory_with_type
        assert int(contract.get_contract_count()) == 0
        with direct_vm.prank(owner):
            contract.register_contract("0xa", "MoltCourt", "{}")
        assert int(contract.get_contract_count()) == 1
        with direct_vm.prank(owner):
            contract.register_contract("0xb", "MoltCourt", "{}")
        assert int(contract.get_contract_count()) == 2
        with direct_vm.prank(owner):
            contract.register_contract("0xc", "MoltCourt", "{}")
        assert int(contract.get_contract_count()) == 3

    def test_metadata_ids_are_sequential(self, factory_with_type, direct_vm):
        """Contract IDs in metadata are sequential starting from 0."""
        contract, owner = factory_with_type
        from genlayer import u256
        for i in range(5):
            with direct_vm.prank(owner):
                contract.register_contract(f"0xaddr{i}", "MoltCourt", "{}")

        for i in range(5):
            metadata = json.loads(contract.get_contract(u256(i)))
            assert metadata["id"] == i
            assert metadata["address"] == f"0xaddr{i}"

    def test_get_contracts_by_deployer_unknown(self, deploy_factory):
        """Query by deployer hex that has no contracts returns empty."""
        contract, owner = deploy_factory
        result = json.loads(contract.get_contracts_by_deployer("0x0000000000000000000000000000000000000000"))
        assert result == []

    def test_contract_metadata_has_all_fields(self, factory_with_type, direct_vm):
        """Verify metadata contains all expected fields."""
        contract, owner = factory_with_type
        params = json.dumps({"key": "value"})
        with direct_vm.prank(owner):
            cid = contract.register_contract("0xfullmeta", "MoltCourt", params)

        from genlayer import u256
        metadata = json.loads(contract.get_contract(u256(int(cid))))
        assert "id" in metadata
        assert "address" in metadata
        assert "contract_type" in metadata
        assert "deployer" in metadata
        assert "params" in metadata
        assert metadata["address"] == "0xfullmeta"
        assert metadata["contract_type"] == "MoltCourt"
        assert metadata["params"] == params


# ============================================================
# Contract Registration Edge Cases
# ============================================================


class TestContractRegistrationEdgeCases:
    def test_register_with_unicode_address(self, factory_with_type, direct_vm):
        """Address containing unicode characters is stored."""
        contract, owner = factory_with_type
        with direct_vm.prank(owner):
            cid = contract.register_contract("0x\u00fcnicode\u00e9", "MoltCourt", "{}")

        from genlayer import u256
        metadata = json.loads(contract.get_contract(u256(int(cid))))
        assert metadata["address"] == "0x\u00fcnicode\u00e9"

    def test_register_with_empty_params(self, factory_with_type, direct_vm):
        """Empty params string is allowed."""
        contract, owner = factory_with_type
        with direct_vm.prank(owner):
            cid = contract.register_contract("0xaddr", "MoltCourt", "")
        from genlayer import u256
        metadata = json.loads(contract.get_contract(u256(int(cid))))
        assert metadata["params"] == ""

    def test_register_with_very_long_address(self, factory_with_type, direct_vm):
        """Very long address string is stored."""
        contract, owner = factory_with_type
        long_addr = "0x" + "a" * 5000
        with direct_vm.prank(owner):
            cid = contract.register_contract(long_addr, "MoltCourt", "{}")
        from genlayer import u256
        metadata = json.loads(contract.get_contract(u256(int(cid))))
        assert metadata["address"] == long_addr

    def test_multiple_deployers_same_type_indexes(self, factory_with_type, direct_vm):
        """Multiple deployers registering same type are tracked separately."""
        contract, owner = factory_with_type
        from genlayer import Address
        bob = Address(BOB_BYTES)
        charlie = Address(CHARLIE_BYTES)

        with direct_vm.prank(owner):
            contract.register_contract("0xa1", "MoltCourt", "{}")
        with direct_vm.prank(bob):
            contract.register_contract("0xb1", "MoltCourt", "{}")
        with direct_vm.prank(charlie):
            contract.register_contract("0xc1", "MoltCourt", "{}")

        # Type index should have all 3
        by_type = json.loads(contract.get_contracts_by_type("MoltCourt"))
        assert len(by_type) == 3

        # Each deployer index should have exactly 1
        for addr in [owner, bob, charlie]:
            by_deployer = json.loads(contract.get_contracts_by_deployer(addr.as_hex))
            assert len(by_deployer) == 1


# ============================================================
# Snapshot & Revert Extended
# ============================================================


class TestSnapshotRevertExtended:
    def test_revert_type_registration(self, deploy_factory, direct_vm):
        """Revert undoes type registration."""
        contract, owner = deploy_factory
        snap = direct_vm.snapshot()

        with direct_vm.prank(owner):
            contract.register_type("WillRevert")
        assert contract.is_type_registered("WillRevert") == "true"

        direct_vm.revert(snap)
        assert contract.is_type_registered("WillRevert") == "false"

    def test_revert_contract_registration(self, factory_with_type, direct_vm):
        """Revert undoes contract registration and count."""
        contract, owner = factory_with_type

        with direct_vm.prank(owner):
            contract.register_contract("0xfirst", "MoltCourt", "{}")
        assert int(contract.get_contract_count()) == 1

        snap = direct_vm.snapshot()
        with direct_vm.prank(owner):
            contract.register_contract("0xsecond", "MoltCourt", "{}")
        assert int(contract.get_contract_count()) == 2

        direct_vm.revert(snap)
        assert int(contract.get_contract_count()) == 1

    def test_revert_ownership_transfer(self, deploy_factory, direct_vm):
        """Revert undoes ownership transfer."""
        contract, owner = deploy_factory
        from genlayer import Address
        bob = Address(BOB_BYTES)

        snap = direct_vm.snapshot()
        with direct_vm.prank(owner):
            contract.transfer_ownership(bob)
        assert contract.get_owner() == bob.as_hex

        direct_vm.revert(snap)
        assert contract.get_owner() == owner.as_hex
