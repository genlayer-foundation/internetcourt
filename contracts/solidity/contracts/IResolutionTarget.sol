// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IResolutionTarget
 * @notice Minimal interface that any InternetCourt case contract must implement
 *         to receive a verdict delivered from GenLayer via the bridge.
 *
 *         Implemented by:
 *           - Agreement.sol     (agent disputes)
 *           - TradeFxSettlement (trade finance disputes)
 *           - Any future case type registered via InternetCourtFactory.registerCase()
 */
interface IResolutionTarget {
    /**
     * @notice Deliver a verdict to the case contract.
     *         Called by InternetCourtFactory after the bridge delivers a verdict from GenLayer.
     * @param verdict  Oracle-type-specific uint8 verdict code.
     *                 Agent disputes:  0=UNDETERMINED, 1=TRUE, 2=FALSE
     *                 Trade finance:   1=TIMELY, 2=LATE, 3=UNDETERMINED
     * @param reasoning  Human-readable explanation from the AI jury.
     */
    function setResolution(uint8 verdict, string calldata reasoning) external;

    /**
     * @notice Oracle type identifier. The relay uses this to look up which
     *         GenLayer oracle to deploy and how to decode getOracleArgs().
     * @return  keccak256 of a versioned type string, e.g.
     *          keccak256("AGENT_DISPUTE_V1") or keccak256("TRADE_FINANCE_V1")
     */
    function getOracleType() external view returns (bytes32);

    /**
     * @notice ABI-encoded constructor arguments for the oracle contract.
     *         The relay decodes these according to the oracle type and passes
     *         them to glClient.deployContract(). Encoding schema is defined
     *         per oracle type in the relay's ORACLE_REGISTRY.
     */
    function getOracleArgs() external view returns (bytes memory);
}
