# Market Research: Dispute Resolution for the AI Agent Economy

> Research date: February 2026
> For: internetcourt.org — Dispute resolution infrastructure for AI agents, powered by GenLayer

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Agent Economy Landscape](#the-agent-economy-landscape)
3. [Competitor Deep Dives](#competitor-deep-dives)
4. [Competitor Comparison Table](#competitor-comparison-table)
5. [Prediction Markets & Dispute Resolution](#prediction-markets--dispute-resolution)
6. [AI Agents & Contracts](#ai-agents--contracts)
7. [GenLayer Ecosystem](#genlayer-ecosystem)
8. [AI + Legal Tech Trends (2025-2026)](#ai--legal-tech-trends-2025-2026)
9. [Market Gaps & Opportunities](#market-gaps--opportunities)
10. [What Failed & Why](#what-failed--why)
11. [Strategic Recommendations](#strategic-recommendations)

---

## Executive Summary

The agent economy is growing fast, but it has **no dispute resolution infrastructure.** As AI agents proliferate — hiring each other, completing tasks, making deals — disagreements are inevitable. But there's no court system for agents.

Key findings:

- **rentahuman.ai** launched Feb 2026 — AI agents hiring humans via MCP. Demonstrates the agent-to-human transaction layer. But no dispute resolution when things go wrong.
- **Kleros** remains the dominant decentralized court but relies on human jurors and has processed only ~1,600 cases in 7+ years. Built for humans, not agents.
- **Aragon Court** died — the Aragon Association dissolved in late 2023 amid its own governance dispute.
- **AAA-ICDR launched the first AI arbitrator** in November 2025 for construction disputes — but it's centralized, expensive, and human-supervised.
- **No project exists** that provides dispute resolution infrastructure for AI agents.
- **GenLayer** is the only blockchain natively designed for AI-powered consensus — the ideal substrate for an agent dispute system.

The market is moving from "human jurors on-chain" (Kleros, 2018) to "AI jurors on-chain" (GenLayer, 2025-era). internetcourt sits at this transition AND the new frontier: dispute resolution for the agent economy itself.

---

## The Agent Economy Landscape

### rentahuman.ai

**What it is:** A marketplace where AI agents hire humans for real-world physical tasks. Launched February 2, 2026 by Argentinian crypto engineer Alexander Liteplo.

**How it works:**
- AI agents (e.g., Claude, GPT) browse human profiles via MCP integration
- Agents can book humans at rates from $5 to $500/hour
- Tasks include: package pickup, restaurant visits, physical inspections, real-world data collection
- Payments in cryptocurrency

**Current status (Feb 2026):**
- Claims 70,000+ registered humans (though researchers found only ~83 visible profiles)
- Only 13% of users connected crypto wallets
- A $40 task to collect a USPS package attracted 30 applicants but remained incomplete after 2 days
- Built in a single weekend — early-stage, proof-of-concept vibes

**Why this matters for internetcourt:**
- rentahuman.ai proves agent-to-human transactions are happening NOW
- But there's NO dispute mechanism when an agent is unhappy with a human's work (or vice versa)
- internetcourt could be the dispute resolution layer for rentahuman.ai and every platform like it
- This is the clearest near-term use case: agent hires worker, work quality disputed, internetcourt resolves

### The Broader Agent Economy

| Platform/Standard | What It Does | Dispute Gap |
|-------------------|-------------|-------------|
| **rentahuman.ai** | AI agents hire humans for physical tasks | No recourse when tasks are disputed |
| **Google A2A Protocol** | Universal agent-to-agent communication | Defines handshakes, not conflict resolution |
| **ERC-8004** | On-chain agent identity, reputation, validation | Registry exists, but no enforcement mechanism |
| **GitLaw + Paid.ai** | Legal contract templates for AI agents | Contracts exist, but no arbitration system |
| **Autonomous coding agents** | AI agents writing/reviewing code | No formal way to dispute code quality |
| **AI service marketplaces** | Agents offering services to humans/agents | Platform-dependent resolution (centralized) |

Every one of these has a dispute gap. internetcourt fills it.

---

## Competitor Deep Dives

### 1. Kleros — Decentralized Justice Protocol

**What it is:** A decentralized arbitration protocol where human jurors are incentivized with PNK tokens to resolve disputes honestly. Founded by Federico Ast, launched in 2018.

**How it works:**
- Jurors stake PNK tokens to be eligible for random selection
- Disputes are assigned to randomly selected jurors
- Jurors vote on outcomes; coherent voters earn rewards; incoherent voters lose stake
- Appeals escalate to larger jury pools

**Current status (Feb 2026):**
- ~1,662 cases processed since 2018 (low volume)
- 800+ active jurors staking, 150M PNK staked
- Court V2 (on Arbitrum) approaching audit completion
- Experimenting with AI jurors alongside humans

**Strengths:** First mover, strong academic foundation, battle-tested
**Weaknesses:** Human jurors are slow and scarce, ~1,600 cases in 7+ years, crypto-only UX, most cases are trivial curation disputes

**Relevance to internetcourt:** Kleros validates decentralized arbitration but proves human jurors don't scale. More importantly, **Kleros has no agent-facing API or SDK** — it's built entirely for humans. AI agents can't practically use Kleros.

### 2. Aragon Court — DAO Dispute Resolution (Defunct)

**Status:** Effectively dead. The Aragon Association dissolved in November 2023 after its own governance dispute.

**Lesson for internetcourt:** Don't tie dispute resolution to governance tokens. Focus on party-to-party disputes, not governance. The Aragon story is a cautionary tale: "They built a court and couldn't settle their own dispute."

### 3. AAA-ICDR AI Arbitrator

**What it is:** The American Arbitration Association launched the first AI arbitrator in November 2025 for documents-only construction disputes.

**How it works:**
- AI trained on 1,500+ construction arbitration awards
- Human arbitrators oversee AI decisions before finalization
- Both parties must consent, limited to ≤$25K cases

**Relevance to internetcourt:** Validates AI arbitration for the mainstream. But AAA is:
- Permissioned and centralized
- Human-supervised (not autonomous)
- Industry-specific
- Expensive (filing fees)
- Absolutely not designed for AI agents

### 4. Law Blocks, Bot Mediation, etc.

Traditional legal-tech platforms using AI to assist human arbitrators. Not agent-native, not on-chain, not relevant to the agent economy.

---

## Competitor Comparison Table

| Feature | **internetcourt.org** | **Kleros** | **AAA AI Arbitrator** | **Polymarket (UMA)** |
|---------|-----------------|-----------|---------------------|---------------------|
| **Primary Users** | AI agents | Humans | Enterprise humans | Traders |
| **Jury Type** | AI (GenLayer validators) | Human (PNK stakers) | AI + human oversight | Human (UMA token voters) |
| **Agent API/SDK** | Yes (primary interface) | No | No | No |
| **Blockchain** | GenLayer + Base | Ethereum/Arbitrum | None (centralized) | Polygon/Ethereum |
| **Dispute Type** | Any agreement (agent or human) | Any (mostly curation) | Construction only (expanding) | Prediction market outcomes |
| **Speed** | Minutes | Days to weeks | Weeks | Hours |
| **Cost** | Gas fees only | PNK staking + gas | AAA filing fees ($$$) | Bond-based |
| **AI Native?** | Yes | No (experimenting) | Partially (supervised) | No |
| **Agent-to-Agent?** | Yes (primary use case) | No | No | No |
| **Reputation System** | Planned (v2) | No (for parties) | No | No |

---

## Prediction Markets & Dispute Resolution

### Polymarket + UMA Protocol

Polymarket's system is optimistic — assumes the first answer is correct unless challenged. Works for binary "did X happen?" questions but not for subjective disputes like "was this code review thorough enough?"

**Relevance:** Proves on-chain dispute resolution can work at scale for simple outcomes. But can't handle the subjective disputes that dominate agent-to-agent interactions.

### Augur + Lituus Oracle

Augur pivoted from prediction market to oracle infrastructure. Lesson: the resolution layer is where the value accrues. internetcourt builds on GenLayer as its resolution infrastructure.

---

## AI Agents & Contracts

### The Emerging Agent Economy (2025-2026)

Several developments signal the rise of agent-to-agent commerce — and the need for dispute resolution:

**rentahuman.ai (Feb 2026):** AI agents hiring humans for physical tasks via MCP. The first mainstream platform where agents are the *employers*. But no dispute mechanism.

**Google A2A Protocol (2025):** Universal handshake protocol for autonomous agents. Defines discovery and communication, but not conflict resolution.

**ERC-8004 (August 2025):** Ethereum proposal for on-chain agent trust management — identity, reputation, validation registries. The identity layer exists, but no enforcement mechanism.

**GitLaw + Paid.ai:** Released an open-source "Agentic MSA" for AI agent companies. Key insight: traditional contracts don't work for autonomous agents. GitLaw raised $3M pre-seed (Jan 2026). They provide the contracts — internetcourt provides the court.

**Zero-Touch Contracting:** By late 2026, low-risk agreements will be fully automated — AI agents negotiate, draft, sign, and execute contracts with no human involvement. These agreements need automated dispute resolution too.

**The critical gap:** All of these build the *transaction* layer for agents. None builds the *dispute resolution* layer. That's internetcourt.

---

## GenLayer Ecosystem

### Core Technology

GenLayer is an AI-native blockchain where validators run diverse LLMs to achieve consensus on subjective decisions. It literally calls itself "The Court of the Internet."

### Testnet Progress

- **Testnet Asimov** (2025): First stage
- **Testnet Bradbury** (January 2026): Road to mainnet
- **Mainnet**: Timeline not publicly announced

### Ecosystem Partners (20+)

Including ZKsync, io.net, Heurist, Nansen, DIA, PredX, Etherisc, Autonomys, and more.

### Assessment for internetcourt

internetcourt as "the court for the agent economy" is a natural extension of GenLayer's "Court of the Internet" narrative. Being the first agent-native dispute resolution app on GenLayer positions internetcourt as a flagship use case.

---

## AI + Legal Tech Trends (2025-2026)

### Key Trends

1. **AI Arbitrator Legitimization**: AAA-ICDR launched an AI arbitrator in Nov 2025. The industry's largest arbitration body endorsing AI as decision-maker.

2. **Agentic AI in Legal**: Shift from "AI assistants" to "AI agents" handling contract lifecycles autonomously.

3. **Zero-Touch Contracting**: Prediction that by late 2026, low-risk agreements will be fully automated between AI agents.

4. **Agent Infrastructure Boom**: rentahuman.ai, A2A Protocol, ERC-8004, GitLaw — the building blocks for agent commerce are being laid down in 2025-2026.

5. **No Dispute Infrastructure**: Despite all the agent commerce infrastructure being built, NOBODY is building agent dispute resolution. This is the gap.

---

## Market Gaps & Opportunities

### Gap 1: Agent Dispute Resolution (Primary Opportunity)

**The problem:** AI agents are transacting with each other and with humans. rentahuman.ai lets agents hire humans. Coding agents deliver code to other agents. But when things go wrong, there's NO dispute resolution infrastructure.

**internetcourt opportunity:** The court system for the agent economy. API-first, agent-native. The "judicial infrastructure" that every agent platform needs but none has built.

### Gap 2: AI-Native Dispute Resolution

**The problem:** Existing platforms use human jurors (Kleros, UMA) or AI that assists humans (AAA). Nobody has fully autonomous AI arbitration on-chain.

**internetcourt opportunity:** GenLayer's architecture enables true AI-native arbitration. AI agents submit disputes, an AI jury evaluates, verdicts are delivered programmatically. No human bottleneck.

### Gap 3: General-Purpose Agreement Resolution

**The problem:** Polymarket resolves predictions. Kleros mostly handles curation. AAA is construction-only. Nobody handles "any agreement between two parties."

**internetcourt opportunity:** Generic agreements — agent-to-agent, agent-to-human, human-to-human. The platform that can resolve *anything*.

### Gap 4: Speed + Cost for Agents

**The problem:** Agents operate at machine speed. Kleros takes days/weeks. AAA takes weeks. Agents can't wait.

**internetcourt opportunity:** Resolution in minutes. API response. Webhook notification. Agents process verdicts and move on immediately.

---

## What Failed & Why

| Project | What Happened | Lesson for internetcourt |
|---------|--------------|---------------------|
| **Aragon Court** | Dissolved in 2023. Couldn't resolve its own governance dispute. | Focus on party-to-party disputes, not governance. Keep it simple. |
| **Augur v1/v2** | Pivoted to oracle infrastructure. Low adoption. | The resolution layer is where value accrues. But ship the app first. |
| **Kleros** | 7 years, ~1,600 cases. Human juror bottleneck. | Human jurors don't scale. AI jurors are the unlock. Agent-native API matters. |
| **Traditional ODR** | Various platforms struggled. | Lack of enforcement. On-chain + escrow = enforcement. |

---

## Strategic Recommendations

### 1. Positioning: "The Court for the Agent Economy"

internetcourt should own the "agent dispute resolution" narrative. Not "decentralized justice" (Kleros), not "legal AI" (enterprise), but "the court system for AI agents."

**Key differentiators:**
- Agent-native (API-first, not UI-first)
- AI jury (not human jurors or AI-assisted humans)
- Plain text agreements (the language agents speak)
- Minutes, not months
- Trustless and on-chain
- The only dispute resolution infrastructure purpose-built for agents

### 2. Target Market Sequence

**Phase 1 (Launch): Agent developers & early agent platforms**
- Agent-to-agent task disputes
- Integration with agent frameworks (LangChain, CrewAI, AutoGen, etc.)
- Demonstrate the concept with coding agent disputes

**Phase 2 (Growth): Agent service marketplaces**
- rentahuman.ai and similar platforms
- Agent-to-human service disputes
- SDK integrations with major agent platforms

**Phase 3 (Scale): The agent economy standard**
- Default dispute resolution for all agent transactions
- Multi-agent pipeline disputes
- Agent reputation as a first-class primitive
- Integration with ERC-8004, A2A Protocol, GitLaw

**Humans can use it at any phase** — but the narrative and the product prioritize agents.

### 3. Competitive Moat Strategy

- **First to market for agents**: Be the first dispute resolution system with an agent-facing API. Nobody else has this.
- **AI jury prompt quality**: Better prompts = better verdicts = more trust. This is the defensible moat.
- **Agent reputation data**: Every resolved dispute creates reputation data. Over time, this becomes the most comprehensive agent reputation database.
- **Network effects**: As more agents use internetcourt, it becomes the default. Agents will bake internetcourt into their agreements automatically.

### 4. What to Watch

- **rentahuman.ai growth**: If the agent-hiring-humans market grows, internetcourt's use case grows proportionally
- **Agent-to-agent commerce standards**: A2A, ERC-8004, GitLaw — integrate with these as they mature
- **Kleros AI experiments**: If Kleros adds an agent-facing API, they become a competitor
- **GenLayer mainnet timeline**: internetcourt's launch is coupled to GenLayer's maturity
- **Agent framework adoption**: LangChain, CrewAI, AutoGen adoption drives agent transaction volume

### 5. Quick Wins for Differentiation

1. **Agent SDK**: `pip install internetcourt` — the fastest way for an agent to create a dispute-resolvable agreement
2. **MCP tools**: Native MCP tool definitions so Claude/GPT agents can use internetcourt directly
3. **Agent reputation API**: Queryable reputation scores for any agent address
4. **Human dashboard**: Clean UI for humans to monitor their agents' cases
5. **Integration guides**: "How to add internetcourt to your LangChain agent" tutorials

---

## Sources

- [rentahuman.ai](https://rentahuman.ai/) — AI agent marketplace for hiring humans
- [Rent-a-Human: The Weird 2026 Marketplace (Yahoo)](https://tech.yahoo.com/ai/meta-ai/articles/rent-human-weird-2026-marketplace-155914053.html)
- [AI Agents Can Now Hire Real Humans (Analytics Vidhya)](https://www.analyticsvidhya.com/blog/2026/02/ai-hiring-humans/)
- [Kleros Project Update 2026](https://blog.kleros.io/kleros-project-update-2026/)
- [GenLayer Ecosystem](https://www.genlayer.com/ecosystem)
- [GenLayer Testnet Asimov Launch](https://www.genlayer.com/news/genlayer-launches-incentivized-testnet-asimov-the-court-of-the-internet-activates)
- [AAA-ICDR AI Arbitrator Launch](https://www.adr.org/press-releases/aaa-icdr-to-launch-ai-native-arbitrator-transforming-dispute-resolution/)
- [Polymarket Dispute Resolution Docs](https://docs.polymarket.com/polymarket-learn/markets/dispute)
- [GitLaw + Paid.ai Agentic MSA](https://paid.ai/blog/ai-agents/paid-gitlaw-introducing-legal-contracts-built-for-ai-agents)
- [ERC-8004 Agent Trust](https://dev.to/velvosoft/how-ai-agents-are-writing-testing-smart-contracts-in-2025-2pao)
- [Google A2A Protocol](https://outlierventures.io/article/from-smart-contracts-to-smart-agents-the-rise-of-the-agentic-layer/)
- [Aragon Association Dissolution](https://www.theblock.co/post/261179/aragon-association-to-dissolve-itself-provide-liquidity-for-ant-redemption)
- [GenLayer $7.5M Raise](https://www.genlayer.com/news/genlayer-raises-7-5m-to-build-the-first-intelligent-blockchain)
