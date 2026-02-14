# Internet Court E2E Test Results - Base Sepolia Testnet

**Date**: February 14, 2026
**Network**: Base Sepolia (Chain ID: 84532)
**Test Script**: `contracts/solidity/scripts/full-e2e-test.ts`

## Test Summary

**11 / 11 PASSED** -- All Agreement lifecycle paths verified.

Comprehensive end-to-end test covering every Agreement lifecycle path: cancellation, deadline expiry, mutual agreement (TRUE/FALSE), confirm-other-party proposal, bridge verdicts (TRUE/FALSE/UNDETERMINED), and default judgments (none submitted, initiator wins, non-initiator wins).

## Deployed Contracts

| Contract | Address | Link |
|----------|---------|------|
| MockUSDC | `0x1185DA4da4DB96016BA7Cf93ee91F6D199FB25A3` | [Basescan](https://sepolia.basescan.org/address/0x1185DA4da4DB96016BA7Cf93ee91F6D199FB25A3) |
| InternetCourtFactory | `0xED498a92b97C2962E71Dd764D10Fcce77dF83b5E` | [Basescan](https://sepolia.basescan.org/address/0xED498a92b97C2962E71Dd764D10Fcce77dF83b5E) |

**deploymentBlock**: 37666090

## Test Accounts

- **Party A (deployer)**: `0x6b9FC69624db2aeF4533D6C329c4dCE09bf6aDac`
- **Party B**: `0xce413FFE2628b60cdaF4413d63d7838B8d4309AC`

## Results

| # | Case Name | Verdict / Status | Agreement Address | Link |
|---|-----------|------------------|-------------------|------|
| 1 | Cancel Before Acceptance | CANCELLED, escrow returned to A | `0xdd9D9e80cb2F66872a782551e3Bf23C2633CF4C4` | [Basescan](https://sepolia.basescan.org/address/0xdd9D9e80cb2F66872a782551e3Bf23C2633CF4C4) |
| 2 | Join Deadline Expired | CANCELLED, escrow reclaimed by A | `0xB40f89166d92dB83fd4F97c12EB9463214B173d2` | [Basescan](https://sepolia.basescan.org/address/0xB40f89166d92dB83fd4F97c12EB9463214B173d2) |
| 3 | Mutual Agreement Both TRUE | RESOLVED, verdict TRUE, escrow to A | `0x45581b24eD11EB787D4F4727957ebFe5EfD15279` | [Basescan](https://sepolia.basescan.org/address/0x45581b24eD11EB787D4F4727957ebFe5EfD15279) |
| 4 | Mutual Agreement Both FALSE | RESOLVED, verdict FALSE, escrow to B | `0xb357d2D87074B851edfEa7Ccf7B98046a28AAEa2` | [Basescan](https://sepolia.basescan.org/address/0xb357d2D87074B851edfEa7Ccf7B98046a28AAEa2) |
| 5 | Confirm Other Party Proposal | RESOLVED, verdict TRUE, escrow to A | `0xA47460FAFa335cC4f0d8e3889E7602978cdb48fC` | [Basescan](https://sepolia.basescan.org/address/0xA47460FAFa335cC4f0d8e3889E7602978cdb48fC) |
| 6 | Dispute With Bridge Verdict TRUE | RESOLVED, verdict TRUE, escrow to A (claimed) | `0xb63fb24Db3eDF33fcFF261567A6222d32617a642` | [Basescan](https://sepolia.basescan.org/address/0xb63fb24Db3eDF33fcFF261567A6222d32617a642) |
| 7 | Dispute With Bridge Verdict FALSE | RESOLVED, verdict FALSE, escrow to B (claimed) | `0x698a933bc039884cBBD36Dd6764F01425682776C` | [Basescan](https://sepolia.basescan.org/address/0x698a933bc039884cBBD36Dd6764F01425682776C) |
| 8 | Dispute With Bridge Verdict UNDETERMINED | RESOLVED, verdict UNDETERMINED, escrow refunded to A | `0x078dD2d687f1032BC2386f85c5426DCAb23f5A7b` | [Basescan](https://sepolia.basescan.org/address/0x078dD2d687f1032BC2386f85c5426DCAb23f5A7b) |
| 9 | Default Judgment Neither Submitted | RESOLVED, verdict UNDETERMINED, escrow refunded to A | `0xD9Fb070dF561923665649bA61b4016536cf94233` | [Basescan](https://sepolia.basescan.org/address/0xD9Fb070dF561923665649bA61b4016536cf94233) |
| 10 | Default Judgment Initiator Wins | RESOLVED, verdict TRUE (initiator wins), escrow to A | `0x20a85F23150aB063E8b0656D3f670F05365A2813` | [Basescan](https://sepolia.basescan.org/address/0x20a85F23150aB063E8b0656D3f670F05365A2813) |
| 11 | Default Judgment Non-Initiator Wins | RESOLVED, verdict FALSE (non-initiator wins), escrow to B | `0xEEfB6C1070a6475E144D70Cdef2514044E5B4b4C` | [Basescan](https://sepolia.basescan.org/address/0xEEfB6C1070a6475E144D70Cdef2514044E5B4b4C) |

## Lifecycle Paths Covered

### Cancellation (Cases 1-2)
- **Case 1**: Creator cancels before the other party accepts. Escrow returned immediately.
- **Case 2**: Join deadline expires with no acceptance. Creator reclaims escrow via `reclaimOnExpiry`.

### Mutual Agreement (Cases 3-5)
- **Case 3**: Both parties propose TRUE. Resolved without jury, escrow to A.
- **Case 4**: Both parties propose FALSE. Resolved without jury, escrow to B.
- **Case 5**: One party proposes, the other confirms it. Resolved without jury.

### Bridge / AI Jury Verdicts (Cases 6-8)
- **Case 6**: Dispute raised, evidence submitted, bridge delivers verdict TRUE. Escrow to A, claimed.
- **Case 7**: Dispute raised, evidence submitted, bridge delivers verdict FALSE. Escrow to B, claimed.
- **Case 8**: Dispute raised, evidence submitted, bridge delivers verdict UNDETERMINED. Escrow refunded to A.

### Default Judgments (Cases 9-11)
- **Case 9**: Neither party submits evidence. Resolved as UNDETERMINED, escrow refunded to A.
- **Case 10**: Only the dispute initiator submits evidence. Initiator wins by default (TRUE), escrow to A.
- **Case 11**: Only the non-initiator submits evidence. Non-initiator wins by default (FALSE), escrow to B.

## Key Findings

1. **State Machine**: All status transitions work correctly across all paths (CREATED, ACTIVE, DISPUTED, RESOLVING, RESOLVED, CANCELLED).
2. **USDC Escrow**: Properly transferred, held, and distributed in every scenario -- winner takes all for TRUE/FALSE, refund to creator for UNDETERMINED/CANCELLED.
3. **Mutual Agreement**: Three-key system works -- when both parties agree, no jury is needed.
4. **Bridge Integration**: Factory correctly processes bridge messages and routes verdicts to agreements.
5. **Default Judgment**: Automatic resolution when evidence deadline passes with missing evidence.
6. **Pull-Based Withdrawal**: Safe claim pattern works for both parties across all verdict types.
7. **On-Chain Statements**: Each case uses its descriptive name as the on-chain statement, visible on Basescan for easy identification.

## How to Re-Run

```bash
cd /home/albert/internetcourt/contracts/solidity
npx hardhat run scripts/full-e2e-test.ts --network baseSepolia
```

## Conclusion

All 11 Agreement lifecycle paths pass on Base Sepolia. The system correctly handles cancellation, deadline expiry, mutual agreement, bridge-delivered verdicts (TRUE/FALSE/UNDETERMINED), and default judgments. Escrow distribution is correct in every case. System is ready for production bridge relay integration with GenLayer AI jury.
