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

#### 1. Pagination — `get_contracts_page(offset, limit)`

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
| Phase 1 | Pagination (#1), Recent contracts (#3) | Low — no storage changes |
| Phase 2 | Party index (#2) | Medium — new storage + register_contract change |
| Phase 3 | Status tracking (#4, #5) if needed | High — sync mechanism needed |

## Indexing Strategy Notes

GenLayer uses `TreeMap` (ordered key-value store) and `DynArray` (dynamic array). Current indexing approach serializes ID lists as JSON strings in TreeMap values. This works but has limitations:

- **JSON array size**: Each type/deployer index is a single JSON string. With thousands of IDs, parsing becomes slow.
- **Alternative**: Use composite TreeMap keys like `"type:MoltCourt:0"`, `"type:MoltCourt:1"` with a counter. This allows TreeMap range queries instead of parsing huge JSON arrays.
- **DynArray**: Could be used for the global registry order, but TreeMap is more flexible for key-based lookups.

For Phase 1 (pagination), the current JSON array approach works fine. For Phase 2+, consider migrating to composite keys if scale becomes an issue.
