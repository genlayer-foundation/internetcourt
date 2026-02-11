# Repository Analysis: argue.fun & pm-kit

Analysis of the two source repositories for internetcourt.org development — now reframed for internetcourt's agent-native architecture.

---

## 1. argue.fun (arguedotfun)

**Repository:** `github.com/arguedotfun/arguedotfun`
**Purpose:** Argument-based prediction markets where users bet on debate outcomes by providing arguments. An AI oracle evaluates argument quality to determine winners.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix primitives) |
| Wallet | RainbowKit + Wagmi 2 + Viem + WalletConnect/Reown |
| Blockchain | Base Sepolia (EVM), Solidity 0.8.22 |
| Smart Contracts | Hardhat + OpenZeppelin 5.x |
| Bridge | LayerZero V2 (cross-chain messaging) |
| Oracle | GenLayer Intelligent Contracts (Python) |
| Backend | Express.js (fact-check API + faucet) |
| Bridge Service | TypeScript + ethers.js + genlayer-js + node-cron |
| Deployment | Vercel (frontend), Railway (bridge service) |

### Folder Structure

```
arguedotfun/
├── contracts/                        # Solidity smart contracts (Hardhat)
│   ├── contracts/
│   │   ├── DebateCOFI.sol           # Individual debate/market contract
│   │   ├── DebateFactoryCOFI.sol    # Factory + bridge receiver + leaderboard
│   │   ├── interfaces/
│   │   │   └── IDebateFactoryCOFI.sol
│   │   └── mocks/MockUSDL.sol       # Test ERC-20 token (6 decimals)
│   ├── scripts/                      # Deploy, configure, interact scripts
│   └── test/                         # 108 Hardhat tests
├── bridge/
│   ├── smart-contracts/              # LayerZero bridge contracts
│   │   ├── contracts/
│   │   │   ├── BridgeForwarder.sol  # zkSync → destination chain via LZ
│   │   │   ├── BridgeReceiver.sol   # Receives LZ messages on Base
│   │   │   └── interfaces/
│   │   └── scripts/                  # Bridge deployment & config scripts
│   ├── service/                      # TypeScript relay service
│   │   ├── src/
│   │   │   ├── relay/
│   │   │   │   ├── EvmToGenLayer.ts # Polls ResolutionRequested → deploys oracle
│   │   │   │   └── GenLayerToEvm.ts # Polls GenLayer → relays via LayerZero
│   │   │   ├── resolution/
│   │   │   │   ├── AutoResolver.ts  # Automated debate resolution caller
│   │   │   │   └── ResolutionQueue.ts # Cron-based scheduling system
│   │   │   ├── api/ResolutionAPI.ts # HTTP API for scheduling
│   │   │   ├── config.ts
│   │   │   └── index.ts             # Entry point
│   │   └── intelligent-oracles/
│   │       └── debate_resolution.py  # GenLayer AI oracle for debates
│   └── intelligent-contracts/
│       └── BridgeSender.py           # GenLayer → EVM bridge contract
├── intelligent-contracts/
│   └── debate_resolution.py          # Standalone debate oracle
├── frontend/                         # Next.js app
│   ├── src/
│   │   ├── app/                      # App router pages
│   │   ├── components/               # UI components
│   │   ├── contexts/                 # Wallet providers
│   │   ├── hooks/                    # Custom hooks
│   │   └── lib/
│   │       ├── base/                 # Base chain adapter
│   │       ├── chain/                # ChainAdapter interface
│   │       └── constants.ts
│   └── vercel.json                   # Vercel deployment config
├── backend/                          # Express.js API
│   ├── server.js
│   └── routes/
│       ├── fact-check.js            # AI fact-checking endpoint
│       └── faucet.js                # Token faucet
└── tests/                            # Exploit/adversarial tests
```

### Contract Analysis

#### DebateFactoryCOFI.sol (Factory)
- Deploys individual `DebateCOFI` instances
- Routes oracle resolutions from bridge to target debate contracts
- Tracks debate status arrays (active/resolving/resolved/undetermined) for frontend queries
- Manages leaderboard state: `UserStats` struct with totalWinnings, totalBets, debatesParticipated, debatesWon, totalClaimed
- Single USDC approval pattern: users approve factory once, factory routes tokens to individual debates
- `processBridgeMessage(uint32, address, bytes)` - receives from BridgeReceiver
- `forwardResolutionRequest()` - emits minimal `ResolutionRequested` event (gas-optimized)

#### DebateCOFI.sol (Individual Debate)
- States: `ACTIVE(0) -> RESOLVING(1) -> RESOLVED(2) | UNDETERMINED(3)`
- Binary betting: Side A vs Side B with USDC (6 decimals)
- Arguments system: Users submit text arguments with bets (min 1 USDC with argument)
- Content limit: 120,000 bytes max (~30k LLM tokens)
- Max argument length: 1,000 chars
- Proportional payout: `winningsShare = (userBet * losingPool) / winningPool`
- Resolution timeout: 7 days after endDate allows cancellation

### Bridge Architecture

The bridge is a 3-part system:

1. **BridgeSender.py** (GenLayer) - Python intelligent contract that stores outbound messages
2. **BridgeForwarder.sol** (zkSync) - Forwards GenLayer messages via LayerZero
3. **BridgeReceiver.sol** (Base) - Receives LayerZero messages and dispatches

### Bridge Service (TypeScript)

Bidirectional relay running as a background service:

**EVM -> GenLayer (`EvmToGenLayer.ts`)**
- Polls Base Sepolia every 5 seconds for `ResolutionRequested` events
- Deploys `debate_resolution.py` to GenLayer with all argument data
- Uses `genlayer-js` SDK for deployment

**GenLayer -> EVM (`GenLayerToEvm.ts`)**
- Polls GenLayer BridgeSender for pending messages
- Sends via LayerZero with gas options (1M gas limit)
- Uses ethers.js for EVM interactions

### GenLayer Oracle (debate_resolution.py)

Key oracle patterns:
- **Single-use contract**: Resolves in constructor, result is immutable
- **Non-comparative evaluation**: `gl.eq_principle.prompt_non_comparative()` for consensus
- **Anti-exploit prompt**: Instructs AI to ignore citations, statistics, authority claims
- **JSON output**: `{"winning_side": "A"|"B", "reasoning": "..."}`
- **Bridge integration**: Encodes result and sends via BridgeSender

---

## 2. pm-kit (Court of Internet)

**Repository:** `github.com/courtofinternet/pm-kit`
**Purpose:** Prediction market playground for crypto/stock price predictions, resolved by GenLayer AI oracles that fetch real-world data.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Styling | CSS Modules (no Tailwind) |
| Wallet | Privy + Wagmi 2 + @privy-io/wagmi |
| Blockchain | Base Sepolia (EVM), Solidity 0.8.22 |
| Smart Contracts | Hardhat + OpenZeppelin 5.x |
| Bridge | LayerZero V2 (same bridge as argue.fun) |
| Oracle | GenLayer Intelligent Contracts (Python) |
| Bridge Service | TypeScript + ethers.js + genlayer-js |

### Key Differences from argue.fun

| Feature | argue.fun | pm-kit |
|---------|-----------|--------|
| Market type | Debate/argument-based | Price prediction |
| Arguments | Yes (on-chain text) | No |
| Resolution | AI evaluates arguments | AI fetches price data |
| Leaderboard | Yes (on-chain) | No |
| Creator access | Open | Approved creators only |
| Resolution types | Single (debate) | Multiple (crypto/stocks/news) |
| Wallet | RainbowKit | Privy (social login) |

### GenLayer Oracles

- Uses `gl.eq_principle.strict_eq()` (stricter consensus) vs argue.fun's `prompt_non_comparative()`
- Fetches real-world data from web (`gl.nondet.web.render()`) vs evaluating user arguments
- More complex ABI encoding: includes price, timestamp, tx_hash fields

---

## 3. Bridge & Integration Patterns (Shared)

Both repos share identical bridge infrastructure:

### Bridge Flow
```
[Base Sepolia] → ResolutionRequested event
                        ↓
[Bridge Service] catches event, fetches data
                        ↓
[Bridge Service] deploys Python oracle to GenLayer
                        ↓
[GenLayer] oracle executes (AI + web data)
                        ↓
[GenLayer] oracle calls BridgeSender.send_message()
                        ↓
[Bridge Service] polls BridgeSender for new messages
                        ↓
[Bridge Service] relays via BridgeForwarder on zkSync
                        ↓
[LayerZero V2] cross-chain message
                        ↓
[BridgeReceiver on Base] → lzReceive() → processBridgeMessage()
                        ↓
[Factory] dispatches to target contract → setResolution()
```

### LayerZero V2 Configuration
- Base Sepolia EID: `40245`
- Base Mainnet EID: `30184`
- GenLayer Source Chain ID: `61998`
- Gas limit for receive: `1,000,000`

---

## 4. Reusable Components for internetcourt.org

### Directly Reusable (Copy & Adapt)

1. **Bridge Infrastructure** (entire `bridge/` directory)
   - BridgeSender.py, BridgeForwarder.sol, BridgeReceiver.sol
   - Bridge service relay (EvmToGenLayer.ts, GenLayerToEvm.ts)
   - This is the most complex and valuable piece to reuse

2. **Contract Architecture Pattern**
   - Factory + individual contract pattern
   - Status tracking arrays for queries
   - Single token approval via factory
   - `processBridgeMessage()` dispatch pattern

3. **MockUSDL.sol** (Test Token)
   - Rate-limited faucet, 6 decimal USDC-like token
   - Ready to use for testnet

4. **Resolution Queue & Auto Resolver**
   - Cron-based scheduling for automated resolution
   - Useful for agreement deadlines

5. **GenLayer Oracle Patterns**
   - Single-use constructor pattern (resolve on deploy)
   - `gl.eq_principle.prompt_non_comparative()` for subjective evaluation
   - Bridge encoding and send_message pattern

### Partially Reusable (Need Modification)

1. **Frontend ChainAdapter Pattern** (from argue.fun)
   - For the human monitoring dashboard
   - Swap from debate to agreement/case semantics

2. **Leaderboard System** (from argue.fun)
   - Adapt for agent reputation tracking
   - On-chain stats: cases filed, cases won, compliance score

3. **Arguments System** (from argue.fun)
   - On-chain text arguments with author/timestamp/amount
   - Content byte limits for LLM processing
   - Perfect for agent dispute arguments

4. **Wallet Integration**
   - argue.fun: RainbowKit (traditional Web3)
   - pm-kit: Privy (social login, embedded wallets)
   - **For internetcourt**: Privy for the human dashboard (lower barrier), plus API key auth for agents

---

## 5. Recommended Architecture for internetcourt.org

Based on analysis of both repos, adapted for agent-native architecture.

### Smart Contracts (Base Sepolia → Base Mainnet)

```
contracts/
├── AgreementCOFI.sol            # Individual agreement (adapted from DebateCOFI)
│   - Party A vs Party B (agents or humans)
│   - Argument submission system
│   - States: DRAFT → ACTIVE → DISPUTED → RESOLVED | CANCELLED
│   - Escrow handling
│   - Content limits for AI processing
│
├── CourtFactoryCOFI.sol          # Factory (adapted from DebateFactoryCOFI)
│   - Agreement creation
│   - Status tracking arrays
│   - Agent reputation tracking (adapted from leaderboard)
│   - Bridge receiver for jury verdicts
│
├── mocks/MockUSDL.sol            # Reuse directly
└── interfaces/ICourtFactoryCOFI.sol
```

### API Layer (NEW — Agent-Facing)

```
api/
├── routes/
│   ├── agreements.ts             # CRUD for agreements
│   ├── disputes.ts               # Dispute lifecycle
│   ├── verdicts.ts               # Verdict queries
│   └── reputation.ts             # Agent reputation queries
├── middleware/
│   ├── auth.ts                   # API key + wallet signature auth
│   └── validation.ts             # Request validation
├── webhooks/
│   └── notifications.ts          # Push verdicts to agents
└── sdk/
    ├── python/                   # pip install internetcourt
    └── typescript/               # npm install internetcourt
```

### Bridge (Reuse 95%)

```
bridge/
├── smart-contracts/              # Reuse BridgeForwarder + BridgeReceiver unchanged
├── service/
│   ├── src/
│   │   ├── relay/                # Reuse EvmToGenLayer + GenLayerToEvm
│   │   ├── resolution/           # Reuse AutoResolver + ResolutionQueue
│   │   └── config.ts             # Adapt env var names
│   └── intelligent-oracles/
│       └── court_verdict.py      # NEW: Dispute resolution AI oracle
└── intelligent-contracts/
    └── BridgeSender.py           # Reuse unchanged
```

### GenLayer Oracle (New)

```python
class CourtVerdict(gl.Contract):
    """AI jury that evaluates agent/human dispute arguments."""

    def __init__(self, case_id, case_title, party_a_argument, party_b_argument,
                 evidence_json, bridge_sender, target_chain_eid, target_contract):
        # Evaluate arguments using gl.eq_principle.prompt_non_comparative()
        # Focus on: agreement compliance, evidence quality, logical consistency
        # Impartial to whether parties are agents or humans
        # Output: {"verdict": "party_a"|"party_b", "reasoning": "..."}
        # Send via BridgeSender
```

### Frontend (Human Monitoring Dashboard)

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Dashboard homepage
│   │   ├── agreements/
│   │   │   ├── page.tsx          # List my agents' agreements
│   │   │   └── [id]/page.tsx     # Agreement detail + dispute status
│   │   ├── reputation/page.tsx   # Agent reputation browser
│   │   └── docs/page.tsx         # API documentation
│   ├── components/
│   │   ├── agreement-card.tsx
│   │   ├── dispute-panel.tsx
│   │   ├── verdict-display.tsx
│   │   └── reputation-badge.tsx
│   ├── lib/
│   │   ├── chain/
│   │   │   ├── types.ts          # CourtAdapter interface
│   │   │   └── factory.ts
│   │   ├── base/
│   │   │   ├── adapter.ts
│   │   │   ├── contracts/
│   │   │   └── approval.ts
│   │   └── constants.ts
│   └── providers/
│       └── WalletProvider.tsx     # Privy (from pm-kit)
```

### Key Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Primary interface | REST API | Agents are the primary users — they need API, not UI |
| Human interface | Privy + Next.js dashboard | Lower barrier for monitoring |
| Styling | Tailwind + shadcn | argue.fun's approach is maintainable |
| Frontend pattern | ChainAdapter | Abstraction enables future multi-chain |
| Contract pattern | Factory + Child | Proven pattern from both repos |
| Bridge | Reuse 100% | Already battle-tested |
| Oracle consensus | prompt_non_comparative | Better for subjective dispute evaluation |
| Agent auth | Wallet signing + API keys | Agents sign with their wallets, API keys for convenience |
| Agent reputation | On-chain (adapted leaderboard) | Verifiable, queryable by other agents |

### Environment Variables Needed

```bash
# API
INTERNETCOURT_API_KEY_SECRET=       # For API key generation/validation
WEBHOOK_SIGNING_SECRET=             # For webhook payload signing

# Frontend
NEXT_PUBLIC_PRIVY_APP_ID=          # From Privy dashboard
NEXT_PUBLIC_COURT_FACTORY_ADDRESS=  # Deployed factory
NEXT_PUBLIC_MOCK_USDL_ADDRESS=      # Token address

# Contracts
PRIVATE_KEY=                        # Deployer wallet
BASESCAN_API_KEY=                   # Contract verification

# Bridge Service
PRIVATE_KEY=                        # Relayer wallet
GENLAYER_RPC_URL=                   # GenLayer endpoint
BASE_SEPOLIA_RPC_URL=               # Base RPC
COURT_FACTORY_ADDRESS=              # Factory to monitor
BRIDGE_SENDER_ADDRESS=              # GenLayer bridge
BRIDGE_FORWARDER_ADDRESS=           # zkSync forwarder
FORWARDER_NETWORK_RPC_URL=          # zkSync RPC
```

### Deployment

| Component | Platform | Notes |
|-----------|----------|-------|
| API | Vercel / Railway | REST API for agents |
| Frontend | Vercel | Next.js dashboard for humans |
| Bridge Service | Railway | Background relay |
| Contracts | Base Sepolia → Base | Hardhat deploy scripts |
| Bridge Contracts | zkSync + Base | Hardhat deploy scripts |
| GenLayer Oracles | GenLayer Studionet | Deployed on-demand by bridge service |

---

## 6. Code Reference Quick Links

### Most Important Files to Reference

**Contract patterns:**
- `arguedotfun/contracts/contracts/DebateCOFI.sol` - Most complete contract with arguments
- `arguedotfun/contracts/contracts/DebateFactoryCOFI.sol` - Factory with leaderboard (→ reputation)
- `pm-kit/contracts/contracts/BetFactoryCOFI.sol` - Factory with approved creators

**Bridge (reuse directly):**
- `arguedotfun/bridge/intelligent-contracts/BridgeSender.py`
- `arguedotfun/bridge/smart-contracts/contracts/BridgeForwarder.sol`
- `arguedotfun/bridge/smart-contracts/contracts/BridgeReceiver.sol`
- `arguedotfun/bridge/service/src/relay/EvmToGenLayer.ts`
- `arguedotfun/bridge/service/src/relay/GenLayerToEvm.ts`

**Oracle patterns:**
- `arguedotfun/intelligent-contracts/debate_resolution.py` - Argument evaluation
- `pm-kit/bridge/service/intelligent-oracles/crypto_prediction_market.py` - Data fetching

**Frontend patterns:**
- `arguedotfun/frontend/src/lib/chain/types.ts` - ChainAdapter interface
- `pm-kit/frontend/src/app/providers/WalletProvider.tsx` - Privy integration

**Infrastructure:**
- `arguedotfun/frontend/vercel.json` - Vercel config
- `arguedotfun/bridge/service/railway.toml` - Railway config
- `arguedotfun/bridge/service/src/resolution/ResolutionQueue.ts` - Auto-resolution
