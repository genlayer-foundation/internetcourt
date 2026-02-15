// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

struct Origin {
    uint32 srcEid;
    bytes32 sender;
    uint64 nonce;
}

interface IGenLayerBridgeReceiverLz {
    function processBridgeMessage(
        uint32 srcChainId,
        address srcSender,
        bytes calldata message
    ) external;
}

contract BridgeReceiver is Ownable, ReentrancyGuard {
    address public immutable endpoint;

    // Source EID -> trusted forwarder address (as bytes32)
    mapping(uint32 => bytes32) public trustedForwarders;

    // Authorized target contracts that can receive bridge messages
    mapping(address => bool) public authorizedTargets;

    constructor(address _endpoint, address _owner) Ownable(_owner) {
        endpoint = _endpoint;
    }

    // ──────────────────────────────────────────────
    //  LayerZero receive handler
    // ──────────────────────────────────────────────

    function lzReceive(
        Origin calldata _origin,
        bytes32,                    // guid (unused)
        bytes calldata _message,
        address,                    // executor (unused)
        bytes calldata              // extra data (unused)
    ) external payable nonReentrant {
        // Only the LayerZero endpoint can call this
        require(
            msg.sender == address(endpoint),
            "BridgeReceiver: only Endpoint can call"
        );

        // Verify the message came from a trusted forwarder
        require(
            trustedForwarders[_origin.srcEid] == _origin.sender,
            "BridgeReceiver: untrusted forwarder"
        );

        // Decode the bridge message envelope
        (
            uint32 srcChainId,
            address srcSender,
            address localContract,
            bytes memory message
        ) = abi.decode(_message, (uint32, address, address, bytes));

        // Verify target is authorized
        require(authorizedTargets[localContract], "BridgeReceiver: unauthorized target");

        // Dispatch to the target contract
        IGenLayerBridgeReceiverLz(localContract)
            .processBridgeMessage(srcChainId, srcSender, message);
    }

    // ──────────────────────────────────────────────
    //  Admin: configure trusted forwarders
    // ──────────────────────────────────────────────

    function setTrustedForwarder(
        uint32 _srcEid,
        bytes32 _forwarder
    ) external onlyOwner {
        trustedForwarders[_srcEid] = _forwarder;
    }

    function setAuthorizedTarget(
        address _target,
        bool _authorized
    ) external onlyOwner {
        authorizedTargets[_target] = _authorized;
    }
}
