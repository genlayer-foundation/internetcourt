// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IInternetCourtFactory {
    function requestDispute(address agreementAddress) external;
}

/**
 * @title Agreement
 * @notice Individual agreement contract deployed per case. Manages USDC escrow, state machine,
 *         evidence submission, mutual agreement path, and bridge-delivered verdicts.
 *
 * State machine: CREATED -> ACTIVE -> DISPUTED -> RESOLVING -> RESOLVED / CANCELLED
 *
 * Escrow is held in USDC (ERC-20). Party A deposits escrow at creation (via factory).
 * Party B joins free (no deposit required).
 *
 * Two resolution paths:
 *   1. Mutual agreement (2-of-2): Both parties propose the same outcome -> resolves without jury
 *   2. Dispute path: Evidence submitted -> AI jury evaluates -> verdict delivered via bridge
 */
contract Agreement {
    // ──────────────────────────────────────────────
    //  Enums
    // ──────────────────────────────────────────────

    enum Status { CREATED, ACTIVE, DISPUTED, RESOLVING, RESOLVED, CANCELLED }
    enum Verdict { UNDETERMINED, TRUE_, FALSE_ }

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

    // Escrow (USDC)
    IERC20 public usdcToken;
    uint256 public escrowAmount;

    // Join deadline
    uint256 public joinDeadline;

    // Dispute initiator (for default judgment)
    address public disputeInitiator;

    // Evidence constraints
    uint256 public maxEvidenceLength;
    string public constraints;

    // Factory reference (for bridge callback)
    address public factory;

    // Status & resolution
    Status public status;
    Verdict public verdict;
    string public reasoning;

    // Mutual agreement path
    // 0 = no proposal, 1 = TRUE proposed, 2 = FALSE proposed
    uint8 public proposalA;
    uint8 public proposalB;

    // Pull-based withdrawal pattern: pending amounts per party
    mapping(address => uint256) public pendingWithdrawals;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event AgreementAccepted(address indexed partyB, uint256 escrowAmount);
    event OutcomeProposed(address indexed proposer, bool statementIsTrue);
    event OutcomeConfirmed(Verdict verdict);
    event DisputeRaised(address indexed raisedBy, uint256 evidenceDeadline);
    event EvidenceSubmitted(address indexed submitter);
    event ResolutionTriggered(uint256 timestamp);
    event Resolved(Verdict verdict, string reasoning);
    event FundsClaimed(address indexed claimant, uint256 amount);
    event Cancelled(address indexed cancelledBy);

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier onlyPartyA() {
        require(msg.sender == partyA, "Only party A");
        _;
    }

    modifier onlyPartyB() {
        require(msg.sender == partyB, "Only party B");
        _;
    }

    modifier onlyParty() {
        require(msg.sender == partyA || msg.sender == partyB, "Only a party");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    modifier inStatus(Status _status) {
        require(status == _status, "Wrong status");
        _;
    }

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    /**
     * @notice Deploy a new agreement. The factory handles USDC transfer before deployment.
     * @param _partyA Address of party A (the creator)
     * @param _partyB Address of party B (the counterparty)
     * @param _statement The claim to be evaluated as true/false
     * @param _guidelines Instructions for how the AI jury should evaluate the statement
     * @param _evidenceDefs What types of evidence each side can submit
     * @param _evidenceDeadlineSeconds Seconds after dispute for evidence submission window
     * @param _factory Address of the InternetCourtFactory contract
     * @param _usdcToken Address of the USDC token contract
     * @param _escrowAmount Amount of USDC escrowed by party A
     * @param _joinDeadline Timestamp by which party B must accept (0 = no deadline)
     * @param _maxEvidenceLength Maximum length of evidence in bytes (0 = no limit)
     * @param _constraints Additional constraints string
     */
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
        if (_escrowAmount > 0) {
            require(_usdcToken != address(0), "USDC token required for escrow");
        }
        if (_joinDeadline > 0) {
            require(_joinDeadline > block.timestamp, "Join deadline must be in the future");
        }

        partyA = _partyA;
        partyB = _partyB;
        statement = _statement;
        guidelines = _guidelines;
        evidenceDefs = _evidenceDefs;
        evidenceDeadlineSeconds = _evidenceDeadlineSeconds;
        factory = _factory;
        usdcToken = IERC20(_usdcToken);
        escrowAmount = _escrowAmount;
        joinDeadline = _joinDeadline;
        maxEvidenceLength = _maxEvidenceLength;
        constraints = _constraints;
        status = Status.CREATED;
    }

    // ──────────────────────────────────────────────
    //  Party B: Accept agreement
    // ──────────────────────────────────────────────

    /**
     * @notice Party B accepts the agreement. No deposit required.
     */
    function acceptAgreement() external onlyPartyB inStatus(Status.CREATED) {
        if (joinDeadline > 0) {
            require(block.timestamp <= joinDeadline, "Join deadline passed");
        }

        status = Status.ACTIVE;

        emit AgreementAccepted(partyB, escrowAmount);
    }

    // ──────────────────────────────────────────────
    //  Reclaim on expiry
    // ──────────────────────────────────────────────

    /**
     * @notice Reclaim escrowed USDC after the join deadline has expired without party B accepting.
     *         Anyone can call this to trigger the reclaim.
     */
    function reclaimOnExpiry() external inStatus(Status.CREATED) {
        require(joinDeadline > 0, "No join deadline set");
        require(block.timestamp > joinDeadline, "Deadline not passed");

        status = Status.CANCELLED;

        emit Cancelled(partyA);

        if (escrowAmount > 0) {
            uint256 amount = escrowAmount;
            escrowAmount = 0;
            require(usdcToken.transfer(partyA, amount), "USDC transfer failed");
        }
    }

    // ──────────────────────────────────────────────
    //  Mutual agreement path (2-of-2)
    // ──────────────────────────────────────────────

    /**
     * @notice Propose an outcome. If both parties propose the same outcome, the agreement resolves.
     * @param statementIsTrue true = statement is TRUE, false = statement is FALSE
     */
    function proposeOutcome(bool statementIsTrue) external onlyParty inStatus(Status.ACTIVE) {
        uint8 proposal = statementIsTrue ? 1 : 2;

        if (msg.sender == partyA) {
            proposalA = proposal;
        } else {
            proposalB = proposal;
        }

        emit OutcomeProposed(msg.sender, statementIsTrue);

        // Check if both parties have proposed the same outcome
        if (proposalA != 0 && proposalA == proposalB) {
            verdict = proposalA == 1 ? Verdict.TRUE_ : Verdict.FALSE_;
            status = Status.RESOLVED;
            reasoning = "Resolved by mutual agreement";

            emit OutcomeConfirmed(verdict);
            emit Resolved(verdict, reasoning);

            _releaseEscrow();
        }
    }

    /**
     * @notice Confirm the other party's proposed outcome. Shorthand for proposing the same outcome.
     *         Only callable if the other party has already proposed.
     */
    function confirmOutcome() external onlyParty inStatus(Status.ACTIVE) {
        uint8 otherProposal;

        if (msg.sender == partyA) {
            otherProposal = proposalB;
            require(otherProposal != 0, "No proposal to confirm");
            proposalA = otherProposal;
        } else {
            otherProposal = proposalA;
            require(otherProposal != 0, "No proposal to confirm");
            proposalB = otherProposal;
        }

        verdict = otherProposal == 1 ? Verdict.TRUE_ : Verdict.FALSE_;
        status = Status.RESOLVED;
        reasoning = "Resolved by mutual agreement";

        emit OutcomeConfirmed(verdict);
        emit Resolved(verdict, reasoning);

        _releaseEscrow();
    }

    // ──────────────────────────────────────────────
    //  Dispute path
    // ──────────────────────────────────────────────

    /**
     * @notice Raise a dispute. Opens the evidence submission window.
     *         Can be called by either party when the agreement is ACTIVE.
     */
    function raiseDispute() external onlyParty inStatus(Status.ACTIVE) {
        status = Status.DISPUTED;
        disputeTimestamp = block.timestamp;
        disputeInitiator = msg.sender;

        uint256 deadline = block.timestamp + evidenceDeadlineSeconds;
        emit DisputeRaised(msg.sender, deadline);
    }

    /**
     * @notice Submit evidence. Each party can submit once during the evidence window.
     * @param evidence The evidence string (content depends on evidenceDefs)
     */
    function submitEvidence(string calldata evidence) external onlyParty inStatus(Status.DISPUTED) {
        require(bytes(evidence).length > 0, "Empty evidence");

        if (maxEvidenceLength > 0) {
            require(bytes(evidence).length <= maxEvidenceLength, "Evidence exceeds max length");
        }

        // Check evidence deadline
        if (evidenceDeadlineSeconds > 0) {
            require(
                block.timestamp <= disputeTimestamp + evidenceDeadlineSeconds,
                "Evidence deadline passed"
            );
        }

        if (msg.sender == partyA) {
            require(!evidenceASubmitted, "Already submitted");
            evidenceA = evidence;
            evidenceASubmitted = true;
        } else {
            require(!evidenceBSubmitted, "Already submitted");
            evidenceB = evidence;
            evidenceBSubmitted = true;
        }

        emit EvidenceSubmitted(msg.sender);

        // If both parties have submitted, trigger resolution
        if (evidenceASubmitted && evidenceBSubmitted) {
            _triggerResolution();
        }
    }

    /**
     * @notice Close the evidence window and trigger resolution after the deadline.
     *         Anyone can call this once the evidence deadline has passed.
     */
    function closeEvidenceWindow() external inStatus(Status.DISPUTED) {
        require(evidenceDeadlineSeconds > 0, "No deadline set");
        require(
            block.timestamp > disputeTimestamp + evidenceDeadlineSeconds,
            "Deadline not passed"
        );

        _triggerResolution();
    }

    // ──────────────────────────────────────────────
    //  Default judgment
    // ──────────────────────────────────────────────

    /**
     * @notice Resolve by default judgment when no evidence was submitted after the deadline.
     *         The dispute initiator wins by default.
     */
    function resolveByDefault() external inStatus(Status.DISPUTED) {
        require(evidenceDeadlineSeconds > 0, "No deadline set");
        require(block.timestamp > disputeTimestamp + evidenceDeadlineSeconds, "Deadline not passed");
        require(!evidenceASubmitted && !evidenceBSubmitted, "Evidence was submitted");
        require(disputeInitiator != address(0), "No dispute initiator");

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

    // ──────────────────────────────────────────────
    //  Bridge verdict (factory-only)
    // ──────────────────────────────────────────────

    /**
     * @notice Set the resolution verdict. Only callable by the factory (via bridge).
     * @param _verdict The verdict: 0 = UNDETERMINED, 1 = TRUE, 2 = FALSE
     * @param _reasoning The AI jury's reasoning
     */
    function setResolution(uint8 _verdict, string calldata _reasoning) external onlyFactory {
        require(status == Status.RESOLVING, "Not in resolving state");
        require(_verdict <= 2, "Invalid verdict");

        verdict = Verdict(_verdict);
        reasoning = _reasoning;
        status = Status.RESOLVED;

        emit Resolved(verdict, reasoning);

        _releaseEscrow();
    }

    // ──────────────────────────────────────────────
    //  Cancel (before acceptance)
    // ──────────────────────────────────────────────

    /**
     * @notice Cancel the agreement before party B has accepted.
     *         Returns party A's USDC escrow deposit.
     */
    function cancel() external onlyPartyA inStatus(Status.CREATED) {
        status = Status.CANCELLED;

        emit Cancelled(msg.sender);

        if (escrowAmount > 0) {
            uint256 amount = escrowAmount;
            escrowAmount = 0;
            require(usdcToken.transfer(partyA, amount), "USDC transfer failed");
        }
    }

    // ──────────────────────────────────────────────
    //  View methods (for relay service)
    // ──────────────────────────────────────────────

    function getStatement() external view returns (string memory) {
        return statement;
    }

    function getGuidelines() external view returns (string memory) {
        return guidelines;
    }

    function getEvidenceDefs() external view returns (string memory) {
        return evidenceDefs;
    }

    function getEvidenceA() external view returns (string memory) {
        return evidenceA;
    }

    function getEvidenceB() external view returns (string memory) {
        return evidenceB;
    }

    function getPartyA() external view returns (address) {
        return partyA;
    }

    function getPartyB() external view returns (address) {
        return partyB;
    }

    function getEvidenceDeadline() external view returns (uint256) {
        if (disputeTimestamp == 0) return 0;
        return disputeTimestamp + evidenceDeadlineSeconds;
    }

    function getTotalEscrow() external view returns (uint256) {
        return escrowAmount;
    }

    // ──────────────────────────────────────────────
    //  Internal functions
    // ──────────────────────────────────────────────

    /**
     * @dev Transition to RESOLVING state and notify the factory to emit DisputeRequested.
     */
    function _triggerResolution() internal {
        status = Status.RESOLVING;

        emit ResolutionTriggered(block.timestamp);

        // Notify the factory to emit DisputeRequested for the relay service
        IInternetCourtFactory(factory).requestDispute(address(this));
    }

    /**
     * @dev Calculate and store pending withdrawal amounts based on the verdict.
     *      TRUE  -> all escrow to party A
     *      FALSE -> all escrow to party B
     *      UNDETERMINED -> refund to party A (creator)
     */
    function _releaseEscrow() internal {
        if (escrowAmount == 0) return;

        uint256 amount = escrowAmount;
        escrowAmount = 0;

        if (verdict == Verdict.TRUE_) {
            pendingWithdrawals[partyA] += amount;
        } else if (verdict == Verdict.FALSE_) {
            pendingWithdrawals[partyB] += amount;
        } else {
            // UNDETERMINED: refund to creator
            pendingWithdrawals[partyA] += amount;
        }
    }

    /**
     * @notice Withdraw pending USDC funds after resolution. Pull-based pattern prevents
     *         a reverting recipient from blocking the other party's withdrawal.
     */
    function claimFunds() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to claim");

        pendingWithdrawals[msg.sender] = 0;

        require(usdcToken.transfer(msg.sender, amount), "USDC transfer failed");

        emit FundsClaimed(msg.sender, amount);
    }
}
