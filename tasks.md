# tasks.md — InternetCourt Active Tasks

> Claude: Read this file at the start of every session. Update task status as you work. Add new tasks when the user requests them.

## In Progress

### Frontend Performance — Remove Aggressive Caching + Optimize Data Fetching
- Reduce localStorage TTL from 10min → 2min
- Add Cache-Control: no-store to API responses
- Remove/reduce 2-min in-memory server cache
- Parallelize Base + GenLayer fetches (currently sequential)
- Batch sequential RPC calls with Promise.all()
- Add timeouts to GenLayer RPC calls
- Add refresh button to cases page
- Include verdict in list API to eliminate N+1 fetches
- Status: In progress

### Fix Bridge Structural Issues + Clean Redeploy
- Phase 1: Code fixes (centralize addresses in deployments.json, delete stale files, add relay persistence)
- Phase 2: Clean deploy (BridgeSender → Factory → Receiver → Forwarder → Configure → E2E)
- Phase 3: Lock down (commit final addresses, update Vercel, verify frontend)
- Status: Phase 1 in progress

### Implement factory improvements — pagination, find by party, migration/export/import
- Add pagination to factory queries (offset/limit pattern)
- Add find-by-party-address lookup
- Add migration/export/import methods for factory data
- Full spec: `docs/FACTORY_IMPROVEMENTS.md`

### Implement min_dispute_period_seconds — timing parameter
- Add minimum dispute period enforcement from timing research
- See `docs/TIMING_RESEARCH.md` for patterns (Kleros, UMA, Aragon, Optimism)

## Backlog

### Create page — inline contract code as string constant
- Currently reads contract code from disk, breaks on Vercel
- Inline the contract code as a string constant for Vercel compatibility

### Set up Vercel environment variables via dashboard
- NEXT_PUBLIC_COURT_FACTORY_ADDRESS
- NEXT_PUBLIC_GENLAYER_RPC
- Currently bypassed — factory address hardcoded in source. NEXT_PUBLIC_COURT_FACTORY_ADDRESS still points to old factory in Vercel dashboard.

## Done

### Fix skill.md — rewrite from CLI-first to SDK-first
- Rewrote skill.md to use genlayer-js SDK as primary method
- Removed all CLI-first instructions (genlayer CLI v0.4.0 doesn't support deploy/write/call)
- Added full Quick Start with SDK examples, factory registration, lifecycle walkthrough
- Factory address: `0x9D6e760B5ebE7953aEB73cc5868D18e5bA80f1AE` (correct for current deployment)

### Fresh Deploy — Both Chains from Scratch
- GenLayer factory: `0x9D6e760B5ebE7953aEB73cc5868D18e5bA80f1AE` (studionet)
- Base factory: `0xED498a92b97C2962E71Dd764D10Fcce77dF83b5E` (Base Sepolia)
- MockUSDC: `0x1185DA4da4DB96016BA7Cf93ee91F6D199FB25A3`
- DeploymentBlock: `37666090`
- Updated 26+ files, created deploy-factory.mjs
- Swarm review fixed: LayerZero EIDs, enum label bug, stale addresses, doc refs
- Frontend build verified, both factories verified (count=0, types registered)
- Commit: `b9659a0` on `feat/bridge-deploy`

### Fresh Deploy + Comprehensive E2E Test (11 Lifecycle Cases)
- Deployed fresh MockUSDC + InternetCourtFactory to Base Sepolia
- Factory: `0x72b7544EeA6c81b434b3DD255f3EE29cC6Ca5231`, USDC: `0x852E780CBAB7fa5f88B24e51D2e6D32959DD15dF`
- Updated addresses in 8 files (scripts, frontend, bridge, MCP)
- Created comprehensive E2E script testing all 11 Agreement lifecycle paths
- All 11 cases passed: cancel, deadline expiry, mutual TRUE/FALSE, confirm, bridge TRUE/FALSE/UNDETERMINED, default judgment (none/initiator/non-initiator)
- Each case uses descriptive name as on-chain statement, visible on Basescan
- Results: `contracts/solidity/E2E_TEST_RESULTS.md`

### GenLayer Cross-Chain Registry + Factory Redeploy
- Added `deploymentBlock` immutable field to InternetCourtFactory.sol
- Deployed new factory to Base Sepolia: `0xb981298fb5E1D27ade6f88014C2f24c30137BC9a`
- Updated all hardcoded factory addresses across codebase (7 files)
- Extended relay service to register Base cases on GenLayer registry via AgreementCreated events
- Updated frontend ABI and docket route to use `deploymentBlock` (eliminates 50k block lookback)
- Updated cases list API with chain routing (Base vs GenLayer-native cases)
- Added chain badges (Base blue, GenLayer purple) to cases list page with live status fetch
- E2E verified: test case created, docket works instantly, case detail loads

### Docket / Case Timeline feature
- Full event timeline for case detail page showing all on-chain events
- Docket API: `/api/cases/[id]/docket` with chunked getLogs (10k block limit), contract state enrichment
- Deep link tabs: `?tab=docket` URL parameter support
- Source labels: Base (blue), GenLayer (purple), LayerZero (amber) color-coded badges
- Court record UI: serif headers, numbered timeline circles, staggered fade-in animations
- Rich data: inline evidence blocks, LayerZero Scan + Basescan links, verdict reasoning, escrow amounts
- 10-event lifecycle: Created → Accepted → Disputed → Evidence (A/B) → Resolution → Bridge → Verdict → Received → Claimed
- Fixed event signature mismatches (indexed vs non-indexed params in ABI items)
- Optimized block range queries (find creation block first, then narrow search)

### USDC Escrow Refactor + API + MCP
- ETH → USDC (ERC-20) escrow, one-sided deposit (creator only)
- Join deadline with auto-expiry (`reclaimOnExpiry`)
- Default judgment (`resolveByDefault` — no evidence = disputer wins)
- Evidence validation (max length, constraints)
- Next.js API routes (6 endpoints: list, detail, evidence, prepare-create/join/submit)
- MCP server (get_case, list_cases, check_deadline tools)
- 166 tests passing
- Design: `docs/plans/2026-02-13-usdc-escrow-api-mcp-design.md`
- Plan: `docs/plans/2026-02-13-usdc-escrow-api-mcp-plan.md`

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

### 282+ total tests — full method coverage
- 194 original unit tests + 90 direct tests in `contracts/tests/direct/`
- All tests passing

### Studionet deployment — factory + full lifecycle
- Factory deployed: `0x4f6B99a7b66C01Cb3588B91C07c4B2C3134aB738` (old: `0xAA55c2768855A483b5D8C8926585Cdb940207898`)
- Full lifecycle tested — unanimous AI jury verdict (TRUE) in ~2 minutes with 5 LLMs
- Integration test scripts: deploy-and-test.mjs, test-prime-dispute.mjs

### Research argue.fun bridge implementation
- Deep dive into https://github.com/arguedotfun/arguedotfun/tree/main/bridge
- Document architecture, contracts, message flow for Internet Court adaptation
- Full research doc: `docs/ARGUE_BRIDGE_RESEARCH.md` (1,630 lines)

### Direct test suite added — 90 additional tests
- Tests in `contracts/tests/direct/`

### Integration test scripts
- `create-production-case.mjs`, `create-4th-case.mjs`

### Factory address updated
- New factory `0x4f6B99a7b66C01Cb3588B91C07c4B2C3134aB738` (old had no types registered)

### Connect Vercel to GitHub for auto-deploy
- GitHub Actions auto-deploy set up (commit 851b63c)

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
- Auto-deploy via GitHub Actions (see "Connect Vercel to GitHub" entry)

### Repo moved to genlayer-foundation/internetcourt
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

### InternetCourtFactory — GenLayer factory/registry contract
- Contract: `contracts/InternetCourtFactory.py`
- Tests: `contracts/tests/test_factory.py` — 35 tests, all passing (0.26s)
- Type-gated registry: owner registers types, anyone can register deployed contracts
- Stores: ID, address, type, deployer, params/metadata (JSON)
- Query by ID, type, or deployer
- No hardcoded contracts — generic registry pattern

### Frontend — commit v0.1 homepage redesign
- Committed: `page.tsx`, `globals.css`, `frontend/public/logos/`
- Two-path hero, blue accent, animations
