# MoltCourtFactory Improvements Proposal

## Current Capabilities

The factory contract (`MoltCourtFactory.py`) currently supports:

| Feature | Method | Status |
|---------|--------|--------|
| Type registration | `register_type()`, `unregister_type()` | ✅ |
| Contract registration | `register_contract()` | ✅ |
| Query by ID | `get_contract(id)` | ✅ |
| Query by type | `get_contracts_by_type(type)` | ✅ |
| Query by deployer | `get_contracts_by_deployer(hex)` | ✅ |
| Contract count | `get_contract_count()` | ✅ |
| Type check | `is_type_registered(type)` | ✅ |
| Ownership | `get_owner()`, `transfer_ownership()` | ✅ |

### Current Storage

- `registry: TreeMap[u256, str]` — contract_id → JSON metadata
- `type_index: TreeMap[str, str]` — contract_type → JSON array of IDs
- `deployer_index: TreeMap[str, str]` — deployer_hex → JSON array of IDs
- `registered_types: TreeMap[str, str]` — type_name → "true"/"false"
- `next_id: u256` — auto-incrementing counter

## Missing Features

### HIGH Priority

#### 1. Factory Migration (Export/Import)

**Problem**: If we deploy a new version of the factory contract (e.g., to add party indexing or pagination), all existing registry data is stranded in the old contract. We need a way to export the full dataset from the old factory and import it into the new one without data loss.

**Data to migrate**:
- `registry` — all contract metadata (ID → JSON)
- `registered_types` — all type registrations
- `type_index` and `deployer_index` — can be rebuilt from registry data during import

**Proposed export methods** (view, anyone can call):

```python
@gl.public.view
def export_all_types(self) -> str:
    """Export all registered type names as a JSON array.
    Returns: '["MoltCourt", "Escrow", ...]'
    Only includes currently-active types (registered_types == "true").
    """

@gl.public.view
def export_all_contracts(self) -> str:
    """Export all contract metadata as a JSON array.
    Returns: '[{"id": 0, "address": "0x...", ...}, ...]'
    Iterates registry from 0 to next_id and returns all entries.
    WARNING: For large registries (1000+), use export_contracts_page instead.
    """

@gl.public.view
def export_contracts_page(self, offset: u256, limit: u256) -> str:
    """Export a page of contract metadata for migration (paginated).
    Returns JSON: {"contracts": [...], "total": N, "has_more": bool}

    Iterates registry from offset to offset+limit, returning raw metadata.
    Caller pages through until has_more is false.
    Use this instead of export_all_contracts for large registries.
    """
```

**Proposed import methods** (write, owner-only):

```python
@gl.public.write
def import_types(self, types_json: str) -> None:
    """Import type registrations from a previous factory version.
    Owner-only. Expects JSON array of type name strings.
    Skips types that are already registered.
    """
    if gl.message.sender_address != self.owner:
        raise ValueError("Only owner can import types")
    types = json.loads(types_json)
    for t in types:
        existing = self.registered_types.get(t)
        if existing is None or existing != "true":
            self.registered_types[t] = "true"

@gl.public.write
def import_contracts(self, contracts_json: str) -> None:
    """Import contract metadata from a previous factory version.
    Owner-only. Expects JSON array of metadata objects.

    Each object must have: id, address, contract_type, deployer, params.
    Preserves original IDs. Rebuilds type_index and deployer_index.
    The contract type must already be registered (call import_types first).
    Sets next_id to max(imported_id) + 1.
    """
    if gl.message.sender_address != self.owner:
        raise ValueError("Only owner can import contracts")
    contracts = json.loads(contracts_json)
    max_id = int(self.next_id) - 1
    for c in contracts:
        cid = u256(c["id"])
        # Store metadata
        self.registry[cid] = json.dumps(c)
        # Rebuild type index
        ct = c["contract_type"]
        type_ids = self.type_index.get(ct)
        if type_ids is None:
            id_list = [c["id"]]
        else:
            id_list = json.loads(type_ids)
            id_list.append(c["id"])
        self.type_index[ct] = json.dumps(id_list)
        # Rebuild deployer index
        dep = c["deployer"]
        deployer_ids = self.deployer_index.get(dep)
        if deployer_ids is None:
            dep_list = [c["id"]]
        else:
            dep_list = json.loads(deployer_ids)
            dep_list.append(c["id"])
        self.deployer_index[dep] = json.dumps(dep_list)
        # Track max ID
        if c["id"] > max_id:
            max_id = c["id"]
    self.next_id = u256(max_id + 1)
```

**Constraints**:
- New factory MUST be deployed by the same owner address as the old factory
- `import_types` must be called before `import_contracts` (contracts require registered types)
- Import is idempotent for types (skips duplicates), but NOT for contracts (importing the same contract twice would duplicate index entries) — add a guard: skip if `registry.get(cid)` already exists

**Migration script** (JS/Python using GenLayer SDK):

```
1. Deploy new MoltCourtFactory with same owner wallet
   → new_factory_address = deploy(MoltCourtFactory)

2. Export types from old factory
   → types = old_factory.export_all_types()

3. Import types into new factory
   → new_factory.import_types(types)  # owner-only tx

4. Export contracts in pages from old factory
   → page = 0, batch_size = 50
   → while True:
       data = old_factory.export_contracts_page(page * batch_size, batch_size)
       if len(data.contracts) == 0: break
       new_factory.import_contracts(json.dumps(data.contracts))  # owner-only tx
       page += 1

5. Verify: new_factory.get_contract_count() == old_factory.get_contract_count()

6. Update frontend env var:
   NEXT_PUBLIC_FACTORY_ADDRESS=new_factory_address

7. (Optional) old_factory.transfer_ownership(burn_address) to prevent further writes
```

**Batch size considerations**: GenLayer transactions have gas/size limits. Importing 50 contracts per transaction is a safe batch size. For a registry with 1000 contracts, that's 20 transactions — manageable.

**Storage changes**: None for export (view methods). Import methods write to existing storage fields.

#### 2. Pagination — `get_contracts_page(offset, limit)`

**Problem**: `get_contracts_by_type()` and `get_contracts_by_deployer()` return ALL results. With 1000+ contracts, this becomes a huge JSON payload — slow and potentially exceeding response limits.

**Proposed methods**:
```python
@gl.public.view
def get_contracts_page(self, offset: u256, limit: u256) -> str:
    """Get a page of contracts from the global registry.
    Returns JSON: {"contracts": [...], "total": N, "offset": N, "limit": N}
    """

@gl.public.view
def get_contracts_by_type_page(self, contract_type: str, offset: u256, limit: u256) -> str:
    """Paginated query by type."""

@gl.public.view
def get_contracts_by_deployer_page(self, deployer_hex: str, offset: u256, limit: u256) -> str:
    """Paginated query by deployer."""
```

**Storage changes**: None — pagination can work with existing JSON arrays by slicing.

#### 2. Find by Party Address — `get_contracts_by_party(address_hex)`

**Problem**: Agents need to find all cases where they are party A or party B. The factory only tracks deployers, not contract parties. This is the #1 feature agents need.

**Proposed approach**:
```python
# New storage
party_index: TreeMap[str, str]  # party_address_hex → JSON array of IDs

@gl.public.write
def register_contract(self, contract_address: str, contract_type: str,
                      params: str, party_a_hex: str, party_b_hex: str) -> u256:
    """Register with party addresses for indexing."""

@gl.public.view
def get_contracts_by_party(self, address_hex: str) -> str:
    """Get all contracts where address is party A or party B."""
```

**Storage changes**: New `party_index: TreeMap[str, str]`. `register_contract` adds new `party_a_hex` and `party_b_hex` params.

**Note**: This is a breaking change to `register_contract` signature. Consider a new `register_contract_v2` or make party params optional.

#### 3. Recent Contracts — `get_recent_contracts(limit)`

**Problem**: The frontend homepage needs "Latest Cases" and there's no efficient way to get the most recent N contracts.

**Proposed method**:
```python
@gl.public.view
def get_recent_contracts(self, limit: u256) -> str:
    """Get the N most recently registered contracts (newest first).
    Returns JSON array of metadata, ordered by descending ID.
    """
```

**Storage changes**: None — since IDs are sequential, we can iterate from `next_id - 1` backwards.

### MEDIUM Priority

#### 4. Contract Count by Status — `get_status_counts()`

**Problem**: Dashboard needs aggregate stats (e.g., "42 active, 15 disputed, 8 resolved"). Currently impossible without reading every contract individually.

**Challenge**: The factory doesn't know about MoltCourt contract status — it only stores metadata at registration time. Status is stored in individual MoltCourt contracts.

**Options**:
- **Option A**: Add a `status` field to factory metadata, updated via a `update_status()` method. Requires callers to keep it in sync.
- **Option B**: Store status on registration and add an `update_contract_status()` method.
- **Option C**: Leave this to the frontend/API layer (query each contract's status off-chain).

**Recommended**: Option C for now. On-chain status tracking adds complexity and sync risk. The API layer can cache and aggregate.

#### 5. Find by Status — `get_contracts_by_status(status)`

**Problem**: Frontend filters (show all "disputed" cases). Same challenge as #4 — factory doesn't track MoltCourt status.

**Recommended**: Handle in API layer, not on-chain. Alternatively, if Option A/B from #4 is implemented:

```python
# New storage
status_index: TreeMap[str, str]  # status → JSON array of IDs

@gl.public.view
def get_contracts_by_status(self, status: str) -> str:
    """Get all contracts with a given status."""
```

### LOW Priority

#### 6. Find by Date Range

**Problem**: "Show all contracts from last week." Factory doesn't store timestamps.

**Proposed**: Add `created_at` to metadata (ISO timestamp). Query in API layer — on-chain date range queries are inefficient with TreeMap.

```python
# In register_contract, add to metadata:
"created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
```

#### 7. Sorting (Newest First, by Status)

**Problem**: Results are returned in registration order. Frontend may want different sorts.

**Recommended**: Handle sorting in API/frontend layer. On-chain sorting is expensive and unnecessary when the data is already ordered by ID (which correlates with time).

## Implementation Roadmap

| Phase | Features | Effort |
|-------|----------|--------|
| Phase 1 | Migration export/import (#1), Pagination (#2), Recent contracts (#4) | Medium — export/import + pagination, no storage schema changes |
| Phase 2 | Party index (#3) — deploy new factory v2, migrate data from v1 | Medium — new storage + migration script execution |
| Phase 3 | Status tracking (#5, #6) if needed | High — sync mechanism needed |

**Migration is Phase 1** because every future upgrade (Phase 2, 3) depends on being able to migrate data to a new factory version. It's foundational infrastructure.

## Indexing Strategy Notes

GenLayer uses `TreeMap` (ordered key-value store) and `DynArray` (dynamic array). Current indexing approach serializes ID lists as JSON strings in TreeMap values. This works but has limitations:

- **JSON array size**: Each type/deployer index is a single JSON string. With thousands of IDs, parsing becomes slow.
- **Alternative**: Use composite TreeMap keys like `"type:MoltCourt:0"`, `"type:MoltCourt:1"` with a counter. This allows TreeMap range queries instead of parsing huge JSON arrays.
- **DynArray**: Could be used for the global registry order, but TreeMap is more flexible for key-based lookups.

For Phase 1 (pagination), the current JSON array approach works fine. For Phase 2+, consider migrating to composite keys if scale becomes an issue.
