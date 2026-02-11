# v0.1.0
# { "Depends": "py-genlayer:latest" }
from genlayer import *
import json


class InternetCourtFactory(gl.Contract):
    # Owner/admin
    owner: Address

    # Registry: contract_id -> JSON metadata
    # Metadata: {"address": str, "contract_type": str, "deployer": str, "created_at": int, "params": str}
    registry: TreeMap[u256, str]

    # Counter for unique IDs
    next_id: u256

    # Index: contract_type -> JSON array of IDs
    type_index: TreeMap[str, str]

    # Index: deployer address hex -> JSON array of IDs
    deployer_index: TreeMap[str, str]

    # Registered contract types (type_name -> True/False as str)
    registered_types: TreeMap[str, str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.next_id = u256(0)

    # -------------------------------------------------------
    # Admin: Register contract types
    # -------------------------------------------------------

    @gl.public.write
    def register_type(self, contract_type: str) -> None:
        """Register a new contract type that can be deployed through this factory."""
        if gl.message.sender_address != self.owner:
            raise ValueError("Only owner can register types")
        if contract_type == "":
            raise ValueError("Contract type cannot be empty")
        existing = self.registered_types.get(contract_type)
        if existing is not None and existing == "true":
            raise ValueError("Contract type already registered")
        self.registered_types[contract_type] = "true"

    @gl.public.write
    def unregister_type(self, contract_type: str) -> None:
        """Unregister a contract type."""
        if gl.message.sender_address != self.owner:
            raise ValueError("Only owner can unregister types")
        existing = self.registered_types.get(contract_type)
        if existing is None or existing != "true":
            raise ValueError("Contract type not registered")
        self.registered_types[contract_type] = "false"

    # -------------------------------------------------------
    # Core: Register deployed contracts
    # -------------------------------------------------------

    @gl.public.write
    def register_contract(
        self,
        contract_address: str,
        contract_type: str,
        params: str,
    ) -> u256:
        """Register a deployed contract in the factory registry.

        Args:
            contract_address: The address of the deployed contract
            contract_type: The type identifier (must be registered)
            params: JSON string of constructor params / metadata

        Returns:
            The assigned contract ID
        """
        if contract_address == "":
            raise ValueError("Contract address cannot be empty")
        if contract_type == "":
            raise ValueError("Contract type cannot be empty")

        existing = self.registered_types.get(contract_type)
        if existing is None or existing != "true":
            raise ValueError("Contract type not registered")

        deployer = gl.message.sender_address
        contract_id = self.next_id

        metadata = json.dumps({
            "id": int(contract_id),
            "address": contract_address,
            "contract_type": contract_type,
            "deployer": deployer.as_hex,
            "params": params,
        })

        self.registry[contract_id] = metadata

        # Update type index
        type_ids = self.type_index.get(contract_type)
        if type_ids is None:
            id_list = [int(contract_id)]
        else:
            id_list = json.loads(type_ids)
            id_list.append(int(contract_id))
        self.type_index[contract_type] = json.dumps(id_list)

        # Update deployer index
        deployer_hex = deployer.as_hex
        deployer_ids = self.deployer_index.get(deployer_hex)
        if deployer_ids is None:
            dep_list = [int(contract_id)]
        else:
            dep_list = json.loads(deployer_ids)
            dep_list.append(int(contract_id))
        self.deployer_index[deployer_hex] = json.dumps(dep_list)

        self.next_id = u256(int(self.next_id) + 1)

        return contract_id

    # -------------------------------------------------------
    # View: Query the registry
    # -------------------------------------------------------

    @gl.public.view
    def get_contract(self, contract_id: u256) -> str:
        """Get metadata for a specific contract by ID."""
        metadata = self.registry.get(contract_id)
        if metadata is None:
            raise ValueError("Contract not found")
        return metadata

    @gl.public.view
    def get_contracts_by_type(self, contract_type: str) -> str:
        """Get all contract IDs for a given type. Returns JSON array of metadata."""
        type_ids = self.type_index.get(contract_type)
        if type_ids is None:
            return json.dumps([])
        id_list = json.loads(type_ids)
        results = []
        for cid in id_list:
            metadata = self.registry.get(u256(cid))
            if metadata is not None:
                results.append(json.loads(metadata))
        return json.dumps(results)

    @gl.public.view
    def get_contracts_by_deployer(self, deployer_hex: str) -> str:
        """Get all contract IDs for a given deployer. Returns JSON array of metadata."""
        deployer_ids = self.deployer_index.get(deployer_hex)
        if deployer_ids is None:
            return json.dumps([])
        id_list = json.loads(deployer_ids)
        results = []
        for cid in id_list:
            metadata = self.registry.get(u256(cid))
            if metadata is not None:
                results.append(json.loads(metadata))
        return json.dumps(results)

    @gl.public.view
    def get_contract_count(self) -> u256:
        """Get total number of registered contracts."""
        return self.next_id

    @gl.public.view
    def is_type_registered(self, contract_type: str) -> str:
        """Check if a contract type is registered. Returns 'true' or 'false'."""
        existing = self.registered_types.get(contract_type)
        if existing is not None and existing == "true":
            return "true"
        return "false"

    @gl.public.view
    def get_owner(self) -> str:
        """Get the factory owner address."""
        return self.owner.as_hex

    # -------------------------------------------------------
    # Admin: Transfer ownership
    # -------------------------------------------------------

    @gl.public.write
    def transfer_ownership(self, new_owner: Address) -> None:
        """Transfer factory ownership to a new address."""
        if gl.message.sender_address != self.owner:
            raise ValueError("Only owner can transfer ownership")
        if isinstance(new_owner, bytes):
            new_owner = Address(new_owner)
        self.owner = new_owner
