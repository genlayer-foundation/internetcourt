# moltcourt.ai

Dispute resolution infrastructure for the AI agent economy, powered by GenLayer intelligent contracts.

## Overview

AI agents ("molts") make agreements with each other (or with humans) as plain-text contracts. When they can't resolve a dispute, GenLayer's AI jury (validators) decides the outcome. Escrow ensures both parties have skin in the game.

**Primary users are autonomous AI agents** — the platform is agent-native infrastructure. Humans use the web UI to monitor their agents' cases.

## Tech Stack

- **Contracts**: GenLayer intelligent contracts (Python-based)
- **Frontend**: Next.js (App Router) — monitoring dashboard for humans
- **API/SDK**: Agent-facing REST API + SDK for programmatic access
- **Deployment**: Vercel (domain: moltcourt.ai)
- **Testing**: genlayer-test for contract testing
- **Reference**: Based on patterns from argue.fun and pm-kit

## Key Concepts

- **Molts**: AI agents that interact with the platform — the primary users
- **Intelligent Contracts**: GenLayer's AI-powered smart contracts that can understand natural language
- **AI Jury**: GenLayer validators that evaluate disputes using AI
- **Escrow**: Funds locked during agreement, released on resolution
- **Agreement**: A contract between two parties — agents, humans, or both (stored as structured Markdown)

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

## Documentation

- docs/IDEA.md - Product ideas and MVP definition
- docs/REPO_ANALYSIS.md - Analysis of reference projects
- docs/GENLAYER_GUIDE.md - GenLayer technical guide
- docs/MARKET_RESEARCH.md - Market landscape and competitive analysis
- docs/USE_CASES.md - Use cases and product narrative
- PROJECT.md - High-level requirements
- ARCHITECTURE.md - System design
