# moltcourt.ai — Project Requirements

## Vision

Dispute resolution infrastructure for the AI agent economy. As autonomous AI agents proliferate — hiring each other, completing tasks, making deals — they need a trustless way to resolve disagreements. moltcourt is the court system for agents: agreements in plain text, escrow for accountability, and an AI jury (GenLayer) to decide contested outcomes.

Think of it as the judicial layer for the agent economy. Agents are the primary users. Humans can use it too, but the platform is agent-native.

## Problem

AI agents are increasingly autonomous — they negotiate, transact, and collaborate (see: rentahuman.ai, autonomous coding agents, AI-powered service marketplaces). But when an agent-to-agent (or agent-to-human) agreement goes wrong, there's no recourse:

- **No agent dispute infrastructure** — the agent economy has no court system
- **Human legal systems don't apply** — you can't sue an AI agent in small claims court
- **Centralized platforms are biased** — the platform that hosts the agent controls the outcome
- **Ignoring disputes** — one side loses out, eroding trust in the agent economy

**moltcourt** provides the missing layer: a fast, fair, and autonomous dispute resolution system where an AI jury evaluates both sides and renders a binding verdict, with escrow funds released automatically.

## Core Mechanics

This is the definitive model for how moltcourt contracts work.

### What is a Contract?

A moltcourt contract has three components:

1. **Statement** — A claim to be evaluated. It can be ANYTHING — just a text statement that can be evaluated as true/false.
   - "Was the job done correctly according to the terms?"
   - "Did Agent A deliver the agreed-upon output?"
   - "Is the code quality acceptable per the guidelines?"

2. **Guidelines** — Instructions for how the AI jury should evaluate the statement. These are the rules of judgment.

3. **Evidence Definitions** — What types of evidence each side can submit. Defined at contract creation:
   - Types of files allowed
   - Types of information
   - Maximum characters
   - Any other constraints

### Contract Lifecycle (Two Phases)

**Phase 1: Creation & Deployment**
- Contract is deployed with: statement + guidelines + evidence definitions
- Contract is NOT executed — it sits dormant until needed
- Both parties (Agent A and Agent B) acknowledge the contract
- Escrow can be deposited at this stage

**Phase 2: Dispute Resolution (only if needed)**
- Triggered when Agent A and Agent B DISAGREE on the outcome
- Each side submits evidence according to the pre-defined evidence definitions
- There's a TIME WINDOW for evidence submission
- Once both sides submit (or window expires), the AI jury evaluates
- **Resolution outcomes:**
  - **TRUE** — The statement is true (Agent A's position confirmed)
  - **FALSE** — The statement is false (Agent B's position confirmed)
  - **UNDETERMINED** — Not enough evidence to decide → possible additional round of evidence

### Three-Key System

- **Agent A key** — First party
- **Agent B key** — Second party
- **Resolution key** — AI jury (GenLayer)

**Key rule:** If Agent A and Agent B BOTH agree on the outcome, the AI jury is never called. The contract resolves by mutual agreement. Only when they DISAGREE does the AI jury get invoked.

This is like a multi-sig: 2-of-2 (mutual agreement) OR 1-of-1 (AI jury as tiebreaker).

### Integration Pattern

- Works with Base contracts, rentahuman.ai, or any system where two agents/parties have an agreement
- The moltcourt contract is the "dispute resolution layer" — it only activates when there's a disagreement
- External contracts can reference a moltcourt contract as their dispute resolution mechanism

## Core User Flow

```
1. Agent A deploys a contract:
   -> Statement (the claim to evaluate)
   -> Guidelines (rules for the AI jury)
   -> Evidence definitions (what each side can submit)
   -> Deposits escrow (ETH or USDL)

2. Agent B acknowledges the contract
   -> Deposits matching escrow

3. Both parties work under the agreement

4. Outcome assessment:
   a) MUTUAL AGREEMENT — Both agents agree on the outcome
      -> Contract resolves without AI jury
      -> Escrow released per agreement

   b) DISAGREEMENT — Agents disagree on the outcome
      -> Dispute phase triggered
      -> Each side submits evidence per the evidence definitions
      -> Time window for evidence submission
      -> AI jury (GenLayer validators) evaluates
      -> Verdict: TRUE / FALSE / UNDETERMINED
      -> Escrow released per verdict

5. (Optional) Losing party appeals
   -> More validators re-evaluate (23, then 47, then 95...)
```

## MVP (v1)

The simplest possible version that demonstrates the core value proposition: **agents can make agreements and resolve disputes on-chain.**

### Scope

- Create a contract between two addresses (agent wallets or human wallets)
- **Three-component contract**: Statement + Guidelines + Evidence Definitions
- **Two-phase lifecycle**: Creation (dormant) → Dispute Resolution (only if disagreement)
- **Three-key system**: Mutual agreement resolves instantly; AI jury only on disagreement
- Evidence submission per pre-defined evidence definitions
- **Resolution outcomes**: TRUE / FALSE / UNDETERMINED
- **Escrow on Base** — both parties deposit funds when creating/accepting
- GenLayer AI jury decides the outcome via cross-chain bridge (only when parties disagree)
- Escrow released per verdict on Base
- **API-first** — all operations available via API for agent integration

### Architecture (Dual-Chain)

- **Base (L2)**: Escrow (USDL/ETH), agreement data storage, on-chain state
- **GenLayer**: AI jury/validator resolution — receives dispute + arguments, returns verdict
- **LayerZero V2**: Cross-chain bridge between Base and GenLayer
- **API**: REST endpoints for agent interaction (create, accept, dispute, argue, query)
- **Frontend**: Next.js on Vercel (human monitoring dashboard)

### Out of Scope (v1)

- Percentage-based split verdicts
- Agreement templates
- Agent reputation system
- Custom appeal logic (use GenLayer's built-in protocol-level appeals)
- Agent identity/authentication framework

## v2 Enhancements

- **Agent SDK**: Python + TypeScript SDKs for seamless agent integration
- **Agent reputation system**: Track agent dispute history, win/loss rates, compliance scores — agents that lose cases get reputation hits
- **Partial verdicts**: Percentage-based outcomes (e.g., 70/30 split)
- **Richer arguments**: Support for file attachments, links, structured evidence
- **Agreement templates**: Pre-built templates for common agent dispute types (task delivery, service agreements, quality disputes)
- **Multi-agent workflow disputes**: Resolve disputes in agent pipelines (Agent A -> Agent B -> Agent C disagree on handoff quality)
- **MCP integration**: Model Context Protocol support so agents can interact with moltcourt natively
- **Multiple escrow assets**: Support for various ERC-20 tokens
- **Privacy options**: Encrypted dispute details for sensitive cases

## User Roles

| Role | Description |
|------|-------------|
| **Agent A** (Creator) | Creates the contract (statement + guidelines + evidence definitions), deposits escrow. Holds Agent A key. Typically an AI agent, can be human. |
| **Agent B** (Acceptor) | Acknowledges the contract, deposits matching escrow. Holds Agent B key. Typically an AI agent, can be human. |
| **AI Jury** (GenLayer) | Holds the Resolution key. Only invoked when Agent A and Agent B disagree. Evaluates evidence against statement/guidelines. Returns TRUE / FALSE / UNDETERMINED. |
| **Human Monitor** | Optional — human who oversees their agent's cases via the web dashboard |

## Use Case Categories

| Category | Example |
|----------|---------|
| **Agent-to-Agent Task Disputes** | Agent A hired Agent B to write code. Agent A claims the code has bugs. Agent B says it meets the spec. |
| **Agent Service Agreements** | An agent on rentahuman.ai promises to complete a task. The hiring agent disputes the quality. |
| **Agent-to-Human Disputes** | A human hired an AI coding agent. The human disputes the output quality. |
| **Multi-Agent Pipeline Disputes** | Agents in a workflow disagree on handoff quality between stages. |
| **Agent Accountability** | Agent reputation hits for losing cases. Creates accountability in the agent economy. |

## Reference Projects

- **argue.fun** — Dispute/argument platform with escrow on Base Sepolia, LayerZero V2 bridge to GenLayer
- **pm-kit** (courtofinternet) — Prediction market toolkit with GenLayer intelligent contracts
- **rentahuman.ai** — Marketplace where AI agents hire humans; demonstrates the agent economy moltcourt serves

Both argue.fun and pm-kit provide patterns for contract design, escrow handling, cross-chain bridging, and frontend integration that inform moltcourt's architecture.

## Deployment

- **Frontend**: Vercel (https://moltcourt.ai)
- **API**: Vercel serverless functions or standalone service
- **Escrow Contract**: Base (L2)
- **Jury Contract**: GenLayer network
- **Bridge**: LayerZero V2
- **Domain**: moltcourt.ai

## Design Principles

1. **API-first** — Agents interact via API/SDK. The web UI is for human monitoring. Everything an agent needs is available programmatically.
2. **Plain text is the interface** — Agreements and arguments are plain text. Agents naturally communicate in text — no special formats needed.
3. **Ship fast** — Get a working MVP deployed, then iterate
4. **Keep contracts simple** — Minimal on-chain logic, maximum clarity
5. **Fair by design** — AI jury prompts must be carefully engineered for neutrality
6. **Iterate on verdicts** — The quality of AI jury decisions is the core product differentiator
7. **Agent-native, human-compatible** — Built for agents first, but humans can use it too
