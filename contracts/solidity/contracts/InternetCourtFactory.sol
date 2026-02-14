// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IGenLayerBridgeReceiver} from "./bridge/IGenLayerBridgeReceiver.sol";
import {Agreement} from "./Agreement.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title InternetCourtFactory
 * @notice Factory that deploys Agreement contracts and receives bridge verdicts from GenLayer.
 *         Implements IGenLayerBridgeReceiver to process cross-chain verdict messages.
 *
 *         The factory serves two roles:
 *         1. Deploy new Agreement contracts (with escrow forwarding)
 *         2. Receive and route AI jury verdicts from GenLayer via the bridge
 */
contract InternetCourtFactory is IGenLayerBridgeReceiver, Ownable {
    using SafeERC20 for IERC20;

    // ──────────────────────────────────────────────
    //  State variables
    // ──────────────────────────────────────────────

    /// @notice Address of the BridgeReceiver contract. Only this address can deliver verdicts.
    address public bridgeReceiver;

    /// @notice Auto-incrementing agreement ID counter
    uint256 public nextAgreementId;

    /// @notice Track deployed agreements for verification
    mapping(address => bool) public deployedAgreements;

    /// @notice Agreement ID -> Agreement address
    mapping(uint256 => address) public agreements;

    /// @notice Block number at which the factory was deployed (for efficient event indexing)
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

    event DisputeRequested(
        address indexed agreementAddress,
        uint256 timestamp
    );

    event VerdictReceived(
        address indexed agreementAddress,
        uint8 verdict
    );

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    /**
     * @param _bridgeReceiver Address of the BridgeReceiver on this chain
     * @param _owner Admin address
     */
    constructor(address _bridgeReceiver, address _owner) Ownable(_owner) {
        deploymentBlock = block.number;
        bridgeReceiver = _bridgeReceiver;
    }

    // ──────────────────────────────────────────────
    //  Agreement creation
    // ──────────────────────────────────────────────

    /**
     * @notice Create a new Agreement contract. Party A deposits USDC escrow via ERC-20 transferFrom.
     * @param partyB Address of the counterparty
     * @param _statement The claim to be evaluated
     * @param _guidelines Instructions for AI jury evaluation
     * @param _evidenceDefs Evidence type definitions for each side
     * @param _evidenceDeadlineSeconds Evidence submission window (seconds after dispute)
     * @param _usdcToken Address of the USDC token contract
     * @param _escrowAmount Amount of USDC to escrow
     * @param _joinDeadline Timestamp by which party B must accept (0 = no deadline)
     * @param _maxEvidenceLength Maximum length of evidence in bytes (0 = no limit)
     * @param _constraints Additional constraints string
     * @return The address of the deployed Agreement contract
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
            msg.sender,         // partyA
            partyB,
            _statement,
            _guidelines,
            _evidenceDefs,
            _evidenceDeadlineSeconds,
            address(this),      // factory address for callbacks
            _usdcToken,
            _escrowAmount,
            _joinDeadline,
            _maxEvidenceLength,
            _constraints
        );

        if (_escrowAmount > 0) {
            IERC20(_usdcToken).safeTransfer(address(agreement), _escrowAmount);
        }

        uint256 id = nextAgreementId++;
        address addr = address(agreement);
        deployedAgreements[addr] = true;
        agreements[id] = addr;

        emit AgreementCreated(id, addr, msg.sender, partyB);
        return addr;
    }

    // ──────────────────────────────────────────────
    //  Bridge receiver implementation
    // ──────────────────────────────────────────────

    /**
     * @notice Process a bridge message containing a verdict from GenLayer.
     *         Called by BridgeReceiver after LayerZero delivers the message.
     * @param message ABI-encoded: (address agreementAddress, bytes resolutionData)
     *                where resolutionData = ABI-encoded: (address target, uint8 verdict, string reasoning)
     */
    function processBridgeMessage(
        uint32 /* srcChainId */,
        address /* srcSender */,
        bytes calldata message
    ) external override {
        // Only the BridgeReceiver can deliver verdicts
        require(msg.sender == bridgeReceiver, "Only bridge receiver");

        // Decode inner message: (address agreementAddress, bytes resolutionData)
        (address agreementAddress, bytes memory resolutionData) =
            abi.decode(message, (address, bytes));

        // Verify the agreement was deployed by this factory
        require(deployedAgreements[agreementAddress], "Unknown agreement");

        // Decode resolution: (address target, uint8 verdict, string reasoning)
        (, uint8 _verdict, string memory _reasoning) =
            abi.decode(resolutionData, (address, uint8, string));

        // Route verdict to the specific agreement
        Agreement(agreementAddress).setResolution(_verdict, _reasoning);

        emit VerdictReceived(agreementAddress, _verdict);
    }

    // ──────────────────────────────────────────────
    //  Dispute request (called by Agreement contracts)
    // ──────────────────────────────────────────────

    /**
     * @notice Called by an Agreement contract when it transitions to RESOLVING.
     *         Emits a DisputeRequested event that the relay service watches for.
     * @param agreementAddress Address of the agreement requesting dispute resolution
     */
    function requestDispute(address agreementAddress) external {
        require(deployedAgreements[agreementAddress], "Unknown agreement");
        require(msg.sender == agreementAddress, "Only agreement can request");

        emit DisputeRequested(agreementAddress, block.timestamp);
    }

    // ──────────────────────────────────────────────
    //  Admin
    // ──────────────────────────────────────────────

    /**
     * @notice Update the bridge receiver address. Only callable by owner.
     * @param _bridgeReceiver New BridgeReceiver address
     */
    function setBridgeReceiver(address _bridgeReceiver) external onlyOwner {
        bridgeReceiver = _bridgeReceiver;
    }
}
