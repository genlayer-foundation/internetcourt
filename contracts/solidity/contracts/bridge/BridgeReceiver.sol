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
    function processBridgeMessage(uint32 srcChainId, address srcSender, bytes calldata message) external;
}

contract BridgeReceiver is Ownable, ReentrancyGuard {
    address public immutable endpoint;

    mapping(uint32 => bytes32) public trustedForwarders;

    constructor(address _endpoint, address _owner) Ownable(_owner) {
        endpoint = _endpoint;
    }

    function allowInitializePath(Origin calldata _origin) external view returns (bool) {
        return trustedForwarders[_origin.srcEid] == _origin.sender;
    }

    function nextNonce(uint32, bytes32) external pure returns (uint64) {
        return 0;
    }

    function lzReceive(
        Origin calldata _origin,
        bytes32,
        bytes calldata _message,
        address,
        bytes calldata
    ) external payable nonReentrant {
        require(msg.sender == endpoint, "BridgeReceiver: only Endpoint");
        require(trustedForwarders[_origin.srcEid] == _origin.sender, "BridgeReceiver: untrusted");

        (uint32 srcChainId, address srcSender, address localContract, bytes memory message) =
            abi.decode(_message, (uint32, address, address, bytes));

        IGenLayerBridgeReceiverLz(localContract).processBridgeMessage(srcChainId, srcSender, message);
    }

    function setTrustedForwarder(uint32 _srcEid, bytes32 _forwarder) external onlyOwner {
        trustedForwarders[_srcEid] = _forwarder;
    }

    /// @notice Set delegate on LayerZero endpoint
    function setDelegate(address _delegate) external onlyOwner {
        // Low-level call to avoid importing SetConfigParam struct which triggers stack-too-deep
        (bool success,) = endpoint.call(abi.encodeWithSignature("setDelegate(address)", _delegate));
        require(success, "setDelegate failed");
    }

    /// @notice Configure LayerZero settings (DVNs, Executor)
    function setConfig(address _lib, bytes calldata _configData) external onlyOwner {
        // Low-level call: endpoint.setConfig(address(this), _lib, configParams)
        // _configData should be the full ABI-encoded SetConfigParam[] array
        (bool success,) = endpoint.call(
            abi.encodeWithSignature(
                "setConfig(address,address,bytes)",
                address(this),
                _lib,
                _configData
            )
        );
        require(success, "setConfig failed");
    }
}
