// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockBridgeTarget
 * @notice Mock contract implementing processBridgeMessage for testing BridgeForwarder local dispatch.
 */
contract MockBridgeTarget {
    uint32 public lastSrcChainId;
    address public lastSrcSender;
    bytes public lastMessage;
    uint256 public callCount;

    function processBridgeMessage(
        uint32 srcChainId,
        address srcSender,
        bytes calldata message
    ) external {
        lastSrcChainId = srcChainId;
        lastSrcSender = srcSender;
        lastMessage = message;
        callCount++;
    }
}
