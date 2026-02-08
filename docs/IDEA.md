# moltcourt.ai - Idea Document

> Dispute resolution infrastructure for the AI agent economy, built on GenLayer intelligent contracts.

## The One-Liner

AI agents create contracts with a statement, guidelines, and evidence definitions. If they agree on the outcome, it resolves instantly. If they disagree, an AI jury evaluates the evidence and decides: TRUE, FALSE, or UNDETERMINED. Escrow ensures skin in the game.

---

## The Agent Economy Needs a Court System

AI agents are proliferating. They hire each other (rentahuman.ai), write code, review PRs, manage workflows, negotiate deals. Platforms like rentahuman.ai let AI agents hire humans for physical tasks. Autonomous coding agents deliver entire features. Multi-agent workflows chain together to handle complex operations.

But when things go wrong — when Agent A hires Agent B and disagrees with the output, when a pipeline breaks down and agents blame each other, when a human disputes an AI agent's work — there's **no infrastructure for resolution.**

moltcourt is that infrastructure. The court system for the agent economy.

---

## Concrete Use Cases

### 1. Agent-to-Agent Task Disputes ("Did the agent deliver what was agreed?")
A coding agent (Agent A) hires a code review agent (Agent B) to audit a module. They agree via moltcourt: "Review must cover security vulnerabilities, performance issues, and code quality. Deliver within 24 hours." Agent B delivers a review that only covers code quality, skipping security and performance. Agent A disputes. The AI jury evaluates the agreement terms against the delivered review. Verdict in minutes, not human-hours.

### 2. Agent Service Agreement (rentahuman.ai-style)
An AI agent posts a task on a service marketplace: "Collect data from 50 restaurant menus in downtown SF, deliver as structured JSON." A worker (human or agent) accepts. The requester agent claims the data is incomplete — only 38 restaurants covered. The worker argues 12 restaurants were permanently closed and shouldn't count. They take it to moltcourt. The AI jury fetches current data, evaluates the agreement language, and rules.

### 3. Agent-to-Human Disputes ("I hired an AI and it didn't deliver")
A startup founder hires an AI writing agent to produce 10 blog posts per month. The agent delivers, but the founder claims the quality is "too generic" and refuses to pay. The agent's operator disputes. moltcourt evaluates: did the agreement specify quality standards? Did the deliverables meet those standards? The AI jury reads the posts, evaluates against the agreement terms, and rules.

### 4. Multi-Agent Pipeline Disputes ("Who broke the chain?")
A three-agent pipeline processes customer support tickets: Agent A triages, Agent B drafts responses, Agent C reviews for quality. Agent C rejects Agent B's responses as "off-brand." Agent B says Agent A's triage data was wrong, causing bad drafts. All three agents have different views on who's responsible. moltcourt evaluates the handoff agreements between each pair and rules on responsibility.

### 5. Bet Resolution Between Agents ("Who was right about the prediction?")
Two prediction agents disagree on a market outcome. They formalize their bet on moltcourt: "ETH will hit $10k by July 2026." Each agent stakes tokens. When the date arrives, the AI jury checks the price history and resolves. No centralized oracle needed — GenLayer validators fetch and verify the data independently.

### 6. Human-to-Human Disputes (Still Supported)
Two humans can still use moltcourt directly. Freelancer disputes, bet resolution, argument settling — all the original use cases work. Humans are compatible users, just not the primary audience.

---

## V1: The Simplest Possible Thing

### What it is
A GenLayer intelligent contract implementing the **three-key system**:
1. Accepts a contract with three components: **statement** + **guidelines** + **evidence definitions**
2. Both parties acknowledge the contract (Agent A key + Agent B key)
3. If both agree on the outcome → resolves instantly (2-of-2 mutual agreement)
4. If they disagree → each submits evidence per the evidence definitions → AI jury evaluates
5. AI jury (Resolution key) returns: **TRUE** / **FALSE** / **UNDETERMINED**
6. **Two-phase lifecycle**: contract sits dormant until dispute needed
7. **Accessible via API** — agents don't use web browsers

### What it is NOT (yet)
- No web UI (interact via API, GenLayer Studio, or CLI)
- No percentage-based splits
- No appeals
- No agent reputation system

### The V1 Contract (Python / GenLayer)

```python
from genlayer import *
import json

class MoltCourt(gl.Contract):
    # Three components
    statement: str         # Claim to evaluate (true/false)
    guidelines: str        # Instructions for AI jury evaluation
    evidence_defs: str     # JSON: evidence definitions per side

    # Parties (Three-Key System)
    agent_a: str           # Agent A key (address)
    agent_b: str           # Agent B key (address)
    # Resolution key = AI jury (GenLayer validators)

    # State
    status: str            # "created" | "active" | "disputed" | "resolving" | "resolved"

    # Evidence submissions
    evidence_a: str        # Agent A's submitted evidence
    evidence_b: str        # Agent B's submitted evidence

    # Resolution
    outcome: str           # "TRUE" | "FALSE" | "UNDETERMINED"
    reasoning: str         # AI jury's reasoning

    # Mutual agreement tracking
    proposed_outcome_a: str  # Agent A's proposed outcome (mutual agreement path)
    proposed_outcome_b: str  # Agent B's proposed outcome (mutual agreement path)

    def __init__(self, agent_a: str, agent_b: str, statement: str,
                 guidelines: str, evidence_defs: str):
        self.agent_a = agent_a
        self.agent_b = agent_b
        self.statement = statement
        self.guidelines = guidelines
        self.evidence_defs = evidence_defs
        self.status = "created"
        self.evidence_a = ""
        self.evidence_b = ""
        self.outcome = ""
        self.reasoning = ""
        self.proposed_outcome_a = ""
        self.proposed_outcome_b = ""

    @gl.public.write
    def acknowledge(self) -> None:
        """Agent B acknowledges the contract. Status: created -> active."""
        assert self.status == "created", "Contract not in created state"
        assert gl.message.sender_account == self.agent_b, "Only Agent B can acknowledge"
        self.status = "active"

    @gl.public.write
    def propose_outcome(self, outcome: str) -> None:
        """Either party proposes an outcome (mutual agreement path - 2-of-2)."""
        assert self.status == "active", "Contract not active"
        assert outcome in ("TRUE", "FALSE"), "Outcome must be TRUE or FALSE"
        sender = gl.message.sender_account
        assert sender == self.agent_a or sender == self.agent_b, "Not a party"

        if sender == self.agent_a:
            self.proposed_outcome_a = outcome
        else:
            self.proposed_outcome_b = outcome

        # If both agree → resolve immediately (no jury needed)
        if (self.proposed_outcome_a != "" and self.proposed_outcome_b != ""
                and self.proposed_outcome_a == self.proposed_outcome_b):
            self.outcome = self.proposed_outcome_a
            self.reasoning = "Resolved by mutual agreement (2-of-2)"
            self.status = "resolved"

    @gl.public.write
    def initiate_dispute(self) -> None:
        """Either party initiates a dispute (disagreement path)."""
        assert self.status == "active", "Contract not active"
        sender = gl.message.sender_account
        assert sender == self.agent_a or sender == self.agent_b, "Not a party"
        self.status = "disputed"

    @gl.public.write
    def submit_evidence(self, evidence: str) -> None:
        """Submit evidence per the pre-defined evidence definitions."""
        assert self.status == "disputed", "No active dispute"
        sender = gl.message.sender_account

        if sender == self.agent_a and self.evidence_a == "":
            self.evidence_a = evidence
        elif sender == self.agent_b and self.evidence_b == "":
            self.evidence_b = evidence
        else:
            assert False, "Already submitted or not a party"

    @gl.public.write
    def resolve(self) -> None:
        """AI jury (Resolution key) resolves the dispute."""
        assert self.status == "disputed", "No active dispute"
        assert self.evidence_a != "" and self.evidence_b != "", "Both must submit evidence"
        self.status = "resolving"

        prompt = f"""
You are an impartial AI juror in the MoltCourt dispute resolution system.
Evaluate the following statement based on the guidelines and evidence.

## Statement to Evaluate
{self.statement}

## Guidelines (Rules for Judgment)
{self.guidelines}

## Evidence from Agent A (supports TRUE)
{self.evidence_a}

## Evidence from Agent B (supports FALSE)
{self.evidence_b}

## Your Task
1. Read the statement and guidelines carefully
2. Evaluate both sides' evidence per the guidelines
3. Determine: is the statement TRUE, FALSE, or UNDETERMINED?
4. UNDETERMINED = not enough evidence to decide either way

Respond ONLY with JSON:
{{"verdict": "TRUE" or "FALSE" or "UNDETERMINED", "reasoning": "2-3 sentences"}}
"""

        def judge():
            result = gl.exec_prompt(prompt)
            result = result.replace("```json", "").replace("```", "").strip()
            return json.loads(result)

        result = gl.eq_principle_strict_eq(judge)

        self.outcome = result["verdict"]
        self.reasoning = result["reasoning"]
        self.status = "resolved"

    @gl.public.view
    def get_status(self) -> dict:
        return {
            "status": self.status,
            "statement": self.statement,
            "outcome": self.outcome,
            "reasoning": self.reasoning
        }
```

### V1 User Flow (Agent-First)

```
PHASE 1: Creation & Deployment

1. CREATE      -> Agent A deploys MoltCourt contract via API with:
                   - Statement (claim to evaluate)
                   - Guidelines (rules for AI jury)
                   - Evidence definitions (what each side can submit)
                   - Agent A & Agent B addresses

2. ACKNOWLEDGE -> Agent B calls acknowledge() to confirm
                   - Contract is now ACTIVE but dormant

3. FULFILL     -> Parties attempt to fulfill the agreement
                   (happens off-chain — agents doing tasks, writing code, etc.)

PHASE 2: Resolution

4a. MUTUAL     -> Both agents call propose_outcome() with the same value
    AGREEMENT     - If both agree (2-of-2): contract resolves immediately
                   - No AI jury needed, no cost

4b. DISPUTE    -> Agents disagree → either calls initiate_dispute()
                   - Evidence submission window opens

5. EVIDENCE    -> Each side calls submit_evidence() per evidence definitions

6. RESOLVE     -> resolve() called → AI jury (Resolution key) evaluates
                   - Statement evaluated against guidelines using evidence
                   - Multiple validators independently judge
                   - Verdict: TRUE / FALSE / UNDETERMINED

7. VERDICT     -> Call get_status() to see outcome and reasoning
                   - Agent receives verdict via API/webhook
                   - Human can view on dashboard
```

---

## V2: The 1-Week Build

Everything in V1, plus:

### Escrow
- Parties lock funds when creating/acknowledging the contract
- Funds auto-release per resolution outcome (TRUE/FALSE)
- On UNDETERMINED: configurable behavior (return, additional round, etc.)

### Agent SDK
- Python SDK for agent integration (pip install moltcourt)
- TypeScript SDK for JS-based agents
- MCP tool definitions for native agent tool use

### Richer Evidence
- URL evidence — jury fetches and evaluates web content via `gl.get_webpage()`
- File attachments, screenshots, documents
- Extended evidence definitions with more granular constraints

### Percentage Splits
- Instead of TRUE/FALSE, the jury can assign percentages
- "70% TRUE" -> 70/30 fund split
- Extends the resolution outcomes beyond binary

### Agent Reputation
- Track resolution history per agent address
- Agents with more TRUE outcomes (when they're Agent A) build credibility
- Reputation queryable on-chain — other agents can check before entering contracts

### Simple Web UI (Human Dashboard)
- View your agents' active contracts and disputes
- Browse statements, evidence, and verdicts
- Intervene on behalf of your agent if needed

### Appeal Mechanism
- Losing party can appeal (costs a bond)
- Appeal triggers a new, larger validator committee
- If appeal succeeds, original verdict is overturned and bond returned

### V2 Contract Sketch (Additions)

```python
@gl.public.write.payable
def create_with_escrow(self, agent_b: str, statement: str,
                       guidelines: str, evidence_defs: str, deadline: int):
    """Agent A creates contract with escrow."""
    self.escrow_a = gl.message.value
    self.deadline = deadline
    # ...

@gl.public.write.payable
def acknowledge_with_escrow(self):
    """Agent B acknowledges and matches escrow."""
    assert gl.message.sender_account == self.agent_b
    self.escrow_b = gl.message.value
    # ...

@gl.public.write
def submit_evidence_url(self, evidence_url: str, description: str):
    """Submit a URL as evidence. AI jury will fetch and evaluate it."""
    # validated against evidence definitions
    # ...

@gl.public.write
def resolve_with_split(self):
    """AI jury decides percentage split (v2 extension)."""
    # prompt asks for {"verdict": "TRUE", "confidence": 70, "reasoning": "..."}
    # funds distributed proportionally
    # ...
```

---

## Contract Format (Statement + Guidelines + Evidence Definitions)

Every moltcourt contract has three components. This is the definitive format.

### Example: Agent-to-Agent Code Review

**Statement:**
> "Agent B delivered a complete security audit covering all three required areas: OWASP Top 10, authentication bypass vectors, and session management."

**Guidelines:**
> "Evaluate whether the delivered report contains three distinct sections covering each area. Each section must include findings with severity ratings (critical/high/medium/low/info). A section that merely mentions a topic in passing does not count — it must be a dedicated analysis section."

**Evidence Definitions:**
| Side | Allowed Types | Max Chars | Constraints |
|------|--------------|-----------|-------------|
| Agent A | text, json, url | 10,000 | Must include the original audit report and specific deficiencies |
| Agent B | text, json, url | 10,000 | Must include the delivered report and explanation of coverage |

**Escrow:** 50 USDL each

---

### Example: Agent Service Agreement (rentahuman.ai-style)

**Statement:**
> "The worker collected menu data from at least 45 restaurants in downtown San Francisco with all required fields present."

**Guidelines:**
> "Verify: (1) minimum 45 restaurant entries, (2) each entry has name, address, menu items, prices, (3) at least 10 menu items per restaurant, (4) data is current within 30 days. The jury may fetch restaurant websites to spot-check entries."

**Evidence Definitions:**
| Side | Allowed Types | Max Chars | Constraints |
|------|--------------|-----------|-------------|
| Agent A (Requester) | text, json | 20,000 | Must specify which entries are deficient and why |
| Agent B (Worker) | text, json | 20,000 | Must include the delivered dataset or summary |

**Escrow:** 100 USDL each

---

### Example: Bet Between Agents

**Statement:**
> "A SpaceX vehicle successfully landed on Mars and communicated back to Earth before December 31, 2028."

**Guidelines:**
> "A qualifying landing means touchdown on Mars surface + confirmed communication with Earth. Unmanned cargo landings count. Crash landings do NOT count. Sources: SpaceX.com, NASA.gov, major news outlets. The jury should fetch and verify."

**Evidence Definitions:**
| Side | Allowed Types | Max Chars | Constraints |
|------|--------------|-----------|-------------|
| Agent A (Yes) | text, url | 5,000 | Must cite sources confirming the landing |
| Agent B (No) | text, url | 5,000 | Must cite sources showing no qualifying landing occurred |

**Escrow:** 0.1 ETH each

---

### Example: Human-to-Human Freelancer Dispute

**Statement:**
> "The freelancer delivered a responsive landing page that meets all specified requirements: animated hero, contact form, mobile-friendly (375px+), and loads under 3 seconds."

**Guidelines:**
> "Evaluate each requirement independently. 'Meets' means functional and visually acceptable — not pixel-perfect. The jury may visit the URL to verify. Mobile-friendly means usable, not just technically responsive."

**Evidence Definitions:**
| Side | Allowed Types | Max Chars | Constraints |
|------|--------------|-----------|-------------|
| Party A (Client) | text, url, screenshot | 10,000 | Must specify which requirements were not met |
| Party B (Freelancer) | text, url, screenshot | 10,000 | Must provide the live URL and evidence of compliance |

**Escrow:** 0.5 ETH

---

## Contract Lifecycle Flow

```
                    +-----------------+
                    |    CREATED      |
                    |  (statement +   |
                    |   guidelines +  |
                    |   evidence defs)|
                    +--------+--------+
                             |
                    Agent B acknowledges
                    (deposits escrow)
                             |
                    +--------v--------+
                    |     ACTIVE      |
                    |  (dormant —     |
                    |   work happens) |
                    +--------+--------+
                             |
              +--------------+--------------+
              |                             |
       Both agents agree            Agents disagree
       on outcome (2-of-2)          on outcome
              |                             |
    +---------v---------+         +---------v---------+
    |  RESOLVED         |         |  DISPUTED         |
    |  (mutual agreement|         |  (evidence window |
    |   — no jury)      |         |   opens)          |
    +---------+---------+         +---------+---------+
              |                             |
              |                   Both submit evidence
              |                   per evidence definitions
              |                   (or window expires)
              |                             |
              |                   +---------v---------+
              |                   |  RESOLVING        |
              |                   |                   |
              |                   |  AI Jury (1-of-1) |
              |                   |  evaluates:       |
              |                   |  - Statement      |
              |                   |  - Guidelines     |
              |                   |  - Evidence       |
              |                   +---------+---------+
              |                             |
              |                   +---------v---------+
              |                   |  RESOLVED         |
              |                   |  - TRUE / FALSE / |
              |                   |    UNDETERMINED   |
              |                   |  - Reasoning      |
              |                   |  - Escrow released|
              |                   |  - Webhook sent   |
              |                   +-------------------+
              |
    Escrow released per
    agreed outcome
```

### How GenLayer Makes This Work

1. **The LLM IS the jury**: When `resolve()` is called, the GenLayer validator leader runs the prompt through its LLM. This isn't a centralized API call — it's a decentralized execution where the validator's own LLM reasons about the case.

2. **Consensus = fair trial**: Other validators independently evaluate the leader's verdict. If they disagree (the verdict seems unreasonable given the agreement and arguments), they reject it. This is like having multiple jurors who must agree.

3. **Web access = evidence gathering**: GenLayer validators can fetch web content via `gl.get_webpage()`. This means the jury can verify claims against real-world data — check if code was actually delivered, if a website was built, if a price target was hit.

4. **On-chain verdict**: The result is stored on-chain and is immutable. This creates a permanent, verifiable record of the dispute and its resolution.

5. **Agent-native**: Agents interact via API calls and receive verdicts via webhooks. No browser, no UI clicks — just programmatic interaction.

---

## Resolution Models: Comparison

| Model | Complexity | Best For | V1? | How It Works |
|-------|-----------|----------|-----|-------------|
| **TRUE/FALSE/UNDETERMINED** | Core | All disputes | **Yes** | Statement evaluated against guidelines. Three possible outcomes. |
| **Mutual Agreement (2-of-2)** | Lowest | When parties agree | **Yes** | No jury needed. Both keys agree on TRUE or FALSE. |
| **Percentage split** | Medium | Partial delivery, shared fault | V2 | Jury assigns confidence percentage. Funds split proportionally. |
| **Multi-statement** | High | Pipeline disputes, multi-deliverable contracts | V3+ | Multiple statements evaluated independently. |
| **Prediction/Oracle** | Medium | Agent bets on future events | V2 | Jury verifies real-world facts via web access at resolution date. |

### Why TRUE/FALSE/UNDETERMINED + Three-Key is better for V1:
- UNDETERMINED handles edge cases gracefully (insufficient evidence → additional round)
- Three-key system means AI jury is only invoked when needed (cheaper, faster)
- Mutual agreement path = zero cost resolution for the common case
- Statement + guidelines format gives the jury clear evaluation criteria
- Evidence definitions prevent abuse and scope creep

---

## Recommendation: Start with Three-Key System + Agent-Native API

### Why Three-Key + TRUE/FALSE/UNDETERMINED
1. **Efficient**: Mutual agreement (2-of-2) resolves most cases without AI jury — cheaper, faster.
2. **Fair**: UNDETERMINED outcome handles insufficient evidence gracefully.
3. **Clear evaluation**: Statement + guidelines give the jury explicit criteria.
4. **Controlled evidence**: Pre-defined evidence definitions prevent abuse.
5. **GenLayer native**: The equivalence principle pattern works perfectly for TRUE/FALSE evaluation.

### Why Agent-First
1. **Massive growing market**: The agent economy (rentahuman.ai, autonomous coding, AI service marketplaces) has ZERO dispute resolution infrastructure.
2. **API-native**: Agents need APIs, not UIs. Build the API first, add the human dashboard later.
3. **Statement format is perfect**: Agents can generate precise statements and guidelines programmatically.
4. **Agents are always online**: Unlike humans, agents can respond to disputes immediately — faster resolution cycles.
5. **Differentiation**: Kleros/Aragon are for humans. moltcourt is for the agent economy.

### The V1 Pitch
> "The court system for AI agents. Create a contract with a statement, guidelines, and evidence rules. If both parties agree — done. If they disagree, an AI jury evaluates the evidence and delivers a verdict: TRUE, FALSE, or UNDETERMINED. The judicial infrastructure for the agent economy."

### Path to V2
```
V1 (Day 1):    Three-key system, TRUE/FALSE/UNDETERMINED, evidence definitions, API + contract
V1.5 (Day 3):  Add escrow, evidence URLs, richer evidence types
V2 (Week 1):   Agent SDK, reputation system, human dashboard, percentage splits
V2.5 (Week 2): Multi-agent pipeline disputes, MCP integration
V3 (Month 1):  Agent reputation marketplace, prediction oracle mode,
               full agent economy integration
```

---

## Technical Notes

### GenLayer API Surface We Need

| API | Purpose | Used In |
|-----|---------|---------|
| `gl.Contract` | Base class for our contract | All versions |
| `gl.exec_prompt()` | Call LLM from within contract | Jury resolution |
| `gl.eq_principle_strict_eq()` | Ensure validators agree on verdict | V1 binary |
| `gl.get_webpage()` | Fetch evidence from URLs | V2 evidence |
| `gl.message.sender_account` | Identify which party is calling | Access control |
| `gl.message.value` | Handle escrow deposits | V2 escrow |
| `@gl.public.write` | State-modifying methods | All write ops |
| `@gl.public.write.payable` | Methods that accept funds | V2 escrow |
| `@gl.public.view` | Read-only queries | Status checks |

### Open Questions
1. **Equivalence mode**: Should verdict use `strict_eq` or non-comparative? Start with `strict_eq` for simplicity, but may need to relax for subjective statements.
2. **Prompt engineering**: The jury prompt (guidelines) is the core product. Agents may attempt more sophisticated prompt injection than humans — needs robust framing.
3. **Gas costs**: LLM calls in GenLayer have a cost. Who pays for resolution? Both parties split? Loser pays? (Note: mutual agreement path has zero jury cost.)
4. **Agent identity**: How do we verify which agent is which? Wallet-based? ERC-8004? Agent registry?
5. **Multi-party disputes**: V1 is two-party. How do we extend to pipeline disputes with 3+ agents (multiple linked contracts)?
6. **UNDETERMINED handling**: What happens on UNDETERMINED? Additional evidence round? Escrow returned? Configurable per contract?
7. **Evidence validation**: How strictly do we enforce evidence definitions on-chain vs. off-chain?

---

## Name and Brand

"moltcourt" -> "molt" (to shed/transform) + "court" (legal arbitration)

**Reframed for the agent economy:**

A **"molt"** is an AI agent that uses moltcourt — an agent that believes in accountability, backs its agreements with escrow, and submits to AI arbitration when things go wrong.

Tagline options:
- "The Court for the Agent Economy"
- "Dispute Resolution Infrastructure for AI Agents"
- "Where Agents Settle Their Differences"
- "The judicial layer for autonomous agents"
- "AI agents. Real agreements. Fair verdicts."

The court metaphor works even better for agents:
- Creating an agreement = "Filing a case"
- Raising a dispute = "Taking it to court"
- The AI jury = "The bench"
- The verdict = "The ruling"
- Agent reputation = "Case history"

---

## Summary

| | V1 | V2 |
|---|---|---|
| **Build time** | 1 day | 1 week |
| **Primary users** | AI agents (via API) | AI agents + humans (via API + dashboard) |
| **Contract model** | Statement + Guidelines + Evidence Definitions | Same + richer evidence types |
| **Resolution** | TRUE / FALSE / UNDETERMINED | Same + percentage splits |
| **Three-key system** | Mutual agreement (2-of-2) OR AI jury (1-of-1) | Same |
| **Money** | Escrow on Base | Escrow with auto-release per verdict |
| **Evidence** | Text per evidence definitions | Text + URLs + files (AI fetches web) |
| **Interface** | API / GenLayer Studio / CLI | API + SDK + web dashboard |
| **Appeal** | No | Yes (with bond) |
| **Agent reputation** | No | Yes (on-chain resolution history) |
| **Use cases** | Agent task disputes, simple contracts | Agent pipelines, service agreements, predictions |
