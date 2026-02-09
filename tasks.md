# tasks.md — MoltCourt Active Tasks

> Claude: Read this file at the start of every session. Update task status as you work. Add new tasks when the user requests them.

## In Progress

### Implement factory improvements — pagination, find by party, migration/export/import
- Add pagination to factory queries (offset/limit pattern)
- Add find-by-party-address lookup
- Add migration/export/import methods for factory data
- Full spec: `docs/FACTORY_IMPROVEMENTS.md`

### Implement min_dispute_period_seconds — timing parameter
- Add minimum dispute period enforcement from timing research
- See `docs/TIMING_RESEARCH.md` for patterns (Kleros, UMA, Aragon, Optimism)

### Connect Vercel to GitHub for auto-deploy
- Needs manual GitHub permissions grant for genlayer-foundation/moltcourt repo
- Currently deploying manually via Vercel CLI

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

### Create page — inline contract code as string constant
- Currently reads contract code from disk, breaks on Vercel
- Inline the contract code as a string constant for Vercel compatibility

### Set up Vercel environment variables via dashboard
- NEXT_PUBLIC_COURT_FACTORY_ADDRESS
- NEXT_PUBLIC_GENLAYER_RPC

## Done

### Homepage timeline redesign — merged steps, evidence examples, verdict pills
- Merged Jury Resolution + Verdict into single timeline step
- Added evidence examples per case type
- Animated consensus removed in favor of clean text + verdict pills

### GSAP ScrollTrigger animations
- Timeline draw on scroll
- Parallax orb effect
- Staggered reveals

### Latest Cases section — real contract data
- Replaces CTA section on homepage
- Fetches real contracts from GenLayer API via genlayer-js SDK

### Logo/header fix — unoptimized prop
- Added `unoptimized` prop to Next.js Image component

### Visual fixes — Guidelines box, pills, RotatingText
- Guidelines box height (min-h-[11em])
- "if disputed" pill opacity fix
- RotatingText text-left alignment

### HeroToggle redesign — argue.fun style
- Toggle button with numbered steps
- min-width for consistent sizing
- Removed skill.md pill

### Cases page — fetch timeout
- Added 15s client timeout, 10s RPC timeout to prevent infinite loading

### Create page — wired up with real deployment
- Full deployment via genlayer-js SDK
- Factory registration
- Evidence deadline field added

### API fix — replaced broken RPC with genlayer-js SDK
- Replaced broken `call_contract_function` RPC with genlayer-js SDK
- Fixed factory method names

### skill.md 404 fix
- Removed conflicting route.ts
- Now served from public/

### resolve() — prompt_non_comparative for multi-LLM support
- Switched from strict_eq to prompt_non_comparative
- Works across 5 different LLMs on studionet (GPT-5.1, Gemini 3, Grok 4, Claude Sonnet 4.5, DeepSeek V3.2)

### str→Address conversion fix for studionet
- JS SDK sends Address args as hex strings, not bytes
- Contract __init__ now handles both bytes and str conversion

### Contract headers added
- `# v0.1.0` and `# { "Depends": "py-genlayer:latest" }` headers
- Fixes `absent_runner_comment` error on studionet

### 194 unit tests — full method coverage
- 14 new tests added for complete coverage
- All 194 tests passing

### Studionet deployment — factory + full lifecycle
- Factory deployed: `0xAA55c2768855A483b5D8C8926585Cdb940207898`
- Full lifecycle tested — unanimous AI jury verdict (TRUE) in ~2 minutes with 5 LLMs
- Integration test scripts: deploy-and-test.mjs, test-prime-dispute.mjs

### skill.md — complete rewrite
- CLI-first approach with genlayer CLI as primary method
- Wallet setup, no-gas clarification
- Agent quick-start / onboarding flow

### genlayer.md — comprehensive GenLayer skill file
- 1,150-line reference with all learnings from development

### docs/TIMING_RESEARCH.md — dispute timing patterns
- Research on Kleros, UMA, Aragon, Optimism timing models

### docs/FACTORY_IMPROVEMENTS.md — factory enhancement spec
- Pagination, find by party, migration/import, export methods

### Testing policy added to CLAUDE.md
- Every public method must have tests (happy path, error cases, edge cases)

### GitHub Actions CI fixed
- Node 22, lint fixes
- Pipeline green

### Vercel deployment working
- Manual deployment via CLI
- Auto-deploy pending GitHub integration

### Repo moved to genlayer-foundation/moltcourt
- New home under the GenLayer Foundation org

### Logo iteration — V4 Molt lobster + scales concept
- v7-favicon-4 selected as final
- Set as favicon + header logo

### Homepage — toggle button instead of two cards
- argue.fun style toggle with min-width
- Numbered steps
- Agent mode / Human mode switch

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

### Frontend — commit v0.1 homepage redesign
- Committed: `page.tsx`, `globals.css`, `frontend/public/logos/`
- Two-path hero, blue accent, animations
