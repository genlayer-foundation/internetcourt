# Dispute Resolution Timing Research

Research on timing patterns in dispute resolution protocols, with recommendations for MoltCourt.

## 1. Protocol Research Summary

### Kleros

Kleros is a decentralized court system on Ethereum using Schelling-point game theory with staked jurors.

**Timing parameters (Curation Court example):**

| Phase | Duration |
|-------|----------|
| Evidence submission | 1 day 15 hours |
| Vote commit | ~3 days 9 hours (6 terms × 8h) |
| Vote reveal | Included in voting period |
| Appeal | 2 days 6 hours |

**Key design decisions:**
- Time is measured in **terms** (currently 8 hours each). Every period is composed of terms.
- Evidence period must be long enough for all parties + external agents to submit.
- Voting period accounts for jurors with busy lives needing time to notice they've been drawn.
- Appeal period must allow sufficient time for community to evaluate whether funding an appeal is worthwhile.
- Gas price volatility means no period should be less than a few hours (on L1).
- Different courts can have different timing — content moderation needs less time than complex technical disputes.

**Sources:**
- [Kleros Court Parameterization](https://blog.kleros.io/parameterization-of-kleros-courts/)
- [Kleros Court Docs](https://docs.kleros.io/products/court)

---

### Aragon Court

Aragon Court is a subjective oracle secured by cryptoeconomics, using guardians (jurors) who stake tokens.

**Timing parameters:**

| Phase | Duration |
|-------|----------|
| Evidence submission | 7 days |
| Vote commit | 2 days (6 terms × 8h) |
| Vote reveal | 2 days (6 terms × 8h) |
| Appeal | 2 days |
| Appeal confirmation | 2 days |

**Key design decisions:**
- Base time unit is a **term** (8 hours), same as Kleros.
- Up to 5 rounds of guardian deliberation before final judgment.
- Commit-reveal scheme prevents jurors from influencing each other.
- 7-day evidence period is generous — ensures adequate preparation time.
- Appeals can escalate to larger juror panels; final round requires all staked jurors.

**Sources:**
- [Aragon Court Dispute Lifecycle](https://documentation.aragon.org/products/aragon-court/dispute-lifecycle)
- [Aragon Court Docs](https://legacy-docs.aragon.org/products/aragon-court/aragon-court)

---

### UMA (Optimistic Oracle)

UMA uses an optimistic oracle pattern: propose an answer, assume it's correct unless challenged within a liveness window.

**Timing parameters:**

| Parameter | Default | Notes |
|-----------|---------|-------|
| Default liveness | 2 hours | Standard challenge window |
| Polymarket liveness | 48 hours | Custom for high-stakes prediction markets |
| Minimum recommended | 2 hours | "Not recommended to set shorter than 2 hours" |
| Maximum | No hard cap | Use case dependent |

**Key design decisions:**
- Liveness (challenge period) is **customizable per request** — not one-size-fits-all.
- Shorter liveness = better UX, faster capital turnover.
- Longer liveness = more security, more time for disputers to identify issues.
- Every request includes bond + liveness settings — **bond size and timing work together** as security parameters.
- High-frequency, low-value requests → short liveness (2h). Insurance/high-value → longer liveness.
- "No exact answers" — optimal parameters depend on expected proposers/disputers, value at risk, request frequency.

**Sources:**
- [UMA Custom Bond and Liveness Parameters](https://docs.uma.xyz/developers/setting-custom-bond-and-liveness-parameters)
- [UMA Oracle Overview](https://docs.uma.xyz/protocol-overview/how-does-umas-oracle-work)

---

### Optimism (Fault Proofs)

Optimistic rollups use a challenge period during which anyone can contest state proposals.

**Timing parameters:**

| Parameter | Duration | Notes |
|-----------|----------|-------|
| Challenge period | 7 days | Standard for all OP Stack chains |
| Malicious challenge delay | +3.5 days | Additional delay for challenged valid proposals |
| Maximum delay (attack) | +9 days | Worst case, very high cost to attacker |

**Key design decisions:**
- **7 days** chosen as conservative buffer — not derived from precise calculation but from practical considerations:
  - Must survive long weekends where validators might be offline.
  - Must give time for social-layer coordination if serious fraud detected.
  - After ~1 day, incremental UX improvement is marginal — 7 days is easy to remember ("this time last week").
  - Ecosystem standardization: everyone uses 7 days, so switching costs are lower.
- The period is deliberately **much longer** than the theoretical minimum — security over speed.
- Trade-off acknowledged: terrible UX for withdrawals, but security is non-negotiable for L1 bridges.

**Sources:**
- [Why is the Challenge Period 7 Days?](https://kelvinfichter.com/pages/thoughts/challenge-periods/)
- [Optimism Fault Proofs Explainer](https://docs.optimism.io/op-stack/fault-proofs/explainer)

---

### Reality.eth / SafeSnap

Reality.eth is a crowd-sourced verification system; SafeSnap enables on-chain execution of off-chain votes.

**Timing parameters:**

| Parameter | Default | Notes |
|-----------|---------|-------|
| Question timeout | Configurable (commonly 24-48h) | Answer finalized if unchallenged during this period |
| Cooldown period | 24 hours | After answer is final, before transactions can execute |
| Escalation | Doubles bond each challenge | Economic escalation mechanism |

**Key design decisions:**
- Timeout prevents indefinite waiting — answer auto-finalizes.
- Cooldown period acts as safety valve — even after finalization, there's a window to react to malicious answers.
- Bond escalation (doubling) naturally limits frivolous disputes.

**Sources:**
- [Reality.eth Documentation](https://reality.eth.limo/)
- [SafeSnap Plugin Docs](https://docs.snapshot.box/v1-interface/plugins/safesnap-reality)

---

### Traditional Arbitration (ICC, LCIA)

| Institution | Response Period | Award Deadline | Emergency |
|-------------|----------------|----------------|-----------|
| ICC | 30 days to respond | 6 months from terms of reference | N/A |
| LCIA | 28 days to respond | 3 months from last submission | 14 days for emergency decision |

**Key takeaways for MoltCourt:**
- Even "fast" commercial arbitration operates on weeks-to-months timescales.
- Emergency provisions exist (14 days LCIA) for urgent matters.
- Response periods (28-30 days) ensure parties have adequate time to prepare.

**Sources:**
- [ICC 2021 Arbitration Rules](https://iccwbo.org/dispute-resolution/dispute-resolution-services/arbitration/rules-procedure/2021-arbitration-rules/)
- [LCIA 2020 Arbitration Rules](https://www.lcia.org/Dispute_Resolution_Services/lcia-arbitration-rules-2020.aspx)

---

## 2. Cross-Protocol Comparison

| Protocol | Min Challenge Period | Evidence Window | Deliberation | Appeal Window | Total Dispute Time |
|----------|---------------------|-----------------|-------------|---------------|-------------------|
| Kleros | N/A (immediate) | 1.5–7 days | 3–7 days | 2–3 days | ~7–17 days |
| Aragon Court | N/A (immediate) | 7 days | 4 days (commit+reveal) | 4 days (appeal+confirm) | ~15 days |
| UMA | 2 hours (default) | N/A (single proposal) | N/A | Within liveness window | 2–48 hours |
| Optimism | 7 days | N/A | N/A | Within challenge period | 7–16 days |
| Reality.eth | 24–48 hours | N/A | N/A | Within timeout | 1–3 days |
| ICC | 30 days response | Case dependent | Months | Case dependent | 6+ months |
| LCIA | 28 days response | Case dependent | 3 months target | Case dependent | 3-6+ months |

**Pattern: Web3 protocols typically use hours-to-days for automated disputes, days-to-weeks for juror-based systems.**

---

## 3. Current MoltCourt Timing State

### Existing Parameters

```
evidence_deadline_seconds: u256  # Time from dispute initiation to evidence deadline (0 = no limit)
dispute_timestamp: str           # ISO timestamp when dispute was raised
```

### Current Lifecycle (No Timing Constraints)

```
CREATED ──[accept_contract()]──> ACTIVE ──[initiate_dispute()]──> DISPUTED
    │                               │                                │
    │                               │                                ├──[submit_evidence() × 2]
    │                               │                                │
    │                          [propose_outcome()]                   ▼
    │                          (2-of-2 path)                    RESOLVING
    │                               │                                │
    ▼                               ▼                                ▼
CANCELLED                      RESOLVED                          RESOLVED
                             (mutual agreement)                (AI jury verdict)
```

### Gaps Identified

1. **No minimum dispute period** — Party A can accept and immediately dispute before Party B starts work.
2. **No activation timestamp** — Cannot enforce "time since activation" rules.
3. **No resolution timeout** — AI jury could theoretically take forever.
4. **No appeal mechanism** — Verdict is final immediately.
5. **No cooldown before binding** — Contract is binding the moment Party B accepts.

---

## 4. Proposed Timing Parameters

### Parameter Table

| Parameter | Description | Recommended Default | Min Bound | Max Bound | Rationale |
|-----------|-------------|--------------------:|----------:|----------:|-----------|
| `min_dispute_period_seconds` | Minimum time after activation before a dispute can be raised | 86400 (1 day) | 0 (disabled) | 7776000 (90 days) | Prevents premature disputes; gives parties time to perform work. 1 day default balances protection with responsiveness. |
| `activation_timestamp` | ISO timestamp when contract became active (set automatically) | Auto-set on `accept_contract()` | N/A | N/A | Required to enforce `min_dispute_period_seconds`. Currently missing. |
| `resolution_timeout_seconds` | Max time from evidence completion to verdict. Auto-resolves as UNDETERMINED if exceeded. | 604800 (7 days) | 3600 (1 hour) | 2592000 (30 days) | Prevents disputes from hanging indefinitely. 7 days gives the AI jury ample time while ensuring resolution. |
| `cooling_off_period_seconds` | Grace period after creation before contract becomes binding (Party B can still withdraw). | 0 (disabled) | 0 (disabled) | 604800 (7 days) | Optional. Useful for high-stakes contracts where parties want review time. Disabled by default to keep simple cases fast. |
| `appeal_window_seconds` | Time after verdict for either party to appeal (future feature). | 0 (disabled) | 0 (disabled) | 604800 (7 days) | Not for MVP. Documented here for future planning. Appeals would require a larger juror panel or different AI prompt. |

### Priority Ranking

1. **`min_dispute_period_seconds` + `activation_timestamp`** — **HIGH priority**. This is the most impactful gap. Without it, the dispute mechanism can be gamed.
2. **`resolution_timeout_seconds`** — **MEDIUM priority**. Prevents stuck disputes. Important for production but not critical for MVP.
3. **`cooling_off_period_seconds`** — **LOW priority**. Nice-to-have for high-stakes contracts. Can be added later.
4. **`appeal_window_seconds`** — **FUTURE**. Requires significant design work (what does an appeal look like for an AI jury?).

---

## 5. Proposed Lifecycle with Timing Constraints

```
CREATED ──[accept_contract()]──> ACTIVE
    │                               │
    │                     activation_timestamp set
    │                               │
    │                    ┌──────────┤
    │                    │          │
    │            min_dispute_period │
    │            must elapse before │
    │            dispute allowed    │
    │                    │          │
    │                    ▼          │
    │              [initiate_dispute()]   [propose_outcome()]
    │                    │                      │
    │                    ▼                      │
    ▼               DISPUTED                    │
CANCELLED               │                      │
                         ├── evidence_deadline  │
                         │   (existing)         │
                         │                      │
                         ▼                      │
                    RESOLVING                   │
                         │                      │
                    resolution_timeout          │
                    (auto-UNDETERMINED          │
                     if exceeded)               │
                         │                      │
                         ▼                      ▼
                     RESOLVED              RESOLVED
                   (AI jury)          (mutual agreement)
```

---

## 6. Implementation Plan

### Phase 1: `min_dispute_period_seconds` + `activation_timestamp` (HIGH priority)

**Changes to `MoltCourt.py`:**

1. Add new storage fields:
   ```python
   activation_timestamp: str      # ISO timestamp, "" until activated
   min_dispute_period_seconds: u256  # 0 = disabled
   ```

2. Update `__init__()`:
   - Accept new parameter `min_dispute_period_seconds: int = 86400`
   - Initialize `activation_timestamp = ""`

3. Update `accept_contract()`:
   - Set `self.activation_timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()`

4. Update `initiate_dispute()`:
   - Add check: if `min_dispute_period_seconds > 0`, compute elapsed time since `activation_timestamp` and reject if insufficient.

5. Add view method `get_timing()`:
   - Return all timing parameters and computed values (time remaining until dispute allowed, etc.).

**New tests needed:**
- Cannot dispute before min_dispute_period elapses
- Can dispute after min_dispute_period elapses
- min_dispute_period = 0 allows immediate dispute (backwards compatible)
- activation_timestamp is set correctly on accept
- activation_timestamp is empty before accept
- get_timing() returns correct values

**Note on testing:** Direct test mode uses real `datetime.datetime.now()`, so timing tests would need either:
- Very short periods (1-2 seconds) with `time.sleep()`
- Or mocking `datetime` (complex in GenLayer test environment)
- Recommended: use `min_dispute_period_seconds=1` and `time.sleep(2)` for timing tests

### Phase 2: `resolution_timeout_seconds` (MEDIUM priority)

**Changes to `MoltCourt.py`:**

1. Add storage field:
   ```python
   resolution_timeout_seconds: u256  # 0 = no timeout
   resolving_timestamp: str          # When resolution started
   ```

2. Update `__init__()`:
   - Accept `resolution_timeout_seconds: int = 604800`

3. Update `resolve()`:
   - Set `resolving_timestamp` at start of resolution

4. Add new method `check_resolution_timeout()`:
   - If `resolution_timeout_seconds > 0` and timeout exceeded, auto-resolve as UNDETERMINED.
   - This is tricky with GenLayer's non-det execution model — the AI jury call is synchronous within `resolve()`. The timeout would need to be enforced at a higher level or as a separate `force_resolve()` method anyone can call after timeout.

**Alternative design:** Instead of a timeout during resolution, add a timeout for the entire dispute phase:
- `dispute_timeout_seconds` — max time from dispute initiation to resolution call. If exceeded, anyone can call `force_resolve_undetermined()` which sets verdict to UNDETERMINED.

### Phase 3: Future (LOW priority)

- `cooling_off_period_seconds` — straightforward addition to `accept_contract()`
- `appeal_window_seconds` — requires significant design work

---

## 7. Factory Considerations

Should `MoltCourtFactory.py` enforce timing minimums?

**Recommendation: Yes, with protocol-level defaults and minimums.**

```python
# Protocol-level constants in factory
MIN_DISPUTE_PERIOD_FLOOR = 0          # Allow disabled (0) but if set, must be >= 1 hour
MIN_DISPUTE_PERIOD_DEFAULT = 86400    # 1 day
MAX_EVIDENCE_DEADLINE = 7776000       # 90 days
```

The factory should:
1. Accept timing parameters and pass them to contract constructor.
2. Enforce minimum bounds (e.g., if `min_dispute_period_seconds > 0`, it must be `>= 3600` — at least 1 hour).
3. Provide sensible defaults so agents don't need to specify every parameter.
4. Allow `0` to explicitly disable optional timing constraints.

---

## 8. Edge Cases and Considerations

### Timing Conflicts

**Q: What if `min_dispute_period_seconds` > `evidence_deadline_seconds`?**
A: These operate on different phases. `min_dispute_period` is time after activation before dispute can start. `evidence_deadline` is time after dispute starts for evidence submission. No conflict — they're sequential.

**Q: What if min_dispute_period is very long and the underlying work is done quickly?**
A: Both parties can still use `propose_outcome()` (mutual agreement path) at any time during `active` status. The min_dispute_period only gates the unilateral `initiate_dispute()` path.

**Q: Can mutual agreement bypass the cooling-off period?**
A: Yes. If both parties agree, they can resolve at any time. The cooling-off period only protects against unilateral actions.

### AI Agent Considerations

MoltCourt's primary users are AI agents. Timing implications:
- **Agents operate 24/7** — unlike human jurors, no need for "busy lives" accommodation.
- **Agents act fast** — 1-day minimum dispute period may be more than needed for pure agent-to-agent disputes.
- **But agents can be adversarial** — timing protections prevent flash-dispute attacks.
- **Recommendation:** Keep defaults moderate (1 day) but allow override down to 0 for trusted agent-to-agent scenarios.

### Backward Compatibility

All new parameters should have defaults that preserve current behavior:
- `min_dispute_period_seconds = 0` → immediate dispute allowed (current behavior)
- `resolution_timeout_seconds = 0` → no timeout (current behavior)
- `cooling_off_period_seconds = 0` → no cooling off (current behavior)

This ensures existing contracts and tests continue to work unchanged.

---

## 9. Open Questions

1. **Should `min_dispute_period` apply to the mutual agreement path too?** Current recommendation: No — if both parties agree, timing constraints are unnecessary.

2. **How to handle resolution timeout with GenLayer's execution model?** The `resolve()` call is synchronous — the AI jury responds within the same transaction. A timeout would need to be a separate `force_resolve()` callable after the deadline, not a timeout on the `resolve()` call itself.

3. **Should agents be able to extend deadlines by mutual agreement?** This adds complexity but increases flexibility. Could be a Phase 3 feature.

4. **Protocol-level timing governance?** Should there be a DAO or admin that can adjust protocol-level timing minimums? For MVP, probably not — keep it simple.

5. **Should `evidence_deadline_seconds` be renamed to `evidence_window_seconds` for clarity?** It's a duration, not an absolute deadline. Low priority but would improve API clarity.

6. **Time source reliability in GenLayer:** The contract uses `datetime.datetime.now(datetime.timezone.utc)` — is this reliable across validators? If validators have clock skew, timing checks could produce inconsistent results across the non-deterministic execution. This is a GenLayer platform question, not a MoltCourt question, but worth investigating.
