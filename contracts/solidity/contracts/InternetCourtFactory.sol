// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IGenLayerBridgeReceiver} from "./bridge/IGenLayerBridgeReceiver.sol";
import {Agreement} from "./Agreement.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

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
        bridgeReceiver = _bridgeReceiver;
    }

    // ──────────────────────────────────────────────
    //  Agreement creation
    // ──────────────────────────────────────────────

    /**
     * @notice Create a new Agreement contract. Party A deposits escrow via msg.value.
     * @param partyB Address of the counterparty
     * @param _statement The claim to be evaluated
     * @param _guidelines Instructions for AI jury evaluation
     * @param _evidenceDefs Evidence type definitions for each side
     * @param _evidenceDeadlineSeconds Evidence submission window (seconds after dispute)
     * @return The address of the deployed Agreement contract
     */
    function createAgreement(
        address partyB,
        string calldata _statement,
        string calldata _guidelines,
        string calldata _evidenceDefs,
        uint256 _evidenceDeadlineSeconds
    ) external payable returns (address) {
        Agreement agreement = new Agreement{value: msg.value}(
            msg.sender,         // partyA
            partyB,
            _statement,
            _guidelines,
            _evidenceDefs,
            _evidenceDeadlineSeconds,
            address(this)       // factory address for callbacks
        );

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
