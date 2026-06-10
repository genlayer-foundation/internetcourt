# Internet Court — Strategy & Narrative v4

*Working doc. Audience: protocol partners, integrators, internal team. Last revised: 2026-04-29.*

## TL;DR

Internet Court is the open standard for adjudicating disputes between agents. The standard is a public good. The seal is a public mark.

Anyone can build on the standard. Any contract that meets it earns the seal.

1. **An open standard** for adjudication in the agent economy. Neutral across the stack, free for anyone to use, deployable on any chain, schema-driven, permissionless registration. The interface architecture is layered: parties' contracts on one side, Adjudicators on the other, adjudicator-contracts as middleware between them.
2. **A brand and a seal**, *"Protected by Internet Court."* A recognizable mark, like FDIC for banks, UL for electronics, USDA for food, HTTPS for the web. Applied across the whole stack. A contract is "Protected by Internet Court" because it was deployed by the Internet Court factory (audited template), uses an Accredited Adjudicator, has a defined dispute path, and writes its verdict back into public reputation. The seal is a rollup of trust across layers, not a stamp on one layer.

The two pillars reinforce each other. The standard makes the seal verifiable. The seal makes the standard valuable to non-developers. Both are public goods. The Internet Court Foundation does not monetize the protocol.

Three lines we repeat:

- *"The neutral venue for agent disputes."* (tagline)
- *"The missing layer. The rest of the stack does not work without it."* (architecture pillar)
- *"Protected by Internet Court."* (seal pillar)

---

## Part 1 — The two pillars

### Pillar 1: The architecture (developer-facing)

Every agent-to-agent transaction flows through seven layers, top-to-bottom, chronologically.

| # | Layer | What happens here | Standards / inhabitants |
|---|---|---|---|
| 1 | **Discovery, identity & reputation** | Agents find each other and assess whether to engage. Verdicts compound back here as precedent. | ERC-8004 |
| 2 | **Negotiation** | Proposal, counter-proposal, terms exchange. | A2A (Google) |
| 3 | **Contracts** | Encoding the agreed terms in a structured artifact. | Arkhai, ERC-8183 (emerging) |
| 4 | **Payment & escrow** | Money moves or locks behind milestones. | x402, MPP (Stripe) |
| 5 | **Execution** | The agent does the work. Domain-specific, not infrastructure. | *the agents themselves* |
| 6 | **Verification, adjudication & disputes** | Decide who is right, and execute the on-chain consequence: release escrow, slash reputation, write the verdict to the public record. | **Internet Court** |
| 7 | **Enforcement (legal / ADR)** | Real-world enforcement when on-chain consequence is not enough. Court orders, traditional ADR, legal compulsion to refund or comply, even when the underlying technology is irreversible. | *vacant* |

Six of these have credible standards or live infrastructure today. Layer 6 has nothing at the protocol level, only ad-hoc, vertical, closed solutions inside individual products. Layer 7 sits on top of Layer 6. It is the bridge to the traditional legal system for the cases where on-chain consequence is not the whole answer.

Layer 6 is the keystone, *"the missing layer; nothing above it works without it,"* for five reasons.

1. L1 reputation is empty without L6 verdicts. Reputation in the agent economy is just a record of past adjudications.
2. L2 negotiation degrades without L6 fallback. Agents over-collateralize or refuse meaningful contract values.
3. L3 contracts are toothless without L6. A contract whose breach has no remedy is a memo.
4. L4 escrow needs L6 to release. Milestone-based escrow only works if a neutral party can determine whether the milestone was met. The release itself is part of L6, executed by the protocol.
5. L7 legal and ADR enforcement layers on top of L6. Even when on-chain consequence is not enough (cross-border disputes, regulated counterparties, off-chain assets, legal-system involvement), L6 verdicts are the input the legal process works from. Bitcoin transactions are irreversible, but a court can still compel a refund. Without an L6 verdict, the court has no agreed input.

### Pillar 2: The seal (end-user-facing)

Internet Court is also a brand. *"Protected by Internet Court"* is to agent commerce what FDIC is to banking, UL to electronics, USDA Organic to food, HTTPS to the web. A recognizable visual trust signal that compresses underlying complexity (audited contracts, accredited Adjudicators, defined dispute path) into a single mark that everyone learns to look for.

The seal is a rollup of trust across the whole stack. A "Protected by Internet Court" experience means:

- The L3 contract was deployed by the Internet Court factory. It is an audited template, conformant to Internet Court schemas. Verification is by construction. You cannot fake it.
- The L4 escrow has a defined dispute path that triggers a verdict if needed.
- The L6 Adjudicator is Accredited, vetted by the Internet Court Foundation, conformant to the spec, in good standing.
- The on-chain consequence of the verdict (escrow release, reputation slashing, verdict written to the record) executes as part of the L6 protocol, not as an arbitrary action by any party.
- The L1 reputation entries are signed verdicts that emerged from the certified path, not asserted reputation entries that anyone can write.
- If L7 enforcement is invoked (legal action, ADR, court order), the L6 verdict is the input the legal process works from.

So when someone displays "Protected by Internet Court," they are not vouching for one layer. They are attesting that the entire transaction lifecycle, from contract creation through verdict to reputation record, is inside Internet Court's trust envelope. The seal does not sit on a layer. It wraps the stack.

### How the two pillars work together

The two pillars target two audiences that don't usually overlap.

| Audience | Sees | Reads it as |
|---|---|---|
| Protocol partners, infra builders | Pillar 1 (architecture, L6 keystone, missing layer) | A protocol-level land grab. A standard everyone needs. |
| End users, agent builders, integrators, app developers | Pillar 2 (seal, "Protected by Internet Court") | A trust signal. Something to display on their site, in their app, on their contract. |

These reinforce each other. More apps display the seal, so more cases route through Internet Court, so more reputation accretes, so the seal becomes more meaningful, so more apps want it. The architecture is what makes the seal verifiable. The seal is what makes the architecture valuable to people who do not read protocol specs.

---

## Part 2 — How it works

### The factory pattern (verification by construction)

Internet Court is a contract factory. More specifically, a factory that deploys *bundles*. A bundle is a pre-vetted unit of three linked components, deployed together.

1. **Contract template.** The L3 contract logic the parties agree to (an SLA contract, an escrow contract, a benchmark-delivery contract, and so on).
2. **Adjudication contract.** The middleware that orchestrates dispute resolution for that template (intake, evidence flow, Adjudicator routing, verdict finalization).
3. **Adjudicator(s).** The decision-making system or systems the adjudication contract routes to (deterministic, GenLayer, Kleros escalation, ADR fallback, and so on).

When a user or agent interacts with the factory, they pick a bundle. The factory deploys all three components linked. A single contract template can appear in multiple bundles with different adjudication paths. An SLA template might come as bundle A (deterministic only), bundle B (deterministic + GenLayer escalation), or bundle C (deterministic + GenLayer + Kleros human-jury fallback). Same template, different adjudication characteristics.

The implication: anti-spoofing is solved at the protocol level for the entire stack. A contract claiming to be "Protected by Internet Court" is one of two things.

- **Real.** The contract address provably derives from an Internet Court factory deployment, on-chain, verifiable by any client. By construction this means its adjudication contract is vetted and its Adjudicator(s) are vetted, because they were deployed as a bundle.
- **Fake.** Somebody put up the seal logo without an actual Internet Court factory-deployed contract underneath. A client check rejects it instantly.

This is the same trust property HTTPS gives the web. The lock icon does not mean "the site put up a lock icon," it means "your browser verified the certificate chain." The Internet Court factory is the certificate chain. Verification is structural, not reputational. One on-chain check covers the whole stack.

The factory's bundle catalog is the accreditation registry. No separate registry primitive. To accredit a new Adjudicator, Internet Court publishes new bundles that include it. To revoke, Internet Court removes bundles from the catalog (and may retroactively flag existing deployments via the revocation lifecycle). The unit of accreditation is the bundle, not its components in isolation. What gets certified is the whole adjudication path, audited as a unit.

The bundle catalog is also the natural artifact of partnership conversations. To onboard Kleros as an Accredited Adjudicator, the concrete move is to publish a set of bundles that include Kleros in their adjudication path (probably as a human-jury escalation tier on top of deterministic + GenLayer). Partners don't get accredited in the abstract. Bundles get published.

### The three-layer interface architecture

Internet Court has more interface complexity than EAS, because adjudication has two distinct integration surfaces: the parties bringing contracts, and the systems making decisions.

```
                   Parties' contracts
                          ↓
                ┌──────────────────────┐
                │  Contract-side       │  (interfaces parties' contracts plug into)
                │  interfaces          │
                └──────────────────────┘
                          ↓
                ┌──────────────────────┐
                │  Adjudicator         │  (middleware: orchestrate cases,
                │  contracts           │   route to Adjudicator types)
                └──────────────────────┘
                          ↓
                ┌──────────────────────┐
                │  Adjudicator-side    │  (interfaces Adjudicator types plug into:
                │  interfaces          │   deterministic, GenLayer, UMA, Kleros, ADR)
                └──────────────────────┘
                          ↓
                  Adjudicator implementations
```

EAS is the inspiration for the openness properties: multi-chain, schema-driven, permissionless schema registration, no central operator. The middleware layer is what is specific to Internet Court.

### Adjudicators

Available Adjudicators in v0.1 and beyond:

- **Deterministic.** Adjudicates statements that resolve via deterministic logic (timestamp comparisons, on-chain state checks, signature verification, hash matches, numeric thresholds). Already implemented in Arkhai's repo. Ships in v0.1. Cases that need no AI never touch a non-deterministic Adjudicator.
- **GenLayer.** AI, on-chain, machine-speed, trustless. Permissionless validator network: anyone can run a GenLayer validator. Currently the only on-chain trustless AI Adjudicator that exists. GenLayer requires a contract per use case, one adjudication contract for each scenario.
- **UMA.** Optimistic oracle. Higher-stakes cases, longer challenge windows.
- **Pledo, Saluma.** Other optimistic and escalation tiers.
- **Kleros.** Human jury, on-chain. First non-GenLayer partnership target post-v0.1.
- **Traditional ADR / human jury.** Off-chain ceiling.

**Multi-tier escalation.** Cases start at the appropriate base tier (deterministic if logic supports, GenLayer otherwise) and escalate up if contested. Each tier is a different Adjudicator conforming to the same Adjudicator-side interface.

### The case lifecycle (implementation pattern)

Most contract executions do not generate disputes. Parties agree, deterministic conditions trigger release, the contract closes. Some bundles auto-verify simple conditions (timestamp passed, signature submitted, on-chain state present) and release funds without invoking an Adjudicator at all. Parties can also pre-agree to skip the dispute path for specific clauses. Adjudication only runs when one party disputes.

When a dispute is raised, the case lifecycle runs: Statement, then Guidelines & Evidence, then Evidence Submission, then Verdict, then optional escalation.

The verdict is not always binary. It can be a simple True / False / Undetermined, or a structured outcome: pay a percentage, apply a penalty, release a partial amount, refund with a deduction. The Statement and Guidelines define the valid outcome shape for that case. Templates define inputs and outputs. Off-chain inputs are supported where evidence requires it.

When the verdict is Undetermined, the bundle decides what happens next. If the bundle includes an escalation tier, the case escalates to it. If the bundle has no escalation, the contract either lives with Undetermined as the final state or applies a default resolution that the Statement defined up front.

**Scope.** Internet Court adjudicates statements that resolve via on-chain or off-chain attestations. Statements that cannot be resolved through attestation are out of scope.

This iteration is fully on-chain and public. All cases, evidence, verdicts, and resulting reputation entries are public on-chain. No private cases in v0.1. Privacy and encrypted evidence are a future extension for B2B and medical use cases, not v0.1.

### Reputation as a side-effect

Every verdict accretes to both parties' histories automatically. Nobody fills in reputation. Nobody pays a fee to write a reputation event. Case fees (paid to the Adjudicator) cover everything. Writing a reputation entry is not an action. It is a side-effect of the case being adjudicated at all.

The structured properties of reputation (domain, Adjudicator, outcome, evidence quality, counterparty profile) fall out of the verdict schema for free. Identity standards (ERC-8004 and successors) become readers of the Internet Court verdict log. Internet Court is the substrate. The Foundation does not sell reputation. Reputation is a byproduct of the protocol running.

### The seal program

The seal has two applications, and the same mark serves both.

- **Certified Contract.** Applied to a contract template that appears in one or more published bundles in the factory.
- **Accredited Adjudicator.** Applied to an Adjudicator type that appears in one or more published bundles.

Both are verified together via the factory. A "Protected by Internet Court" deployment is a factory-deployed bundle, and the bundle is the unit of certification. The seal carries both meanings. The qualifier (which kind of certification applies in this context) is implicit from where the seal is shown.

**Audit model.** The Foundation audits directly at the start. Independent auditors via accreditation (PCI-DSS / QSA pattern) remain possible later if and when the program needs to scale.

**Cost.** Certification is free at v0.1. The seal program is donation- and grant-funded.

**No token.** Verdict fees are stablecoin-denominated.

**Catalog curation.** The Foundation curates the v0.1 bundle catalog directly. Criteria for adding bundles are Foundation-determined for now; opening up the curation process is a future question.

**One seal type.** The same mark covers contract and Adjudicator certification, applied via the bundle. No tiered marks (Bronze / Silver / Gold) planned.

**Revocation lifecycle.** Required. A previously-certified contract found exploitable, or an Adjudicator whose track record degrades, gets a public revocation. Public challenge process, rolling re-accreditation, on-chain registry shows current status. Without revocation, the seal is one-time and meaningless.

---

## Part 3 — Strategy & positioning

### Partnership strategy: partners earn the seal

The goal of GTM Phase 2 is to stack logos. The mechanism is Accredited Adjudicator status. Partners don't co-author v0.1. Partners come to v0.1 and earn the seal.

**Sequencing:**

1. **v0.1 internal launch.** Arkhai's existing implementation. Deterministic and GenLayer Adjudicators available.
2. **Kleros first non-GenLayer partner.** Conversation starts very quickly. Goal: Kleros becomes the first Accredited human-jury Adjudicator post-v0.1.
3. **UMA, Pledo, Saluma** as optimistic-tier Accredited Adjudicators.
4. **Layer 1–3 protocols (ERC-8004, A2A, Arkhai, ERC-8183, x402, MPP, APP)** as integration partners on the contract side. Apps and contracts that the factory deploys reference these standards.
5. **Agent ecosystems (Virtuals, AntSeed, Rally, Kelors)** as distribution channels. Every agent in their ecosystem gets a default factory-deployed contract clause.
6. **Users that bring cases (RentAHuman and similar).** Not Adjudicators. They are sources of contracts and disputes that need adjudication. Their integration is on the contract-creation side, not the verdict-rendering side.

**Layer-to-partner cheat sheet:**

| Layer | Targets | Integration angle |
|---|---|---|
| L1 Identity | ERC-8004 maintainers, Proven | Verdict-as-reputation-event |
| L2 Negotiation | A2A (Google) | Embed dispute clause in negotiation |
| L3 Contracts | Arkhai (live), ERC-8183, MergeProof | Contracts factory-deployed earn the seal |
| L4 Payment & escrow | x402, MPP (Stripe), APP, Hopscotch, Uptime | Escrow release on certified verdict |
| L5 Execution / agent ecosystems | Virtuals, AntSeed, Rally, Kelors | Default Internet Court clause in agent SDK |
| L6 Adjudicator partners | Kleros, UMA, Pledo, Saluma, Futarchy.fi | Become Accredited Adjudicators |
| L6 case sources (users) | RentAHuman and similar | Bring contracts and disputes; integrate on the contract-creation side |
| L7 Enforcement (later) | Custodians, DAOs, clearinghouses, ADR providers, legal partners | Verdict export, real-world enforcement |
| Institutional | Ethereum Foundation | Public-goods grant, seal program credibility |

### The two flywheels (technical + brand)

Two loops feed each other.

> **Technical loop.** More integrations across L1–L5 lead to more cases routed to the Internet Court spec. The public verdict corpus accretes. L1 reputation becomes more useful. More agents engage at L2 and L3 with confidence. More cases. Accredited Adjudicators see more case volume.
>
> **Brand loop.** More apps display "Protected by Internet Court," so the seal becomes more recognized as the trust signal. More apps want it. More contracts get factory-deployed, more Adjudicators get Accredited. More surface area for the seal. The seal becomes more recognized still.
>
> Apps that adopt the standard earn the seal. Apps that want the seal adopt the standard. Adjudicators that get Accredited see more cases. Adjudicators that see more cases build the track record that keeps them Accredited.

Three groups win on the combined loop:

- Internet Court wins on standard-setting authority and seal-program credibility.
- Accredited Adjudicators win on case volume and track record.
- Agents and end users win on having a reliable adjudication primitive and a trust mark to look for.

### Credible neutrality discipline

The seal sharpens the credible-neutrality question; it does not dissolve it. Authority over certification can be captured. The discipline:

- **The spec is open and forkable.** Anyone can implement Internet Court's standard, deploy on any chain, run their own factory. The brand is what carries the meaning, not the bytecode.
- **Adjudicators are first-class peers in the spec from day one.** Deterministic, GenLayer, UMA, Kleros, ADR all defined in the Adjudicator-side interface with equal documentation depth. No "default tier" labeling in the spec itself.
- **GenLayer is permissionless.** Anyone can run a validator. This makes "GenLayer as the AI tier" structurally closer to "Ethereum validators" than "one company's API."
- **Governance evolves toward multi-stakeholder.** See roadmap below. The seal program eventually has multiple voices on it.

---

## Part 4 — Brand & voice

**Attribution.** Internet Court does not carry a "Built on" attribution. GenLayer appears as one logo among the partners and Accredited Adjudicators, on equal visual footing with the others.

**Voice.** Protocol-standard authority and trust-mark institutional credibility. Closer to the Ethereum Foundation, Cloudflare's protocol blog, x402's docs, or UL's standards documentation than to a YC launch post. Declarative, technical-but-accessible, sparse.

**Verbal moves to repeat:**

- "The neutral venue for agent disputes." (tagline)
- "The missing layer. Nothing above it works without it." (architecture pillar)
- "Protected by Internet Court." (seal pillar)
- "FDIC for banks. HTTPS for the web. Internet Court for agent commerce."
- THE GAP trio: every agent transaction needs a fallback; no protocol-level solution exists today; first mover compounds via partner integrations.

**Verbal moves to retire or avoid:**

- "Dispute resolution for the agent economy" (older live-site tagline, superseded).
- "AI court" (gimmicky; press treats it as a punchline).
- "Decentralized" as a primary adjective (true but tired; the function is the lead, not the architecture).
- "Disrupt the legal system" (wrong audience, wrong frame).
- "Evaluator" anywhere (renamed Adjudicator project-wide).
- "Evaluator marketplace" (Adjudicator is a category, not a marketplace).

**Visual identity (current working tokens):**

- Canvas: dark `#0a0913` with 40px grid texture and lavender-purple glow `#7c3aed`.
- Internet Court red `#DC2626` is the territory color, used only where Internet Court is the subject. Don't bleed it elsewhere.
- Lavender `#c8b6ff` for italic-serif emphasis on key phrases.
- Type stack: DM Sans (titles, body), DM Serif Display italic (accent phrases only), DM Mono (numbers, URLs).
- Internet Court wordmark: `https://internetcourt.org/logos/tic-logo-red.svg` (embed as SVG; never approximate).
- The seal artifact is a separate design problem from the wordmark. Probably a shield-shaped derivative, monochrome variants for embedding (light/dark), with cryptographic verification metadata accessible to clients. Worth a dedicated working session.

---

## Part 5 — Roadmap

**Week 1, v0.1.** Internet Court launches on Arkhai's existing implementation. Deterministic and GenLayer Adjudicator tiers available. Factory deploys bundles (template + adjudication contract + Adjudicator). Cryptographic verification by construction extends across the whole stack. Foundation-direct accreditation for the v0.1 catalog. Seal mark shipped as a visual artifact. Internet Court Working Group forming with at least one non-GenLayer member. Site rebuilt around the two-pillar narrative.

**Week 2, v0.2.** Kleros conversation lands. Kleros becomes the first non-GenLayer Accredited Adjudicator. First external Adjudicator integrations live. First logos on the wall organized by layer. Revocation lifecycle live.

**Week 3, v0.3.** Mainnet readiness on at least one chain beyond GenLayer (Base or Ethereum likely). UMA, Pledo, Saluma added as Accredited optimistic-tier Adjudicators. Vertical Interface specs published for SLA, escrow, uptime. More logos, organized by layer.

**Soon after.** Internet Court Foundation legal entity stands up as a separate legal entity (near-term, not deferred to "Later").

**Later.** Production network at scale. Public Adjudicator economics. L7 (legal / ADR) enforcement standard with at least two consumer protocols. Working Group evolves into Standards Committee that owns the seal program. Funding diversification with at least two non-GenLayer sources visible. Encrypted-evidence path for B2B and medical use cases. Standards Committee with seats for major Accredited Adjudicators.

---

## Appendices

### Appendix A — Naming conventions

| Surface | Use these terms | Don't use |
|---|---|---|
| Public-facing copy | Layer 6, Statement, Guidelines, Evidence, Verdict, AI jury, AI validator, case, "neutral venue," "Protected by Internet Court," seal | "Evaluator" anywhere |
| SDK / docs / specs | Arbiter, Adjudicator, Interface, schema names | "Court," "judge" (sparingly) |
| Internal team | Either set with the mapping above | "Evaluator," "Evaluator marketplace" (both retired) |

### Appendix B — Visual identity at a glance

- Canvas: `#0a0913`
- Internet Court red (territory): `#DC2626`
- Lavender italic-serif accent: `#c8b6ff`
- GenLayer purple glow: `#7c3aed`
- Type: DM Sans, DM Serif Display italic, DM Mono
- Internet Court wordmark: `https://internetcourt.org/logos/tic-logo-red.svg`
- Seal artifact: TBD. Separate design problem; shield-shaped derivative of wordmark, light/dark variants for embedding, cryptographic verification metadata.

**Rule:** never use Internet Court red `#DC2626` outside Internet Court territory in any shared materials. Reserved.

### Appendix C — Spec definitions

- **MPP.** Machine Payment Protocol, by Stripe.
- **A2A.** Google's A2A protocol.
- **ERC-8183.** Scope still to confirm (assumed: contracts and agreements).

### Appendix D — Source artifacts

- `Internet Court — Strategy & Narrative v1.md`. Earliest draft, built on superseded live-site copy.
- `Internet Court — Strategy & Narrative v2.md`. Single-pillar (architecture-only) version. Superseded.
- `Internet Court — Strategy & Narrative v3.md`. Two-pillar snapshot. Frozen reference.
- `Internet Court — Strategy & Narrative v4.md`. This doc. Live editing copy.

### Appendix E — Immediate next moves

In rough order of leverage:

1. **Develop the seal as a visual artifact.** Shield mark, light/dark variants, embedding spec, cryptographic verification metadata. Needs to ship alongside v0.1 since the seal is what end-users see.
2. **Lock the seal program criteria, even loosely.** What does it take for a contract template or Adjudicator to earn the seal? Even a v0.1 checklist gives partners something concrete to work toward.
3. **Stand up the Internet Court Working Group.** A visible non-GenLayer voice within ~60 days (advisor or co-chair).
4. **Write the Kleros conversation script.** Partner outreach starts very quickly per Iván. Frame: "Kleros becomes our first non-GenLayer Accredited Adjudicator."
5. **Seal-across-the-stack visualization.** Shows Internet Court as a shield wrapping the layers, not occupying a single layer.
6. **Partner-facing one-pager.** Boiled-down version of this doc for DM outreach.
7. **Twitter/X launch thread.** Both pillars, sequenced (architecture first, seal as the punchline).
8. **`skill.md` polish.** Developer-facing front door.
9. **L7 (legal/ADR) follow-on visualization.** Same visual language, showing the bridge to traditional enforcement.
10. **Webpage v2 copy.** internetcourt.org rebuilt around the two-pillar narrative.

---

## Annex — What this means for GenLayer (internal, not for sharing)

This section is for the GenLayer team and for selective investor conversations only. It does not appear in any partner-facing materials, on the Internet Court website, or in collateral that goes outside the foundation.

**The setup.** GenLayer is the only on-chain trustless AI Adjudicator that exists today. GenLayer's network is permissionless: anyone can run a validator, fees flow to the validator set rather than to a single company. The Internet Court Foundation is GenLayer-seeded but positioned as a public good and is not commercially branded as a GenLayer product, following the same pattern x402 follows with respect to Coinbase.

**The mechanism.** Adjudication volume routes through the Internet Court spec. Most non-deterministic cases will land at the AI tier in the early years because it is the fastest, cheapest, and only on-chain trustless option. As long as that remains true, GenLayer captures the lion's share of AI-tier adjudication fees through its validator network. Other Adjudicators (Kleros, UMA, Pledo, Saluma, traditional ADR) capture their tiers' volume through their own systems.

**The shape of the addressable opportunity.** Total value adjudicated on the GenLayer network roughly equals (share of agent-economy transactions touching Internet Court) × (rate of dispute or verification routed to the AI tier) × (average case value). Each factor compounds with adoption of the seal and integrations across L1–L5.

**Why permissionless GenLayer matters here.** The credible-neutrality story for Internet Court depends on the AI tier not looking like one company's API. GenLayer's permissionless validator architecture makes that story honest. The AI tier is a network, not a vendor. The analogy is "ERC-20 contracts settling on Ethereum mainnet validators," not "x402 payments routed through Coinbase's API."

**Why the seal multiplies the opportunity.** As "Protected by Internet Court" becomes a recognized trust signal in the agent economy, every recognized app that integrates the standard is another source of cases. The brand loop is not just narrative; it is a forcing function on adjudication volume.

**What we still owe ourselves on this.** The credible-neutrality discipline is real. We need first-class non-GenLayer Adjudicators in the spec from day one (the Kleros conversation is the most important first move), an open spec that anyone can implement and run their own factory against, and a governance path that puts more than GenLayer voices on the seal program over time. Any of those failing turns the standard-everywhere outcome into "Internet Court is just GenLayer's standard," which collapses the whole thesis.

---

*v4 is the live editing copy.*
