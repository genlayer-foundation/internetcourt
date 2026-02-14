import { ethers } from "hardhat";

/**
 * Verify the state of a deployed agreement contract
 */

async function main() {
  const agreementAddress = "0x230D67B41e29be15eCB8747975A06617848E7705";

  console.log(`\n🔍 Verifying Agreement at: ${agreementAddress}`);
  console.log(`   Basescan: https://sepolia.basescan.org/address/${agreementAddress}\n`);

  const agreement = await ethers.getContractAt("Agreement", agreementAddress);

  // Get all state
  const partyA = await agreement.partyA();
  const partyB = await agreement.partyB();
  const status = await agreement.status();
  const verdict = await agreement.verdict();
  const reasoning = await agreement.reasoning();
  const statement = await agreement.statement();
  const escrowAmount = await agreement.escrowAmount();
  const evidenceASubmitted = await agreement.evidenceASubmitted();
  const evidenceBSubmitted = await agreement.evidenceBSubmitted();
  const pendingA = await agreement.pendingWithdrawals(partyA);
  const pendingB = await agreement.pendingWithdrawals(partyB);

  // Get USDC balance
  const usdcAddress = await agreement.usdcToken();
  const usdc = await ethers.getContractAt("MockUSDC", usdcAddress);
  const contractBalance = await usdc.balanceOf(agreementAddress);

  console.log("Parties:");
  console.log(`  Party A: ${partyA}`);
  console.log(`  Party B: ${partyB}`);

  console.log("\nAgreement:");
  console.log(`  Statement: "${statement}"`);
  console.log(`  Escrow: ${ethers.formatUnits(escrowAmount, 6)} USDC`);

  console.log("\nEvidence:");
  console.log(`  Evidence A submitted: ${evidenceASubmitted}`);
  console.log(`  Evidence B submitted: ${evidenceBSubmitted}`);

  console.log("\nResolution:");
  console.log(`  Status: ${status} (${getStatusName(Number(status))})`);
  console.log(`  Verdict: ${verdict} (${getVerdictName(Number(verdict))})`);
  console.log(`  Reasoning: "${reasoning}"`);

  console.log("\nEscrow:");
  console.log(`  Contract balance: ${ethers.formatUnits(contractBalance, 6)} USDC`);
  console.log(`  Pending A: ${ethers.formatUnits(pendingA, 6)} USDC`);
  console.log(`  Pending B: ${ethers.formatUnits(pendingB, 6)} USDC`);

  // Check if the full lifecycle completed successfully
  const success = (
    Number(status) === 4 && // RESOLVED
    Number(verdict) === 1 && // TRUE
    contractBalance === 0n && // All funds withdrawn
    pendingA === 0n &&
    pendingB === 0n
  );

  console.log(`\n${success ? '✅' : '⚠️'} Full lifecycle ${success ? 'completed successfully' : 'incomplete or pending'}!`);
}

function getStatusName(status: number): string {
  const names = ["CREATED", "ACTIVE", "DISPUTED", "RESOLVING", "RESOLVED", "CANCELLED"];
  return names[status] || "UNKNOWN";
}

function getVerdictName(verdict: number): string {
  const names = ["UNDETERMINED", "TRUE", "FALSE"];
  return names[verdict] || "UNKNOWN";
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
