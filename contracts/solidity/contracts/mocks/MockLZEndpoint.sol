// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockLZEndpoint
 * @notice Mock LayerZero V2 endpoint for testing BridgeForwarder.
 */
contract MockLZEndpoint {
    uint32 public eid;

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

    // Track calls for assertions
    uint256 public sendCallCount;
    MessagingParams public lastSendParams;

    constructor(uint32 _eid) {
        eid = _eid;
    }

    function send(
        MessagingParams calldata _params,
        address /* _refundAddress */
    ) external payable returns (MessagingReceipt memory) {
        sendCallCount++;
        lastSendParams = _params;

        return MessagingReceipt({
            guid: keccak256(abi.encode(sendCallCount)),
            nonce: uint64(sendCallCount),
            fee: MessagingFee({
                nativeFee: msg.value,
                lzTokenFee: 0
            })
        });
    }

    function quote(
        MessagingParams calldata /* _params */,
        address /* _sender */
    ) external pure returns (MessagingFee memory) {
        return MessagingFee({
            nativeFee: 0.001 ether,
            lzTokenFee: 0
        });
    }
}
