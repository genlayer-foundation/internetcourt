// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ILayerZeroEndpointV2 {
    struct MessagingParams {
        uint32 dstEid;
        bytes32 receiver;
        bytes message;
        bytes options;
        bool payInLzToken;
    }

    struct MessagingReceipt {
        bytes32 guid;
        uint64 nonce;
        MessagingFee fee;
    }

    struct MessagingFee {
        uint256 nativeFee;
        uint256 lzTokenFee;
    }

    function send(
        MessagingParams calldata _params,
        address _refundAddress
    ) external payable returns (MessagingReceipt memory);

    function quote(
        MessagingParams calldata _params,
        address _sender
    ) external view returns (MessagingFee memory);

    function eid() external view returns (uint32);
}

interface IGenLayerBridgeReceiverLocal {
    function processBridgeMessage(
        uint32 srcChainId,
        address srcSender,
        bytes calldata message
    ) external;
}

contract BridgeForwarder is AccessControlEnumerable, ReentrancyGuard {
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 public constant CALLER_ROLE = keccak256("CALLER_ROLE");

    ILayerZeroEndpointV2 public immutable endpoint;

    // Destination EID -> bridge receiver address (as bytes32)
    mapping(uint32 => bytes32) public bridgeAddresses;

    // Replay protection: each GenLayer tx hash can only be used once
    mapping(bytes32 => bool) public usedTxHash;

    constructor(address _endpoint, address _owner) {
        endpoint = ILayerZeroEndpointV2(_endpoint);
        _grantRole(OWNER_ROLE, _owner);
        _grantRole(CALLER_ROLE, _owner);
        _setRoleAdmin(OWNER_ROLE, OWNER_ROLE);
        _setRoleAdmin(CALLER_ROLE, OWNER_ROLE);
    }

    // ──────────────────────────────────────────────
    //  Core: Forward message via LayerZero
    // ──────────────────────────────────────────────

    function callRemoteArbitrary(
        bytes32 _txHash,
        uint32 _dstEid,
        bytes calldata _data,
        bytes calldata _options
    ) external payable onlyRole(CALLER_ROLE) nonReentrant {
        // Replay protection
        require(!usedTxHash[_txHash], "BridgeForwarder: txHash already used");
        usedTxHash[_txHash] = true;

        // LOCAL DISPATCH OPTIMIZATION:
        // If destination is the same chain as this forwarder, skip LayerZero entirely
        if (_dstEid == endpoint.eid()) {
            (
                uint32 srcChainId,
                address srcSender,
                address localContract,
                bytes memory message
            ) = abi.decode(_data, (uint32, address, address, bytes));

            IGenLayerBridgeReceiverLocal(localContract)
                .processBridgeMessage(srcChainId, srcSender, message);
            return;
        }

        // CROSS-CHAIN: Send via LayerZero
        ILayerZeroEndpointV2.MessagingParams memory params = ILayerZeroEndpointV2.MessagingParams({
            dstEid: _dstEid,
            receiver: bridgeAddresses[_dstEid],
            message: _data,
            options: _options,
            payInLzToken: false
        });

        endpoint.send{value: msg.value}(params, payable(msg.sender));
    }

    // ──────────────────────────────────────────────
    //  Fee estimation
    // ──────────────────────────────────────────────

    function quoteCallRemoteArbitrary(
        uint32 _dstEid,
        bytes calldata _data,
        bytes calldata _options
    ) external view returns (uint256 nativeFee, uint256 lzTokenFee) {
        ILayerZeroEndpointV2.MessagingParams memory params = ILayerZeroEndpointV2.MessagingParams({
            dstEid: _dstEid,
            receiver: bridgeAddresses[_dstEid],
            message: _data,
            options: _options,
            payInLzToken: false
        });

        ILayerZeroEndpointV2.MessagingFee memory fee =
            endpoint.quote(params, address(this));
        return (fee.nativeFee, fee.lzTokenFee);
    }

    // ──────────────────────────────────────────────
    //  Admin functions
    // ──────────────────────────────────────────────

    function setBridgeAddress(
        uint32 _eid,
        bytes32 _bridgeAddress
    ) external onlyRole(OWNER_ROLE) {
        bridgeAddresses[_eid] = _bridgeAddress;
    }

    function isHashUsed(bytes32 _txHash) external view returns (bool) {
        return usedTxHash[_txHash];
    }

    receive() external payable {}
}
