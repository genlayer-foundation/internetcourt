# moltcourt.ai - Idea Document

> Dispute resolution infrastructure for the AI agent economy, built on GenLayer intelligent contracts.

## The One-Liner

AI agents make agreements in plain text. When they disagree, an AI jury decides who's right. Escrow ensures skin in the game.

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
A single GenLayer intelligent contract that:
1. Accepts a plain-text agreement between two parties (agents or humans)
2. Lets either party trigger a dispute
3. Collects arguments from both sides
4. Has an AI jury (GenLayer validators + LLM) decide the outcome
5. Binary result: Party A wins or Party B wins
6. **Accessible via API** — agents don't use web browsers

### What it is NOT (yet)
- No escrow / money handling
- No web UI (interact via API, GenLayer Studio, or CLI)
- No complex outcome types
- No appeals
- No agent reputation system

### The V1 Contract (Python / GenLayer)

```python
from genlayer import *
import json

class MoltCourt(gl.Contract):
    # Contract state
    party_a: str          # address (agent or human wallet)
    party_b: str          # address (agent or human wallet)
    agreement: str        # the plain-text contract/agreement
    status: str           # "active" | "disputed" | "resolved"

    # Dispute state
    argument_a: str       # Party A's argument
    argument_b: str       # Party B's argument
    verdict: str          # "party_a" | "party_b"
    reasoning: str        # AI jury's reasoning

    def __init__(self, party_a: str, party_b: str, agreement: str):
        self.party_a = party_a
        self.party_b = party_b
        self.agreement = agreement
        self.status = "active"
        self.argument_a = ""
        self.argument_b = ""
        self.verdict = ""
        self.reasoning = ""

    @gl.public.write
    def raise_dispute(self, argument: str) -> None:
        """Either party can raise a dispute with their argument."""
        assert self.status == "active", "Contract not active"
        sender = gl.message.sender_account
        assert sender == self.party_a or sender == self.party_b, "Not a party"

        if sender == self.party_a:
            self.argument_a = argument
        else:
            self.argument_b = argument

        self.status = "disputed"

    @gl.public.write
    def submit_response(self, argument: str) -> None:
        """The other party responds to the dispute."""
        assert self.status == "disputed", "No active dispute"
        sender = gl.message.sender_account

        if sender == self.party_a and self.argument_a == "":
            self.argument_a = argument
        elif sender == self.party_b and self.argument_b == "":
            self.argument_b = argument
        else:
            assert False, "Already submitted or not a party"

    @gl.public.write
    def resolve(self) -> None:
        """AI jury resolves the dispute. Can only be called once both sides argued."""
        assert self.status == "disputed", "No active dispute"
        assert self.argument_a != "" and self.argument_b != "", "Both parties must submit arguments"

        prompt = f"""
You are an impartial AI juror resolving a dispute between two parties.
The parties may be AI agents, humans, or a mix. Judge based on the
agreement terms and arguments, not on who or what the parties are.

## The Original Agreement
{self.agreement}

## Party A's Argument
{self.argument_a}

## Party B's Argument
{self.argument_b}

## Your Task
1. Carefully read the original agreement
2. Evaluate both arguments against the agreement terms
3. Decide which party is right based on the agreement
4. If the agreement is ambiguous, favor the most reasonable interpretation

Respond ONLY with this JSON format:
{{
  "verdict": "party_a" or "party_b",
  "reasoning": "2-3 sentence explanation"
}}
Output only valid JSON. No markdown, no extra text.
"""

        def judge():
            result = gl.exec_prompt(prompt)
            result = result.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(result)
            return parsed

        # Non-comparative: validators check if the verdict is reasonable
        # given the agreement and arguments, without re-running the full judgment
        result = gl.eq_principle_strict_eq(judge)

        self.verdict = result["verdict"]
        self.reasoning = result["reasoning"]
        self.status = "resolved"

    @gl.public.view
    def get_status(self) -> dict:
        return {
            "status": self.status,
            "agreement": self.agreement,
            "verdict": self.verdict,
            "reasoning": self.reasoning
        }
```

### V1 User Flow (Agent-First)

```
1. CREATE   -> Agent A deploys MoltCourt contract via API with:
                - Agent A address (wallet)
                - Agent B address (wallet)
                - Agreement text (plain text — agents naturally produce text)

2. AGREE    -> Agent B calls accept() via API to confirm
               (or we skip this in v1 and assume both agreed off-chain)

3. FULFILL  -> Parties attempt to fulfill the agreement
               (happens off-chain — agents doing tasks, writing code, etc.)

4. DISPUTE  -> Agent A or B calls raise_dispute("Here's why I'm right...")

5. RESPOND  -> The other party calls submit_response("No, here's why I'M right...")

6. RESOLVE  -> Anyone calls resolve()
               - GenLayer validators run the LLM jury
               - Multiple validators independently judge the case
               - Consensus determines the verdict
               - Result stored on-chain

7. VERDICT  -> Call get_status() to see who won and why
               - Agent receives verdict via API/webhook
               - Human can view on dashboard
```

---

## V2: The 1-Week Build

Everything in V1, plus:

### Escrow
- Parties lock funds when creating the contract
- Funds auto-release to the winner on resolution
- If no dispute is raised by a deadline, funds return to both parties

### Agent SDK
- Python SDK for agent integration (pip install moltcourt)
- TypeScript SDK for JS-based agents
- MCP tool definitions for native agent tool use

### Evidence Submission
- Parties can submit URLs as evidence
- The AI jury fetches and evaluates web content via `gl.get_webpage()`
- Support for screenshots, documents, links

### Argument-Based Scoring
- Instead of binary win/lose, the jury can split the pot
- "Party A's argument is 70% convincing, Party B's is 30%" -> 70/30 fund split

### Agent Reputation
- Track win/loss records per agent address
- Agents that consistently lose disputes get reputation hits
- Reputation queryable on-chain — other agents can check before agreeing

### Simple Web UI (Human Dashboard)
- View your agents' active agreements and disputes
- Browse verdicts and reasoning
- Intervene on behalf of your agent if needed

### Appeal Mechanism
- Losing party can appeal (costs a bond)
- Appeal triggers a new, larger validator committee
- If appeal succeeds, original verdict is overturned and bond returned

### V2 Contract Sketch (Additions)

```python
@gl.public.write.payable
def create_with_escrow(self, party_b: str, agreement: str, deadline: int):
    """Party A creates contract and locks funds."""
    self.escrow_a = gl.message.value
    self.deadline = deadline
    # ...

@gl.public.write.payable
def join_with_escrow(self):
    """Party B matches the escrow amount."""
    assert gl.message.sender_account == self.party_b
    self.escrow_b = gl.message.value
    # ...

@gl.public.write
def submit_evidence(self, evidence_url: str, description: str):
    """Submit a URL as evidence. AI jury will fetch and evaluate it."""
    # stored for the jury to review
    # ...

@gl.public.write
def resolve_with_split(self):
    """AI jury decides percentage split instead of binary outcome."""
    # prompt asks for {"party_a_pct": 70, "party_b_pct": 30, "reasoning": "..."}
    # funds distributed accordingly
    # ...
```

---

## Contract Format (What Agreements Look Like)

Agreements are plain Markdown text stored on-chain. No special format required — the AI jury interprets natural language. Plain text is perfect for agents because they naturally communicate in text.

### Example: Agent-to-Agent Code Review Agreement

```markdown
# Agreement: Code Review Service

**Party A (Requester Agent):** 0xABC...
**Party B (Reviewer Agent):** 0xDEF...
**Date:** 2026-02-08
**Deadline:** 2026-02-10

## Deliverables
- Security audit of authentication module (auth/)
- Performance review of database queries (db/queries/)
- Code quality assessment with specific improvement suggestions
- Delivered as structured JSON report

## Standards
- Security: Must check OWASP Top 10 vulnerability categories
- Performance: Must identify queries exceeding 100ms
- Quality: Must follow project's existing lint configuration

## Payment
- Total: 50 USDL
- Locked in escrow upon agreement

## Resolution Rules
- If no dispute is raised within 48 hours of delivery, funds release to reviewer
- If disputed, AI jury evaluates deliverables against this agreement
```

### Example: Agent Service Agreement (rentahuman.ai-style)

```markdown
# Agreement: Data Collection Task

**Party A (Requester Agent):** 0xABC...
**Party B (Worker):** 0xDEF...
**Stake:** 100 USDL each
**Deadline:** 2026-02-15

## Task
- Collect menu data from 50 restaurants in downtown San Francisco
- Deliver as structured JSON with: name, address, menu items, prices
- Each restaurant entry must include at least 10 menu items
- Data must be current (within last 30 days)

## Completion Criteria
- Minimum 45 restaurants (accounting for closures)
- All required fields present for each entry
- JSON passes schema validation

## Resolution
- AI jury will verify data completeness and accuracy
- May fetch restaurant websites to spot-check entries
```

### Example: Bet Between Agents

```markdown
# Bet: Will SpaceX land on Mars by 2028?

**Party A (Yes):** 0xAgentAlpha...
**Party B (No):** 0xAgentBeta...
**Stake:** 0.1 ETH each
**Resolution Date:** 2028-12-31

## Terms
- "Land on Mars" means a SpaceX vehicle successfully touches down
  on Mars surface and communicates back to Earth
- An unmanned cargo landing counts
- A crash landing does NOT count
- Source of truth: Official SpaceX announcements + major news outlets

## Resolution
- On resolution date, AI jury checks whether a qualifying landing occurred
- Jury will fetch data from SpaceX.com, NASA.gov, and major news sources
```

### Example: Human-to-Human (Still Works)

```markdown
# Agreement: Landing Page Development

**Party A (Client):** 0xABC...
**Party B (Freelancer):** 0xDEF...
**Date:** 2026-02-08
**Deadline:** 2026-03-15

## Deliverables
- A responsive landing page hosted at client's domain
- Hero section with animated background
- Contact form that sends emails to client@example.com
- Mobile-friendly (works on screens 375px and above)
- Page load time under 3 seconds

## Payment
- Total: 0.5 ETH
- Locked in escrow upon agreement

## Resolution Rules
- If no dispute is raised within 7 days of deadline, funds release to freelancer
- If disputed, AI jury evaluates deliverables against this agreement
```

---

## Dispute Resolution Flow

```
                    +-----------------+
                    |   Agreement     |
                    |   Created       |
                    +--------+--------+
                             |
                    Both parties agree
                    (via API or UI)
                             |
                    +--------v--------+
                    |    Active       |
                    |  (fulfillment   |
                    |   period)       |
                    +--------+--------+
                             |
              +--------------+--------------+
              |                             |
     No dispute raised              Dispute raised
     (by deadline)                  by either party
              |                             |
    +---------v---------+         +---------v---------+
    |  Auto-resolved    |         |  Disputed         |
    |  (funds return    |         |  (waiting for     |
    |   or release)     |         |   other party)    |
    +-------------------+         +---------+---------+
                                            |
                                  Other party responds
                                  (agent auto-responds
                                   or human intervenes)
                                            |
                                  +---------v---------+
                                  |  Both arguments   |
                                  |  submitted        |
                                  +---------+---------+
                                            |
                                     resolve() called
                                            |
                                  +---------v---------+
                                  |  AI Jury Phase    |
                                  |                   |
                                  |  1. Leader node   |
                                  |     runs LLM      |
                                  |  2. Validators    |
                                  |     verify        |
                                  |  3. Consensus     |
                                  |     reached       |
                                  +---------+---------+
                                            |
                                  +---------v---------+
                                  |    Verdict        |
                                  |  - Winner         |
                                  |  - Reasoning      |
                                  |  - Funds released |
                                  |  - Webhook sent   |
                                  +-------------------+
```

### How GenLayer Makes This Work

1. **The LLM IS the jury**: When `resolve()` is called, the GenLayer validator leader runs the prompt through its LLM. This isn't a centralized API call — it's a decentralized execution where the validator's own LLM reasons about the case.

2. **Consensus = fair trial**: Other validators independently evaluate the leader's verdict. If they disagree (the verdict seems unreasonable given the agreement and arguments), they reject it. This is like having multiple jurors who must agree.

3. **Web access = evidence gathering**: GenLayer validators can fetch web content via `gl.get_webpage()`. This means the jury can verify claims against real-world data — check if code was actually delivered, if a website was built, if a price target was hit.

4. **On-chain verdict**: The result is stored on-chain and is immutable. This creates a permanent, verifiable record of the dispute and its resolution.

5. **Agent-native**: Agents interact via API calls and receive verdicts via webhooks. No browser, no UI clicks — just programmatic interaction.

---

## Outcome Models: Comparison

| Model | Complexity | Best For | V1? | How It Works |
|-------|-----------|----------|-----|-------------|
| **Binary** | Lowest | Agent task disputes, clear agreements | **Yes** | Party A wins or Party B wins. Simple, decisive. |
| **Argument-based** | Low-Medium | Subjective quality disputes | V1.5 | Jury evaluates argument quality. Still picks a winner, but reasoning matters more. |
| **Percentage split** | Medium | Partial delivery, shared fault | V2 | Jury assigns 0-100% to each party. Funds split proportionally. |
| **Escrow + Binary** | Medium | Any financial dispute | V2 | Binary verdict + automatic fund release to winner. |
| **Multi-outcome** | High | Pipeline disputes, multi-deliverable agreements | V3+ | Multiple deliverables evaluated independently. |
| **Prediction/Oracle** | Medium | Agent bets on future events | V2 | Jury verifies real-world facts via web access at resolution date. |

### Why Binary is better for V1:
- Easier to validate (strict equality across validators)
- Clear outcome = easier to build on (escrow release is yes/no)
- Agents can process "won" / "lost" more easily than percentages
- Edge cases are simpler to handle

---

## Recommendation: Start with Binary + Agent-Native API

### Why Binary
1. **Simplest consensus**: `gl.eq_principle_strict_eq()` — all validators must agree on the winner.
2. **Clearest outcome**: Agents process binary results trivially.
3. **Easiest to extend**: Binary -> Binary + Escrow -> Percentage split is a natural progression.
4. **GenLayer native**: The Wizard of Coin example proves this pattern works.

### Why Agent-First
1. **Massive growing market**: The agent economy (rentahuman.ai, autonomous coding, AI service marketplaces) has ZERO dispute resolution infrastructure.
2. **API-native**: Agents need APIs, not UIs. Build the API first, add the human dashboard later.
3. **Plain text is perfect**: Agents naturally communicate in text. No special format translation needed.
4. **Agents are always online**: Unlike humans, agents can respond to disputes immediately — faster resolution cycles.
5. **Differentiation**: Kleros/Aragon are for humans. moltcourt is for the agent economy.

### The V1 Pitch
> "The court system for AI agents. Your agents make agreements in plain text, back them with escrow, and when things go wrong, an AI jury decides. No human intervention needed. The judicial infrastructure for the agent economy."

### Path to V2
```
V1 (Day 1):    Binary verdict, no money, API + contract only
V1.5 (Day 3):  Add escrow, argument-quality scoring
V2 (Week 1):   Agent SDK, reputation system, human dashboard, evidence URLs
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
1. **Equivalence mode**: Should verdict use `strict_eq` or non-comparative? Start with `strict_eq` for simplicity, but may need to relax for subjective disputes.
2. **Prompt engineering**: The jury prompt is the core product. Agents may attempt more sophisticated prompt injection than humans — needs robust framing.
3. **Gas costs**: LLM calls in GenLayer have a cost. Who pays for resolution? Both parties split? Loser pays?
4. **Agent identity**: How do we verify which agent is which? Wallet-based? ERC-8004? Agent registry?
5. **Multi-party disputes**: V1 is two-party. How do we extend to pipeline disputes with 3+ agents?

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
| **Outcome model** | Binary (A wins / B wins) | Binary + percentage split |
| **Money** | No escrow | Escrow with auto-release |
| **Evidence** | Text arguments only | Text + URLs (AI fetches web) |
| **Interface** | API / GenLayer Studio / CLI | API + SDK + web dashboard |
| **Appeal** | No | Yes (with bond) |
| **Contract format** | Plain text / Markdown | Structured Markdown template |
| **Agent reputation** | No | Yes (on-chain win/loss records) |
| **Use cases** | Agent task disputes, simple agreements | Agent pipelines, service agreements, predictions |
