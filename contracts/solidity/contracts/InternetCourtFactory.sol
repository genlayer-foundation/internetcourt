// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IGenLayerBridgeReceiver} from "./bridge/IGenLayerBridgeReceiver.sol";
import {IResolutionTarget} from "./IResolutionTarget.sol";
import {Agreement} from "./Agreement.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title InternetCourtFactory
 * @notice Universal registry and verdict router for InternetCourt cases.
 *
 *         Two registration paths:
 *           1. createAgreement() — factory deploys an Agreement contract (agent disputes)
 *           2. registerCase()    — external contract self-registers (trade finance, etc.)
 *
 *         All registered cases implement IResolutionTarget. The factory routes
 *         bridge verdicts to IResolutionTarget(caseAddr).setResolution(verdict, reasoning).
 *         Each case type handles its own escrow and settlement logic internally.
 *
 *         The relay reads IResolutionTarget.getOracleType() and getOracleArgs() to
 *         dispatch the correct GenLayer oracle without any case-type logic in the relay.
 */
contract InternetCourtFactory is IGenLayerBridgeReceiver, Ownable {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    /// @notice Address of the BridgeReceiver. Only it may deliver verdicts.
    address public bridgeReceiver;

    /// @notice Auto-incrementing case ID counter.
    uint256 public nextAgreementId;

    /// @notice Registered case address → registered flag.
    ///         Covers both factory-deployed Agreement contracts and self-registered externals.
    mapping(address => bool) public deployedAgreements;

    /// @notice Case ID → case address.
    mapping(uint256 => address) public agreements;

    /// @notice Case address → case ID (reverse lookup).
    mapping(address => uint256) public agreementIds;

    /// @notice Block at deployment (for efficient event indexing).
    uint256 public immutable deploymentBlock;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event AgreementCreated(
        uint256 indexed id,
        address agreementAddress,
        address partyA,
        address partyB
    );

    /// @notice Emitted when any registered case enters dispute resolution.
    ///         The relay watches this event and uses IResolutionTarget.getOracleType()
    ///         + getOracleArgs() to dispatch the correct oracle.
    event DisputeRequested(
        address indexed agreementAddress,
        uint256 timestamp
    );

    event VerdictReceived(
        address indexed agreementAddress,
        uint8 verdict
    );

    /// @notice Emitted when an external contract self-registers as a case.
    event CaseRegistered(
        uint256 indexed id,
        address indexed caseAddress
    );

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    constructor(address _bridgeReceiver, address _owner) Ownable(_owner) {
        deploymentBlock = block.number;
        bridgeReceiver = _bridgeReceiver;
    }

    // ──────────────────────────────────────────────
    //  Agreement creation (agent disputes)
    // ──────────────────────────────────────────────

    /**
     * @notice Deploy a new Agreement contract for an agent-to-agent (or agent-to-human) dispute.
     *         Party A deposits USDC escrow; escrow is forwarded to the Agreement.
     */
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
        if (_escrowAmount > 0) {
            require(_usdcToken != address(0), "USDC token required for escrow");
            IERC20(_usdcToken).safeTransferFrom(msg.sender, address(this), _escrowAmount);
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

        if (_escrowAmount > 0) {
            IERC20(_usdcToken).safeTransfer(address(agreement), _escrowAmount);
        }

        uint256 id = _register(address(agreement));
        emit AgreementCreated(id, address(agreement), msg.sender, partyB);
        return address(agreement);
    }

    // ──────────────────────────────────────────────
    //  External case registration (trade finance, etc.)
    // ──────────────────────────────────────────────

    /**
     * @notice Called by an external contract to register itself as a case and
     *         trigger dispute resolution. The caller must implement IResolutionTarget.
     *
     *         The relay will pick up the DisputeRequested event, call
     *         getOracleType() + getOracleArgs() on msg.sender, and deploy the
     *         appropriate GenLayer oracle automatically.
     *
     * @return id  The assigned case ID.
     */
    function registerCase() external returns (uint256 id) {
        id = _register(msg.sender);
        emit CaseRegistered(id, msg.sender);
        emit DisputeRequested(msg.sender, block.timestamp);
    }

    // ──────────────────────────────────────────────
    //  Dispute request (called by Agreement contracts)
    // ──────────────────────────────────────────────

    /**
     * @notice Called by an Agreement contract when it enters RESOLVING state.
     *         Emits DisputeRequested for the relay to pick up.
     */
    function requestDispute(address agreementAddress) external {
        require(deployedAgreements[agreementAddress], "Unknown case");
        require(msg.sender == agreementAddress, "Only case can request");
        emit DisputeRequested(agreementAddress, block.timestamp);
    }

    // ──────────────────────────────────────────────
    //  Bridge verdict delivery
    // ──────────────────────────────────────────────

    /**
     * @notice Receive and route a verdict from GenLayer via the bridge.
     *         Called by BridgeReceiver after LayerZero delivers the message.
     *
     * @param message ABI-encoded:
     *   (address caseAddress, bytes resolutionData)
     *   where resolutionData = ABI-encoded (address _ignored, uint8 verdict, string reasoning)
     *
     *   Routes to IResolutionTarget(caseAddress).setResolution(verdict, reasoning).
     *   The case contract handles its own escrow settlement.
     */
    function processBridgeMessage(
        uint32 /* srcChainId */,
        address /* srcSender */,
        bytes calldata message
    ) external override {
        require(msg.sender == bridgeReceiver, "Only bridge receiver");

        (address caseAddress, bytes memory resolutionData) =
            abi.decode(message, (address, bytes));

        require(deployedAgreements[caseAddress], "Unknown case");

        (, uint8 _verdict, string memory _reasoning) =
            abi.decode(resolutionData, (address, uint8, string));

        // Generic: works for Agreement, TradeFxSettlement, or any future IResolutionTarget
        IResolutionTarget(caseAddress).setResolution(_verdict, _reasoning);

        emit VerdictReceived(caseAddress, _verdict);
    }

    // ──────────────────────────────────────────────
    //  Admin
    // ──────────────────────────────────────────────

    function setBridgeReceiver(address _bridgeReceiver) external onlyOwner {
        bridgeReceiver = _bridgeReceiver;
    }

    // ──────────────────────────────────────────────
    //  Internal
    // ──────────────────────────────────────────────

    function _register(address caseAddr) internal returns (uint256 id) {
        require(!deployedAgreements[caseAddr], "Already registered");
        id = nextAgreementId++;
        deployedAgreements[caseAddr] = true;
        agreements[id] = caseAddr;
        agreementIds[caseAddr] = id;
    }
}
