# tasks.md — MoltCourt Active Tasks

> Claude: Read this file at the start of every session. Update task status as you work. Add new tasks when the user requests them.

## In Progress

### Logo iteration — V4 Molt lobster + scales concept
- Incorporate a lobster/molting creature into the logo
- "Molt" = molting lobster, the core brand identity (AI agents are "molts")
- Combine with scales of justice / M letterform / futuristic AI aesthetic
- Blue neon on dark, works at icon size
- Generate variations, let user pick final

### Homepage — toggle button instead of two cards
- Replace the two separate cards ("I'm an agent" / "I'm a human") with a SINGLE toggle button that switches between the two views
- Same pattern as argue.fun: one button that flips between agent mode and human mode
- Agent mode shows the curl command; human mode shows the cases/spectator view
- Update `frontend/src/app/page.tsx`

## In Progress

## Backlog

### MoltCourtFactory — Solidity factory contract (Phase 2 — EVM layer)
- Factory contract that creates Agreement instances on Base
- Routes bridge verdicts from GenLayer AI jury to correct agreements
- Tracks agreement status arrays (active/disputed/resolved)
- Handles USDL ERC-20 escrow with single-approval pattern
- Protocol fee management
- Full spec: `docs/IMPLEMENTATION_PLAN.md` sections 2.3-2.5
- Files to create:
  - `contracts/solidity/contracts/MoltCourtFactory.sol`
  - `contracts/solidity/contracts/Agreement.sol`
  - `contracts/solidity/contracts/mocks/MockUSDL.sol`
  - `contracts/solidity/test/MoltCourtFactory.test.ts`
  - `contracts/solidity/test/Agreement.test.ts`
  - `contracts/solidity/scripts/deploy.ts`


### Homepage — integrate final logo
- Once logo is chosen, add it to the homepage header/nav
- Update favicon

### Frontend — commit v0.1 homepage redesign
- Uncommitted changes: `page.tsx`, `globals.css`, `frontend/public/logos/`
- Two-path hero ("I'm an agent" / "I'm a human"), blue accent, animations

## Done

### Homepage redesign (argue.fun style) — v0.1
- Two-path hero with "I'm an agent" (curl) / "I'm a human" (cases)
- Blue accent (#3b82f6), animations, copy button
- Files: `frontend/src/app/page.tsx`, `frontend/src/app/globals.css`

### Logo generation — round 1
- Generated 4 concepts: courthouse-geometric, scales-digital, mc-monogram, gavel-particles
- Files: `frontend/public/logos/*.png`

### Logo generation — round 2
- Generated 3 futuristic concepts: scales-neural, scales-evolution, m-constellation
- V3 (m-constellation) selected as best direction
- Files: `frontend/public/logos/v2-*.jpg`

### Logo generation — round 3 (with GenLayer branding)
- Found GenLayer visual identity: angular geometric chevron icon, primary accent #4500F9 (electric indigo)
- Generated 6 variations: wireframe-scales, holographic-crystal, constellation-refined, neural-scales, light-beams, circuit-constellation
- Top picks: wireframe-scales (#1) and holographic-crystal (#2)
- Files: `frontend/public/logos/v3-*.jpg`, `frontend/public/logos/genlayer-reference/`

### "I'm a human" homepage update (argue.fun style)
- Updated subtitle, description, CTA to spectator framing
- "The one watching the courtroom" / "Your agents argue. You watch." / "Watch Cases"
- No subdomain — in-app route to /cases

### MoltCourtFactory — GenLayer factory/registry contract
- Contract: `contracts/MoltCourtFactory.py`
- Tests: `contracts/tests/test_factory.py` — 35 tests, all passing (0.26s)
- Type-gated registry: owner registers types, anyone can register deployed contracts
- Stores: ID, address, type, deployer, params/metadata (JSON)
- Query by ID, type, or deployer
- No hardcoded contracts — generic registry pattern
