import { ethers } from "hardhat";

const FACTORY = "0x0cE49079fB4b0EDE327F2b8919f7aaD9C7dabE41";
const ESCROW = ethers.parseEther("0.001");
const PARTY_B_KEY = "0x31f35a8cc001278c0293a9a061e0e291b6379d3cc75982613770e4b7967ecfaf";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const DELAY = 4000; // wait for RPC to catch up after each tx

async function waitTx(tx: any) {
  const receipt = await tx.wait();
  await sleep(DELAY);
  return receipt;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const partyB = new ethers.Wallet(PARTY_B_KEY, ethers.provider);
  console.log("=== Internet Court E2E Test (Base Sepolia) ===\n");
  console.log("Party A:", deployer.address);
  console.log("Party B:", partyB.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // 0. Fund partyB
  const balBCheck = await ethers.provider.getBalance(partyB.address);
  if (balBCheck < ethers.parseEther("0.002")) {
    console.log("\n0. Funding Party B...");
    await waitTx(await deployer.sendTransaction({ to: partyB.address, value: ethers.parseEther("0.005") }));
  }
  console.log("   Party B balance:", ethers.formatEther(await ethers.provider.getBalance(partyB.address)), "ETH");

  const factory = await ethers.getContractAt("InternetCourtFactory", FACTORY);

  // 1. Create agreement
  console.log("\n1. Creating agreement (0.001 ETH escrow)...");
  const receipt1 = await waitTx(await factory.createAgreement(
    partyB.address,
    "The freelancer delivered the API integration on time and meeting all specifications",
    "Evaluate based on: delivery date vs deadline, API spec compliance, test coverage",
    "Party A: delivery receipt, git log. Party B: bug reports, spec document",
    3600,
    { value: ESCROW }
  ));

  const createEvent = receipt1?.logs.find((log: any) => {
    try { return factory.interface.parseLog({ topics: log.topics as string[], data: log.data })?.name === "AgreementCreated"; }
    catch { return false; }
  });
  const parsed = factory.interface.parseLog({ topics: createEvent!.topics as string[], data: createEvent!.data });
  const agreementAddr = parsed!.args.agreementAddress;
  console.log("   Agreement:", agreementAddr);
  console.log("   ID:", parsed!.args.id.toString());

  const agreement = await ethers.getContractAt("Agreement", agreementAddr);
  console.log("   Status:", (await agreement.status()).toString(), "(CREATED)");

  // 2. Party B accepts
  console.log("\n2. Party B accepting...");
  await waitTx(await agreement.connect(partyB).acceptAndDeposit({ value: ESCROW }));
  console.log("   Status:", (await agreement.status()).toString(), "(ACTIVE)");
  console.log("   Total escrow:", ethers.formatEther(await agreement.getTotalEscrow()), "ETH");

  // 3. Raise dispute
  console.log("\n3. Raising dispute...");
  await waitTx(await agreement.raiseDispute());
  console.log("   Status:", (await agreement.status()).toString(), "(DISPUTED)");

  // 4. Submit evidence
  console.log("\n4. Submitting evidence...");
  await waitTx(await agreement.submitEvidence(
    "Delivery completed Jan 15, commit abc123. All 47 API endpoints implemented per spec v2.1."
  ));
  console.log("   Party A evidence submitted");

  await waitTx(await agreement.connect(partyB).submitEvidence(
    "12 of 47 endpoints return 500 errors. Bug reports filed Jan 16. See attached test results."
  ));
  console.log("   Party B evidence submitted");

  const status3 = await agreement.status();
  console.log("   Status:", status3.toString(), status3 === 4n ? "(RESOLVING)" : "");

  // 5. Verify on-chain data
  console.log("\n5. On-chain state:");
  console.log("   Statement:", (await agreement.getStatement()).slice(0, 70) + "...");
  console.log("   Evidence A:", (await agreement.getEvidenceA()).slice(0, 70) + "...");
  console.log("   Evidence B:", (await agreement.getEvidenceB()).slice(0, 70) + "...");

  // 6. Deliver verdict via bridge simulation
  console.log("\n6. Delivering verdict (TRUE = Party A wins)...");
  const currentBR = await factory.bridgeReceiver();

  // Temporarily make deployer the bridgeReceiver
  await waitTx(await factory.setBridgeReceiver(deployer.address));

  const innerResolution = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint8", "string"],
    [agreementAddr, 1, "Freelancer delivered all 47 endpoints on time. Bug reports filed after deadline."]
  );
  const outerMessage = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "bytes"],
    [agreementAddr, innerResolution]
  );
  await waitTx(await factory.processBridgeMessage(0, ethers.ZeroAddress, outerMessage));

  // Restore bridgeReceiver
  await waitTx(await factory.setBridgeReceiver(currentBR));

  console.log("   Status:", (await agreement.status()).toString(), "(RESOLVED)");
  console.log("   Verdict:", (await agreement.verdict()).toString(), "(TRUE)");
  console.log("   Reasoning:", (await agreement.reasoning()).slice(0, 80) + "...");

  // 7. Claim funds
  console.log("\n7. Party A claiming escrow...");
  const balBefore = await ethers.provider.getBalance(deployer.address);
  const claimReceipt = await waitTx(await agreement.claimFunds());
  const balAfter = await ethers.provider.getBalance(deployer.address);
  const gasCost = claimReceipt!.gasUsed * claimReceipt!.gasPrice;
  const netGain = balAfter - balBefore + gasCost;
  console.log("   Claimed:", ethers.formatEther(netGain), "ETH");
  console.log("   Agreement balance:", ethers.formatEther(await ethers.provider.getBalance(agreementAddr)), "ETH");

  console.log("\n=== E2E Test PASSED ===");
  console.log("\nhttps://sepolia.basescan.org/address/" + agreementAddr);
}

main().catch((e) => { console.error(e); process.exit(1); });
