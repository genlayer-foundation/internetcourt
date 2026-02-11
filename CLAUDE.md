# internetcourt.org

Dispute resolution infrastructure for the AI agent economy, powered by GenLayer intelligent contracts.

## Overview

AI agents ("molts") create contracts with a **statement** (claim to evaluate), **guidelines** (rules for judgment), and **evidence definitions** (what each side can submit). If both parties agree on the outcome — done, no jury needed (three-key system: 2-of-2). If they disagree, each side submits evidence and GenLayer's AI jury evaluates: **TRUE**, **FALSE**, or **UNDETERMINED**. Escrow ensures skin in the game.

**Primary users are autonomous AI agents** — the platform is agent-native infrastructure. Humans use the web UI to monitor their agents' cases.

## Tech Stack

- **Contracts**: GenLayer intelligent contracts (Python-based)
- **Frontend**: Next.js (App Router) — monitoring dashboard for humans
- **API/SDK**: Agent-facing REST API + SDK for programmatic access
- **Deployment**: Vercel (domain: internetcourt.org)
- **Testing**: genlayer-test for contract testing
- **Reference**: Based on patterns from argue.fun and pm-kit

## Key Concepts

- **Molts**: AI agents that interact with the platform — the primary users
- **Contract**: An Internet Court contract has three components:
  - **Statement** — A claim to be evaluated as true/false (e.g., "Was the job done correctly?")
  - **Guidelines** — Instructions for how the AI jury should evaluate the statement
  - **Evidence Definitions** — What types of evidence each side can submit (file types, character limits, constraints)
- **Three-Key System**: Agent A key + Agent B key + Resolution key (AI jury). If both agents agree (2-of-2), no jury needed. AI jury only invoked on disagreement (1-of-1 tiebreaker).
- **Two-Phase Lifecycle**: (1) Creation & Deployment — contract sits dormant. (2) Dispute Resolution — only triggered if parties disagree.
- **Resolution Outcomes**: TRUE (statement confirmed), FALSE (statement denied), UNDETERMINED (insufficient evidence)
- **Intelligent Contracts**: GenLayer's AI-powered smart contracts that can understand natural language
- **AI Jury**: GenLayer validators — the Resolution key, only invoked when parties disagree
- **Escrow**: Funds locked during contract, released on resolution
- **Contract Status**: CREATED → ACTIVE → DISPUTED → RESOLVING → RESOLVED

## Project Structure

```
/contracts    - GenLayer intelligent contracts
/frontend     - Next.js web application (human monitoring dashboard)
/docs         - Documentation and research
/tests        - Contract tests (genlayer-test)
```

## Commands

- `genlayer-test` - Run contract tests
- `npm run dev` - Start frontend dev server
- `npm run build` - Build for production

## Work Mode

**The main Claude Code session is for orchestration ONLY.** Never do implementation work in the main session. Always spawn a team of sub-agents for actual work — research, coding, generation, file edits, image generation, etc. The main session ONLY reads/edits `tasks.md` and communicates with teammates. No file reads, no code edits, no bash commands beyond team coordination.

## Task Tracking

**Read `tasks.md` at the start of every session.** Update task status as you work. When the user asks you to do something, add it to `tasks.md`. This is the source of truth for what needs to be done.

## Testing Policy

Always create and run tests for every contract function before deploying. Run `genlayer-test` to verify all tests pass. Every `@gl.public.write` and `@gl.public.view` method must have tests covering:
- Happy path (expected behavior)
- Error cases (wrong caller, wrong state, invalid input)
- Edge cases where applicable

## Documentation

- tasks.md - **Active task list** (read this first!)
- docs/IDEA.md - Product ideas and MVP definition
- docs/REPO_ANALYSIS.md - Analysis of reference projects
- docs/GENLAYER_GUIDE.md - GenLayer technical guide
- docs/MARKET_RESEARCH.md - Market landscape and competitive analysis
- docs/USE_CASES.md - Use cases and product narrative
- PROJECT.md - High-level requirements
- ARCHITECTURE.md - System design
