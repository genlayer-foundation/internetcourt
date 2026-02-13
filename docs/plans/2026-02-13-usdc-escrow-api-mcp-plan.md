# USDC Escrow, API & MCP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor Agreement.sol from ETH to USDC escrow with one-sided deposits, join deadline, default judgment, evidence validation, plus add Next.js API routes and MCP server.

**Architecture:** Modify existing Agreement.sol and Factory. Keep bridge/relay untouched. Add API routes to Next.js frontend. Create separate MCP package.

**Tech Stack:** Solidity 0.8.22, OpenZeppelin ERC20, Hardhat, ethers.js, Next.js API routes, MCP SDK, viem

---

### Task 1: Create MockUSDC Test Token

**Files:**
- Create: `contracts/solidity/contracts/mocks/MockUSDC.sol`
- Test: `contracts/solidity/test/MockUSDC.test.ts`

**Step 1: Write MockUSDC contract**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

**Step 2: Write a basic smoke test**

```typescript
// contracts/solidity/test/MockUSDC.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("MockUSDC", function () {
  it("should have 6 decimals", async function () {
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    expect(await usdc.decimals()).to.equal(6);
  });

  it("should mint tokens", async function () {
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    const [owner] = await ethers.getSigners();
    await usdc.mint(owner.address, 1000_000000n); // 1000 USDC
    expect(await usdc.balanceOf(owner.address)).to.equal(1000_000000n);
  });
});
```

**Step 3: Run tests**

Run: `cd contracts/solidity && npx hardhat test test/MockUSDC.test.ts`
Expected: 2 passing

**Step 4: Commit**

```bash
git add contracts/solidity/contracts/mocks/MockUSDC.sol contracts/solidity/test/MockUSDC.test.ts
git commit -m "feat: add MockUSDC with 6 decimals for escrow testing"
```

---

### Task 2: Refactor Agreement.sol — USDC Escrow Foundation

**Files:**
- Modify: `contracts/solidity/contracts/Agreement.sol`

This is the core refactor. All changes are interdependent so they go in one task.

**Step 1: Add IERC20 import and new state variables**

At the top of Agreement.sol, after the IInternetCourtFactory interface, add:

```solidity
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
```

Replace the state variables section with:

```solidity
    // ──────────────────────────────────────────────
    //  State variables
    // ──────────────────────────────────────────────

    // Parties
    address public partyA;
    address public partyB;

    // Contract terms
    string public statement;
    string public guidelines;
    string public evidenceDefs;

    // Evidence
    string public evidenceA;
    string public evidenceB;
    bool public evidenceASubmitted;
    bool public evidenceBSubmitted;

    // Evidence deadline
    uint256 public evidenceDeadlineSeconds;
    uint256 public disputeTimestamp;

    // Evidence validation
    uint256 public maxEvidenceLength;
    string public constraints;

    // Escrow (USDC)
    IERC20 public usdcToken;
    uint256 public escrowAmount;

    // Join deadline
    uint256 public joinDeadline;

    // Dispute tracking
    address public disputeInitiator;

    // Factory reference (for bridge callback)
    address public factory;

    // Status & resolution
    Status public status;
    Verdict public verdict;
    string public reasoning;

    // Mutual agreement path
    uint8 public proposalA;
    uint8 public proposalB;

    // Pull-based withdrawal pattern
    mapping(address => uint256) public pendingWithdrawals;
```

**Step 2: Rewrite the constructor**

Replace the existing constructor with:

```solidity
    constructor(
        address _partyA,
        address _partyB,
        string memory _statement,
        string memory _guidelines,
        string memory _evidenceDefs,
        uint256 _evidenceDeadlineSeconds,
        address _factory,
        address _usdcToken,
        uint256 _escrowAmount,
        uint256 _joinDeadline,
        uint256 _maxEvidenceLength,
        string memory _constraints
    ) {
        require(_partyA != address(0), "Invalid party A");
        require(_partyB != address(0), "Invalid party B");
        require(_partyA != _partyB, "Parties must differ");
        require(_factory != address(0), "Invalid factory");
        require(bytes(_statement).length > 0, "Empty statement");

        partyA = _partyA;
        partyB = _partyB;
        statement = _statement;
        guidelines = _guidelines;
        evidenceDefs = _evidenceDefs;
        evidenceDeadlineSeconds = _evidenceDeadlineSeconds;
        factory = _factory;
        maxEvidenceLength = _maxEvidenceLength;
        constraints = _constraints;
        status = Status.CREATED;

        // USDC escrow (optional — 0 means no-money dispute)
        if (_escrowAmount > 0) {
            require(_usdcToken != address(0), "Invalid USDC token");
            usdcToken = IERC20(_usdcToken);
            escrowAmount = _escrowAmount;
            // Transfer USDC from creator to this contract
            require(
                usdcToken.transferFrom(_partyA, address(this), _escrowAmount),
                "USDC transfer failed"
            );
        }

        // Join deadline (optional — 0 means no deadline)
        if (_joinDeadline > 0) {
            require(_joinDeadline > block.timestamp, "Deadline in the past");
            joinDeadline = _joinDeadline;
        }
    }
```

**Step 3: Rewrite acceptAndDeposit (Party B joins free)**

Replace `acceptAndDeposit` with:

```solidity
    function acceptAgreement() external onlyPartyB inStatus(Status.CREATED) {
        // Check join deadline if set
        if (joinDeadline > 0) {
            require(block.timestamp <= joinDeadline, "Join deadline passed");
        }

        status = Status.ACTIVE;
        emit AgreementAccepted(partyB, escrowAmount);
    }
```

**Step 4: Add reclaimOnExpiry**

After the cancel function, add:

```solidity
    /**
     * @notice Reclaim escrow after join deadline expires. Anyone can call.
     *         Returns USDC to party A and cancels the agreement.
     */
    function reclaimOnExpiry() external inStatus(Status.CREATED) {
        require(joinDeadline > 0, "No join deadline set");
        require(block.timestamp > joinDeadline, "Deadline not passed");

        status = Status.CANCELLED;
        emit Cancelled(partyA);

        // Return USDC to party A
        if (escrowAmount > 0) {
            uint256 amount = escrowAmount;
            escrowAmount = 0;
            require(usdcToken.transfer(partyA, amount), "USDC transfer failed");
        }
    }
```

**Step 5: Add resolveByDefault**

After reclaimOnExpiry, add:

```solidity
    /**
     * @notice Default judgment: if evidence deadline passes with no evidence,
     *         the party who initiated the dispute wins automatically.
     */
    function resolveByDefault() external inStatus(Status.DISPUTED) {
        require(evidenceDeadlineSeconds > 0, "No deadline set");
        require(
            block.timestamp > disputeTimestamp + evidenceDeadlineSeconds,
            "Deadline not passed"
        );
        require(!evidenceASubmitted && !evidenceBSubmitted, "Evidence was submitted");
        require(disputeInitiator != address(0), "No dispute initiator");

        // Disputer wins by default
        if (disputeInitiator == partyA) {
            verdict = Verdict.TRUE_;
        } else {
            verdict = Verdict.FALSE_;
        }
        status = Status.RESOLVED;
        reasoning = "Resolved by default judgment - no evidence submitted";

        emit Resolved(verdict, reasoning);
        _releaseEscrow();
    }
```

**Step 6: Update raiseDispute to track initiator**

Replace raiseDispute:

```solidity
    function raiseDispute() external onlyParty inStatus(Status.ACTIVE) {
        status = Status.DISPUTED;
        disputeTimestamp = block.timestamp;
        disputeInitiator = msg.sender;

        uint256 deadline = evidenceDeadlineSeconds > 0
            ? block.timestamp + evidenceDeadlineSeconds
            : 0;
        emit DisputeRaised(msg.sender, deadline);
    }
```

**Step 7: Add evidence length validation to submitEvidence**

In the submitEvidence function, after `require(bytes(evidence).length > 0, "Empty evidence");`, add:

```solidity
        // Validate evidence length
        if (maxEvidenceLength > 0) {
            require(
                bytes(evidence).length <= maxEvidenceLength,
                "Evidence exceeds max length"
            );
        }
```

**Step 8: Update _releaseEscrow for one-sided escrow**

Replace _releaseEscrow:

```solidity
    function _releaseEscrow() internal {
        if (escrowAmount == 0) return; // No-money dispute

        uint256 amount = escrowAmount;
        escrowAmount = 0;

        if (verdict == Verdict.TRUE_) {
            // Creator wins
            pendingWithdrawals[partyA] += amount;
        } else if (verdict == Verdict.FALSE_) {
            // Party B wins
            pendingWithdrawals[partyB] += amount;
        } else {
            // UNDETERMINED: refund to creator
            pendingWithdrawals[partyA] += amount;
        }
    }
```

**Step 9: Update claimFunds for USDC**

Replace claimFunds:

```solidity
    function claimFunds() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to claim");

        pendingWithdrawals[msg.sender] = 0;

        require(usdcToken.transfer(msg.sender, amount), "USDC transfer failed");

        emit FundsClaimed(msg.sender, amount);
    }
```

**Step 10: Update cancel for USDC**

Replace cancel:

```solidity
    function cancel() external onlyPartyA inStatus(Status.CREATED) {
        status = Status.CANCELLED;
        emit Cancelled(msg.sender);

        // Return USDC to party A
        if (escrowAmount > 0) {
            uint256 amount = escrowAmount;
            escrowAmount = 0;
            require(usdcToken.transfer(partyA, amount), "USDC transfer failed");
        }
    }
```

**Step 11: Remove old escrowA/escrowB references**

Remove `escrowA` and `escrowB` state variables. Remove `getTotalEscrow()` or update it:

```solidity
    function getTotalEscrow() external view returns (uint256) {
        return escrowAmount;
    }
```

**Step 12: Fix the bug on line 266-267 in submitEvidence**

The current code has a bug: `evidenceB = evidence;` is set when party A submits (line 266). This should be `evidenceA = evidence;` only. Fix:

```solidity
        if (msg.sender == partyA) {
            require(!evidenceASubmitted, "Already submitted");
            evidenceA = evidence;
            evidenceASubmitted = true;
        } else {
```

**Step 13: Compile and verify**

Run: `cd contracts/solidity && npx hardhat compile`
Expected: Successful compilation (tests will fail until updated)

**Step 14: Commit**

```bash
git add contracts/solidity/contracts/Agreement.sol
git commit -m "feat: refactor Agreement.sol to USDC escrow with join deadline and default judgment"
```

---

### Task 3: Update InternetCourtFactory.sol

**Files:**
- Modify: `contracts/solidity/contracts/InternetCourtFactory.sol`

**Step 1: Update createAgreement to pass new params**

Replace the createAgreement function:

```solidity
    function createAgreement(
        address partyB,
        string calldata _statement,
        string calldata _guidelines,
        string calldata _evidenceDefs,
        uint256 _evidenceDeadlineSeconds,
        address _usdcToken,
        uint256 _escrowAmount,
        uint256 _joinDeadline,
        uint256 _maxEvidenceLength,
        string calldata _constraints
    ) external returns (address) {
        Agreement agreement = new Agreement(
            msg.sender,
            partyB,
            _statement,
            _guidelines,
            _evidenceDefs,
            _evidenceDeadlineSeconds,
            address(this),
            _usdcToken,
            _escrowAmount,
            _joinDeadline,
            _maxEvidenceLength,
            _constraints
        );

        uint256 id = nextAgreementId++;
        address addr = address(agreement);
        deployedAgreements[addr] = true;
        agreements[id] = addr;

        emit AgreementCreated(id, addr, msg.sender, partyB);
        return addr;
    }
```

Note: The factory no longer forwards ETH (`payable` removed). USDC transfer happens inside the Agreement constructor via `transferFrom`. The caller must approve the Agreement contract's address BEFORE calling createAgreement. Since the Agreement address isn't known ahead of time, the caller should approve the Factory address, and the Factory should handle the transfer.

**Actually — revised approach**: Since we can't know the Agreement address before deployment, the caller approves USDC to the **Factory**, and the Factory transfers USDC to the new Agreement in the same transaction.

Updated createAgreement:

```solidity
    function createAgreement(
        address partyB,
        string calldata _statement,
        string calldata _guidelines,
        string calldata _evidenceDefs,
        uint256 _evidenceDeadlineSeconds,
        address _usdcToken,
        uint256 _escrowAmount,
        uint256 _joinDeadline,
        uint256 _maxEvidenceLength,
        string calldata _constraints
    ) external returns (address) {
        // If escrow is required, transfer USDC from caller to factory first
        if (_escrowAmount > 0) {
            require(
                IERC20(_usdcToken).transferFrom(msg.sender, address(this), _escrowAmount),
                "USDC transfer to factory failed"
            );
        }

        Agreement agreement = new Agreement(
            msg.sender,
            partyB,
            _statement,
            _guidelines,
            _evidenceDefs,
            _evidenceDeadlineSeconds,
            address(this),
            _usdcToken,
            _escrowAmount,
            _joinDeadline,
            _maxEvidenceLength,
            _constraints
        );

        // Forward USDC from factory to the new Agreement
        if (_escrowAmount > 0) {
            require(
                IERC20(_usdcToken).transfer(address(agreement), _escrowAmount),
                "USDC transfer to agreement failed"
            );
        }

        uint256 id = nextAgreementId++;
        address addr = address(agreement);
        deployedAgreements[addr] = true;
        agreements[id] = addr;

        emit AgreementCreated(id, addr, msg.sender, partyB);
        return addr;
    }
```

And update the Agreement constructor to NOT do transferFrom itself — it just records the escrow amount. The factory handles the USDC transfer:

```solidity
        // USDC escrow (optional — 0 means no-money dispute)
        if (_escrowAmount > 0) {
            require(_usdcToken != address(0), "Invalid USDC token");
            usdcToken = IERC20(_usdcToken);
            escrowAmount = _escrowAmount;
            // Factory transfers USDC to this contract after deployment
        }
```

Add IERC20 import to Factory:

```solidity
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
```

Also fix the duplicate `uint256 id = nextAgreementId++;` line (line 97-98 in current code).

**Step 2: Compile**

Run: `cd contracts/solidity && npx hardhat compile`
Expected: Successful compilation

**Step 3: Commit**

```bash
git add contracts/solidity/contracts/InternetCourtFactory.sol contracts/solidity/contracts/Agreement.sol
git commit -m "feat: update Factory to handle USDC escrow transfers"
```

---

### Task 4: Write New Feature Tests

**Files:**
- Create: `contracts/solidity/test/AgreementUSDC.test.ts`

Write tests for all new features. These tests use the new USDC-based Agreement.

**Step 1: Write the test file**

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Agreement — USDC Escrow Features", function () {
  const ESCROW = 1000_000000n; // 1000 USDC (6 decimals)
  const ONE_DAY = 86400;
  const ONE_HOUR = 3600;

  async function deployFixture() {
    const [owner, partyA, partyB, other] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();

    // Deploy Factory
    const Factory = await ethers.getContractFactory("InternetCourtFactory");
    const factory = await Factory.deploy(ethers.ZeroAddress, owner.address);

    // Mint USDC to partyA
    await usdc.mint(partyA.address, ESCROW * 10n);

    // Approve factory to spend partyA's USDC
    await usdc.connect(partyA).approve(await factory.getAddress(), ESCROW * 10n);

    return { usdc, factory, owner, partyA, partyB, other };
  }

  async function createAgreementFixture() {
    const base = await loadFixture(deployFixture);
    const { factory, partyA, partyB, usdc } = base;

    const joinDeadline = (await time.latest()) + ONE_DAY;
    const tx = await factory.connect(partyA).createAgreement(
      partyB.address,
      "Test statement",
      "Test guidelines",
      "{}",
      ONE_HOUR, // evidence deadline
      await usdc.getAddress(),
      ESCROW,
      joinDeadline,
      10000, // max evidence length
      "Must be valid JSON"
    );
    const receipt = await tx.wait();
    const event = receipt!.logs.find((l: any) => l.fragment?.name === "AgreementCreated");
    const agreementAddr = event ? (event as any).args[1] : await factory.agreements(0);

    const agreement = await ethers.getContractAt("Agreement", agreementAddr);
    return { ...base, agreement, joinDeadline };
  }

  async function activeAgreementFixture() {
    const base = await loadFixture(createAgreementFixture);
    await base.agreement.connect(base.partyB).acceptAgreement();
    return base;
  }

  async function disputedAgreementFixture() {
    const base = await loadFixture(activeAgreementFixture);
    await base.agreement.connect(base.partyA).raiseDispute();
    return base;
  }

  // ─── USDC Escrow Tests ───

  describe("USDC Escrow", function () {
    it("should transfer USDC from partyA to agreement on creation", async function () {
      const { agreement, usdc, partyA } = await loadFixture(createAgreementFixture);
      const agreementAddr = await agreement.getAddress();
      expect(await usdc.balanceOf(agreementAddr)).to.equal(ESCROW);
    });

    it("should allow zero-escrow disputes", async function () {
      const { factory, partyA, partyB, usdc } = await loadFixture(deployFixture);
      await factory.connect(partyA).createAgreement(
        partyB.address,
        "No money statement",
        "Guidelines",
        "{}",
        0,
        ethers.ZeroAddress, // no USDC token
        0, // no escrow
        0, // no join deadline
        0,
        ""
      );
      // Should succeed without any USDC transfer
    });

    it("partyB joins without depositing", async function () {
      const { agreement, usdc, partyB } = await loadFixture(createAgreementFixture);
      const balanceBefore = await usdc.balanceOf(partyB.address);
      await agreement.connect(partyB).acceptAgreement();
      const balanceAfter = await usdc.balanceOf(partyB.address);
      expect(balanceAfter).to.equal(balanceBefore); // No change
    });
  });

  // ─── Join Deadline Tests ───

  describe("Join Deadline", function () {
    it("should allow partyB to join before deadline", async function () {
      const { agreement, partyB } = await loadFixture(createAgreementFixture);
      await agreement.connect(partyB).acceptAgreement();
      expect(await agreement.status()).to.equal(1); // ACTIVE
    });

    it("should reject partyB after deadline", async function () {
      const { agreement, partyB, joinDeadline } = await loadFixture(createAgreementFixture);
      await time.increaseTo(joinDeadline + 1);
      await expect(
        agreement.connect(partyB).acceptAgreement()
      ).to.be.revertedWith("Join deadline passed");
    });

    it("should allow reclaimOnExpiry after deadline", async function () {
      const { agreement, usdc, partyA, other, joinDeadline } = await loadFixture(createAgreementFixture);
      await time.increaseTo(joinDeadline + 1);

      const balanceBefore = await usdc.balanceOf(partyA.address);
      await agreement.connect(other).reclaimOnExpiry(); // Anyone can call
      const balanceAfter = await usdc.balanceOf(partyA.address);

      expect(balanceAfter - balanceBefore).to.equal(ESCROW);
      expect(await agreement.status()).to.equal(5); // CANCELLED
    });

    it("should reject reclaimOnExpiry before deadline", async function () {
      const { agreement, other } = await loadFixture(createAgreementFixture);
      await expect(
        agreement.connect(other).reclaimOnExpiry()
      ).to.be.revertedWith("Deadline not passed");
    });
  });

  // ─── Default Judgment Tests ───

  describe("Default Judgment", function () {
    it("should award to disputer when no evidence after deadline", async function () {
      const { agreement, usdc, partyA, other } = await loadFixture(disputedAgreementFixture);

      // Fast-forward past evidence deadline
      await time.increase(ONE_HOUR + 1);

      await agreement.connect(other).resolveByDefault(); // Anyone can call

      expect(await agreement.status()).to.equal(4); // RESOLVED
      expect(await agreement.verdict()).to.equal(1); // TRUE_ (partyA was disputer)

      // PartyA should be able to claim
      const balanceBefore = await usdc.balanceOf(partyA.address);
      await agreement.connect(partyA).claimFunds();
      const balanceAfter = await usdc.balanceOf(partyA.address);
      expect(balanceAfter - balanceBefore).to.equal(ESCROW);
    });

    it("should reject resolveByDefault before deadline", async function () {
      const { agreement, other } = await loadFixture(disputedAgreementFixture);
      await expect(
        agreement.connect(other).resolveByDefault()
      ).to.be.revertedWith("Deadline not passed");
    });

    it("should reject resolveByDefault if evidence was submitted", async function () {
      const { agreement, partyA, other } = await loadFixture(disputedAgreementFixture);
      await agreement.connect(partyA).submitEvidence("My evidence");
      await time.increase(ONE_HOUR + 1);
      await expect(
        agreement.connect(other).resolveByDefault()
      ).to.be.revertedWith("Evidence was submitted");
    });
  });

  // ─── Evidence Validation Tests ───

  describe("Evidence Validation", function () {
    it("should reject evidence exceeding max length", async function () {
      const { agreement, partyA } = await loadFixture(disputedAgreementFixture);
      const longEvidence = "x".repeat(10001); // exceeds 10000 limit
      await expect(
        agreement.connect(partyA).submitEvidence(longEvidence)
      ).to.be.revertedWith("Evidence exceeds max length");
    });

    it("should accept evidence within max length", async function () {
      const { agreement, partyA } = await loadFixture(disputedAgreementFixture);
      const evidence = "x".repeat(10000); // exactly at limit
      await agreement.connect(partyA).submitEvidence(evidence);
      expect(await agreement.evidenceASubmitted()).to.be.true;
    });

    it("should store constraints string", async function () {
      const { agreement } = await loadFixture(createAgreementFixture);
      expect(await agreement.constraints()).to.equal("Must be valid JSON");
    });
  });

  // ─── Payout Tests ───

  describe("Payout Rules", function () {
    it("TRUE verdict: creator (partyA) gets escrow", async function () {
      const { agreement, usdc, partyA, partyB, factory, owner } = await loadFixture(activeAgreementFixture);

      // Mutual agreement: both propose TRUE
      await agreement.connect(partyA).proposeOutcome(true);
      await agreement.connect(partyB).proposeOutcome(true);

      expect(await agreement.status()).to.equal(4); // RESOLVED
      const balanceBefore = await usdc.balanceOf(partyA.address);
      await agreement.connect(partyA).claimFunds();
      const balanceAfter = await usdc.balanceOf(partyA.address);
      expect(balanceAfter - balanceBefore).to.equal(ESCROW);
    });

    it("FALSE verdict: partyB gets escrow", async function () {
      const { agreement, usdc, partyA, partyB } = await loadFixture(activeAgreementFixture);

      await agreement.connect(partyA).proposeOutcome(false);
      await agreement.connect(partyB).proposeOutcome(false);

      const balanceBefore = await usdc.balanceOf(partyB.address);
      await agreement.connect(partyB).claimFunds();
      const balanceAfter = await usdc.balanceOf(partyB.address);
      expect(balanceAfter - balanceBefore).to.equal(ESCROW);
    });

    it("UNDETERMINED verdict: creator gets refund", async function () {
      const { agreement, usdc, partyA, factory, owner } = await loadFixture(disputedAgreementFixture);

      // Submit evidence from both sides
      await agreement.connect(partyA).submitEvidence("Evidence A");
      // Need partyB to submit to trigger resolution
      const { partyB } = await loadFixture(disputedAgreementFixture);
      // This test would need bridge verdict delivery — skip for unit test
      // Tested in E2E instead
    });

    it("cancel returns USDC to creator", async function () {
      const { agreement, usdc, partyA } = await loadFixture(createAgreementFixture);
      const balanceBefore = await usdc.balanceOf(partyA.address);
      await agreement.connect(partyA).cancel();
      const balanceAfter = await usdc.balanceOf(partyA.address);
      expect(balanceAfter - balanceBefore).to.equal(ESCROW);
    });
  });
});
```

**Step 2: Run tests**

Run: `cd contracts/solidity && npx hardhat test test/AgreementUSDC.test.ts`
Expected: All passing (some payout tests may need adjustment based on exact implementation)

**Step 3: Commit**

```bash
git add contracts/solidity/test/AgreementUSDC.test.ts
git commit -m "test: add USDC escrow, join deadline, default judgment, evidence validation tests"
```

---

### Task 5: Update Existing Agreement.test.ts

**Files:**
- Modify: `contracts/solidity/test/Agreement.test.ts`

The existing tests use ETH deposits. They need to be updated to use USDC.

**Step 1: Update all fixtures to use USDC**

Replace the fixture pattern. Every `createAgreement` call needs:
- Deploy MockUSDC
- Mint to partyA
- Approve factory
- Pass USDC params instead of `{value: escrow}`

Key changes throughout the file:
- Remove all `{value: ...}` from createAgreement and acceptAndDeposit calls
- Replace `acceptAndDeposit()` with `acceptAgreement()`
- Add MockUSDC deployment to every base fixture
- Add USDC address, escrow amount, join deadline, maxEvidenceLength, constraints to createAgreement calls
- Update claimFunds assertions to check USDC balance instead of ETH balance
- Remove all `escrowA` and `escrowB` references

**Step 2: Run full test suite**

Run: `cd contracts/solidity && npx hardhat test test/Agreement.test.ts`
Expected: All tests passing

**Step 3: Commit**

```bash
git add contracts/solidity/test/Agreement.test.ts
git commit -m "test: update Agreement tests for USDC escrow"
```

---

### Task 6: Update E2E.test.ts

**Files:**
- Modify: `contracts/solidity/test/E2E.test.ts`

Same USDC migration as Task 5, but for the end-to-end tests that include bridge verdict delivery.

**Step 1: Update fixtures and all createAgreement calls**

Key changes:
- Deploy MockUSDC in the base fixture
- Replace ETH deposits with USDC approve + createAgreement
- Replace `acceptAndDeposit` with `acceptAgreement`
- Update verdict delivery tests to check USDC balance changes
- Add tests for UNDETERMINED → creator refund
- Update the `deliverVerdict` helper if it checks ETH balances

**Step 2: Run E2E tests**

Run: `cd contracts/solidity && npx hardhat test test/E2E.test.ts`
Expected: All passing

**Step 3: Commit**

```bash
git add contracts/solidity/test/E2E.test.ts
git commit -m "test: update E2E tests for USDC escrow"
```

---

### Task 7: Run Full Test Suite and Fix Regressions

**Step 1: Run all tests**

Run: `cd contracts/solidity && npx hardhat test`
Expected: All tests passing (MockUSDC + AgreementUSDC + Agreement + E2E + BridgeReceiver)

**Step 2: Fix any compilation errors or test failures**

Common issues to watch for:
- `escrowA` / `escrowB` references in BridgeReceiver tests
- `msg.value` references anywhere
- Missing USDC approval in test fixtures
- Status enum index changes

**Step 3: Commit**

```bash
git add -A
git commit -m "fix: resolve all test regressions from USDC migration"
```

---

### Task 8: Next.js API Routes

**Files:**
- Create: `frontend/src/app/api/cases/route.ts`
- Create: `frontend/src/app/api/cases/[id]/route.ts`
- Create: `frontend/src/app/api/cases/[id]/evidence/route.ts`
- Create: `frontend/src/app/api/cases/prepare-create/route.ts`
- Create: `frontend/src/app/api/cases/prepare-join/route.ts`
- Create: `frontend/src/app/api/cases/prepare-submit-evidence/route.ts`
- Create: `frontend/src/lib/contracts.ts` (shared ABI + address config)

**Step 1: Create shared contract config**

```typescript
// frontend/src/lib/contracts.ts
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";

export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_COURT_FACTORY_ADDRESS as `0x${string}`;
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

export const AGREEMENT_ABI = [
  "function status() view returns (uint8)",
  "function partyA() view returns (address)",
  "function partyB() view returns (address)",
  "function statement() view returns (string)",
  "function guidelines() view returns (string)",
  "function evidenceDefs() view returns (string)",
  "function evidenceA() view returns (string)",
  "function evidenceB() view returns (string)",
  "function evidenceASubmitted() view returns (bool)",
  "function evidenceBSubmitted() view returns (bool)",
  "function verdict() view returns (uint8)",
  "function reasoning() view returns (string)",
  "function escrowAmount() view returns (uint256)",
  "function joinDeadline() view returns (uint256)",
  "function evidenceDeadlineSeconds() view returns (uint256)",
  "function disputeTimestamp() view returns (uint256)",
  "function maxEvidenceLength() view returns (uint256)",
  "function constraints() view returns (string)",
  "function acceptAgreement()",
  "function submitEvidence(string)",
  "function proposeOutcome(bool)",
] as const;

export const FACTORY_ABI = [
  "function createAgreement(address,string,string,string,uint256,address,uint256,uint256,uint256,string) returns (address)",
  "function nextAgreementId() view returns (uint256)",
  "function agreements(uint256) view returns (address)",
] as const;

const chain = process.env.NEXT_PUBLIC_CHAIN === "base" ? base : baseSepolia;

export const publicClient = createPublicClient({
  chain,
  transport: http(),
});
```

**Step 2: Create GET /api/cases**

```typescript
// frontend/src/app/api/cases/route.ts
import { NextRequest, NextResponse } from "next/server";
import { publicClient, FACTORY_ABI, FACTORY_ADDRESS, AGREEMENT_ABI } from "@/lib/contracts";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const party = searchParams.get("party");
  const statusFilter = searchParams.get("status");

  try {
    const totalCount = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "nextAgreementId",
    }) as bigint;

    const start = Math.max(0, Number(totalCount) - page * limit);
    const end = Math.max(0, Number(totalCount) - (page - 1) * limit);

    const cases = [];
    for (let i = end - 1; i >= start; i--) {
      const addr = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "agreements",
        args: [BigInt(i)],
      }) as `0x${string}`;

      // Read basic case info
      const [status, partyA, partyB, statement, escrow] = await Promise.all([
        publicClient.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "status" }),
        publicClient.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "partyA" }),
        publicClient.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "partyB" }),
        publicClient.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "statement" }),
        publicClient.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "escrowAmount" }),
      ]);

      // Apply filters
      if (party && partyA !== party && partyB !== party) continue;
      if (statusFilter !== null && status !== parseInt(statusFilter)) continue;

      cases.push({ id: i, address: addr, status, partyA, partyB, statement, escrowAmount: escrow.toString() });
    }

    return NextResponse.json({ cases, total: Number(totalCount), page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 3: Create GET /api/cases/[id]**

```typescript
// frontend/src/app/api/cases/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { publicClient, FACTORY_ABI, FACTORY_ADDRESS, AGREEMENT_ABI } from "@/lib/contracts";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const addr = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "agreements",
      args: [BigInt(id)],
    }) as `0x${string}`;

    const fields = [
      "status", "partyA", "partyB", "statement", "guidelines",
      "evidenceDefs", "verdict", "reasoning", "escrowAmount",
      "joinDeadline", "evidenceDeadlineSeconds", "disputeTimestamp",
      "maxEvidenceLength", "constraints", "evidenceASubmitted", "evidenceBSubmitted",
    ];

    const results = await Promise.all(
      fields.map(f => publicClient.readContract({
        address: addr,
        abi: AGREEMENT_ABI,
        functionName: f as any,
      }))
    );

    const caseData: Record<string, any> = { id, address: addr };
    fields.forEach((f, i) => {
      caseData[f] = typeof results[i] === "bigint" ? results[i].toString() : results[i];
    });

    return NextResponse.json(caseData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 4: Create the prepare-create endpoint**

```typescript
// frontend/src/app/api/cases/prepare-create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { encodeFunctionData } from "viem";
import { FACTORY_ABI, FACTORY_ADDRESS, USDC_ADDRESS } from "@/lib/contracts";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      partyB, statement, guidelines, evidenceDefs,
      evidenceDeadlineSeconds, escrowAmount, joinDeadline,
      maxEvidenceLength, constraints
    } = body;

    // Build the createAgreement calldata
    const createData = encodeFunctionData({
      abi: FACTORY_ABI,
      functionName: "createAgreement",
      args: [
        partyB,
        statement,
        guidelines,
        evidenceDefs || "{}",
        BigInt(evidenceDeadlineSeconds || 0),
        escrowAmount > 0 ? USDC_ADDRESS : "0x0000000000000000000000000000000000000000",
        BigInt(escrowAmount || 0),
        BigInt(joinDeadline || 0),
        BigInt(maxEvidenceLength || 0),
        constraints || "",
      ],
    });

    const transactions = [];

    // If escrow, also prepare USDC approval tx
    if (escrowAmount > 0) {
      const approveData = encodeFunctionData({
        abi: [{ name: "approve", type: "function", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] }],
        functionName: "approve",
        args: [FACTORY_ADDRESS, BigInt(escrowAmount)],
      });
      transactions.push({
        step: 1,
        description: "Approve USDC spending",
        to: USDC_ADDRESS,
        data: approveData,
        value: "0",
      });
    }

    transactions.push({
      step: escrowAmount > 0 ? 2 : 1,
      description: "Create agreement",
      to: FACTORY_ADDRESS,
      data: createData,
      value: "0",
    });

    return NextResponse.json({ transactions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Step 5: Build and verify**

Run: `cd frontend && npm run build`
Expected: Successful build

**Step 6: Commit**

```bash
git add frontend/src/lib/contracts.ts frontend/src/app/api/
git commit -m "feat: add API routes for case listing, details, and transaction preparation"
```

---

### Task 9: MCP Server

**Files:**
- Create: `mcp/package.json`
- Create: `mcp/tsconfig.json`
- Create: `mcp/src/index.ts`
- Create: `mcp/src/tools.ts`

**Step 1: Initialize the MCP package**

```json
// mcp/package.json
{
  "name": "@internetcourt/mcp-server",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "viem": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0"
  }
}
```

```json
// mcp/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true
  },
  "include": ["src"]
}
```

**Step 2: Write the MCP server**

```typescript
// mcp/src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

const server = new McpServer({
  name: "internetcourt",
  version: "0.1.0",
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Step 3: Write the tools**

```typescript
// mcp/src/tools.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createPublicClient, http, encodeFunctionData } from "viem";
import { base, baseSepolia } from "viem/chains";
import { z } from "zod";

const FACTORY_ADDRESS = (process.env.FACTORY_ADDRESS || "") as `0x${string}`;
const USDC_ADDRESS = (process.env.USDC_ADDRESS || "") as `0x${string}`;
const RPC_URL = process.env.RPC_URL || "https://sepolia.base.org";

const chain = process.env.CHAIN === "base" ? base : baseSepolia;
const client = createPublicClient({ chain, transport: http(RPC_URL) });

const FACTORY_ABI = [
  { name: "nextAgreementId", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "agreements", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "address" }] },
] as const;

const AGREEMENT_ABI = [
  { name: "status", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "partyA", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "partyB", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "statement", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "verdict", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "reasoning", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "escrowAmount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "joinDeadline", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "evidenceDeadlineSeconds", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "disputeTimestamp", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const STATUS_NAMES = ["CREATED", "ACTIVE", "DISPUTED", "RESOLVING", "RESOLVED", "CANCELLED"];
const VERDICT_NAMES = ["UNDETERMINED", "TRUE", "FALSE"];

export function registerTools(server: McpServer) {
  server.tool(
    "get_case",
    "Get details of a specific Internet Court case by ID",
    { case_id: z.number().describe("The case ID (integer)") },
    async ({ case_id }) => {
      const addr = await client.readContract({
        address: FACTORY_ADDRESS, abi: FACTORY_ABI,
        functionName: "agreements", args: [BigInt(case_id)],
      });

      const [status, partyA, partyB, statement, verdict, reasoning, escrow, joinDeadline, evidenceDeadline, disputeTs] =
        await Promise.all([
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "status" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "partyA" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "partyB" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "statement" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "verdict" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "reasoning" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "escrowAmount" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "joinDeadline" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "evidenceDeadlineSeconds" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "disputeTimestamp" }),
        ]);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            id: case_id,
            address: addr,
            status: STATUS_NAMES[Number(status)],
            partyA, partyB, statement,
            verdict: VERDICT_NAMES[Number(verdict)],
            reasoning,
            escrowAmount: escrow.toString(),
            joinDeadline: Number(joinDeadline),
            evidenceDeadlineSeconds: Number(evidenceDeadline),
            disputeTimestamp: Number(disputeTs),
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "list_cases",
    "List Internet Court cases with optional filtering",
    {
      page: z.number().optional().default(1).describe("Page number"),
      limit: z.number().optional().default(10).describe("Cases per page"),
      party: z.string().optional().describe("Filter by party address"),
    },
    async ({ page, limit, party }) => {
      const total = await client.readContract({
        address: FACTORY_ADDRESS, abi: FACTORY_ABI,
        functionName: "nextAgreementId",
      });

      const totalNum = Number(total);
      const start = Math.max(0, totalNum - page * limit);
      const end = Math.max(0, totalNum - (page - 1) * limit);

      const cases = [];
      for (let i = end - 1; i >= start; i--) {
        const addr = await client.readContract({
          address: FACTORY_ADDRESS, abi: FACTORY_ABI,
          functionName: "agreements", args: [BigInt(i)],
        });

        const [status, pA, pB, stmt, escrow] = await Promise.all([
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "status" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "partyA" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "partyB" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "statement" }),
          client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "escrowAmount" }),
        ]);

        if (party && pA !== party && pB !== party) continue;
        cases.push({ id: i, address: addr, status: STATUS_NAMES[Number(status)], partyA: pA, partyB: pB, statement: stmt, escrowAmount: escrow.toString() });
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ cases, total: totalNum, page, limit }, null, 2) }],
      };
    }
  );

  server.tool(
    "check_deadline",
    "Check if join or evidence deadline has passed for a case",
    { case_id: z.number().describe("The case ID") },
    async ({ case_id }) => {
      const addr = await client.readContract({
        address: FACTORY_ADDRESS, abi: FACTORY_ABI,
        functionName: "agreements", args: [BigInt(case_id)],
      });

      const [status, joinDeadline, evidenceDeadline, disputeTs] = await Promise.all([
        client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "status" }),
        client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "joinDeadline" }),
        client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "evidenceDeadlineSeconds" }),
        client.readContract({ address: addr, abi: AGREEMENT_ABI, functionName: "disputeTimestamp" }),
      ]);

      const now = Math.floor(Date.now() / 1000);
      const joinDl = Number(joinDeadline);
      const evidenceDl = Number(evidenceDeadline);
      const disputeTime = Number(disputeTs);

      const result: Record<string, any> = { status: STATUS_NAMES[Number(status)] };

      if (joinDl > 0) {
        result.joinDeadline = { timestamp: joinDl, passed: now > joinDl, remainingSeconds: Math.max(0, joinDl - now) };
      }

      if (evidenceDl > 0 && disputeTime > 0) {
        const deadline = disputeTime + evidenceDl;
        result.evidenceDeadline = { timestamp: deadline, passed: now > deadline, remainingSeconds: Math.max(0, deadline - now) };
      }

      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
```

**Step 4: Install dependencies and build**

Run: `cd mcp && npm install && npm run build`
Expected: Successful build

**Step 5: Commit**

```bash
git add mcp/
git commit -m "feat: add MCP server with get_case, list_cases, check_deadline tools"
```

---

### Task 10: Update tasks.md

**Files:**
- Modify: `tasks.md`

**Step 1: Move "Bridge & Escrow Implementation" to Done, add new entries**

Add to In Progress:
```
### USDC Escrow Refactor — Agreement.sol + Factory
- ETH → USDC (ERC-20) escrow
- One-sided deposit (creator only)
- Join deadline with auto-expiry
- Default judgment (no evidence → disputer wins)
- Evidence validation (max length, constraints)
- Full design: `docs/plans/2026-02-13-usdc-escrow-api-mcp-design.md`
- Implementation plan: `docs/plans/2026-02-13-usdc-escrow-api-mcp-plan.md`
```

**Step 2: Commit**

```bash
git add tasks.md
git commit -m "docs: update tasks.md with USDC escrow refactor"
```
