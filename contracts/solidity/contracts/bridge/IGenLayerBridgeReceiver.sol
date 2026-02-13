// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGenLayerBridgeReceiver {
    function processBridgeMessage(
        uint32 srcChainId,
        address srcSender,
        bytes calldata message
    ) external;
}
