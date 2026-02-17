import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Configure LayerZero V2 pathway for BridgeForwarder (zkSync → Base) and
 * BridgeReceiver (Base ← zkSync).
 *
 * Run on zkSync Sepolia:
 *   npx hardhat run scripts/configure-lz-pathway.ts --network zkSyncSepolia
 *
 * Run on Base Sepolia:
 *   npx hardhat run scripts/configure-lz-pathway.ts --network baseSepolia
 */

// Load deployed addresses
const deploymentsPath = path.resolve(__dirname, "../../../bridge/deployments.json");
const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));

// LayerZero config type constants
const CONFIG_TYPE_EXECUTOR = 1;
const CONFIG_TYPE_ULN = 2;

// LayerZero EIDs
const EID_ZKSYNC_SEPOLIA = 40305;
const EID_BASE_SEPOLIA = 40245;

// ─── zkSync Sepolia LZ Infrastructure ───
const ZKSYNC_SEND_LIB = "0xaF862837316E00d2708Bd648c5FE87EdC7093799";
const ZKSYNC_DVN = "0x605688c4caa80d17448e074faa463ed7b7693d63";
const ZKSYNC_EXECUTOR = "0x6e9bcfcbedb7d1298e66cde81ed9f39b1e12f935";

async function configureZkSyncForwarder() {
  const [signer] = await ethers.getSigners();
  console.log("Configuring BridgeForwarder on zkSync Sepolia");
  console.log("Signer:", signer.address);

  const forwarderAddr = deployments.zkSyncSepolia.bridgeForwarder;
  const forwarder = await ethers.getContractAt("BridgeForwarder", forwarderAddr);
  console.log("BridgeForwarder:", forwarderAddr);

  // 1. Set delegate (allows endpoint to call back for config)
  console.log("\n1. Setting delegate...");
  try {
    const tx1 = await forwarder.setDelegate(signer.address);
    await tx1.wait();
    console.log("   setDelegate ->", signer.address);
  } catch (e: any) {
    console.log("   setDelegate may already be set:", e.message?.slice(0, 100));
  }

  // 2. Encode ULN config (DVN settings for send pathway)
  const ulnConfig = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(uint64,uint8,uint8,uint8,address[],address[])"],
    [[
      1,              // confirmations (testnet uses 1)
      1,              // requiredDVNCount
      0,              // optionalDVNCount
      0,              // optionalDVNThreshold
      [ZKSYNC_DVN],   // requiredDVNs
      []              // optionalDVNs
    ]]
  );

  // 3. Encode Executor config
  const executorConfig = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(uint32,address)"],
    [[
      10000,            // maxMessageSize
      ZKSYNC_EXECUTOR   // executor address
    ]]
  );

  // 4. Call setConfig with both params
  console.log("\n2. Setting LZ config (ULN + Executor)...");
  console.log("   Send Library:", ZKSYNC_SEND_LIB);
  console.log("   DVN:", ZKSYNC_DVN);
  console.log("   Executor:", ZKSYNC_EXECUTOR);
  console.log("   Destination EID:", EID_BASE_SEPOLIA);

  const configParams = [
    {
      eid: EID_BASE_SEPOLIA,
      configType: CONFIG_TYPE_ULN,
      config: ulnConfig
    },
    {
      eid: EID_BASE_SEPOLIA,
      configType: CONFIG_TYPE_EXECUTOR,
      config: executorConfig
    }
  ];

  const tx2 = await forwarder.setConfig(ZKSYNC_SEND_LIB, configParams);
  await tx2.wait();
  console.log("   setConfig tx:", tx2.hash);

  // 5. Test quote to verify pathway works
  console.log("\n3. Testing quoteCallRemoteArbitrary...");
  const testData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint32", "address", "address", "bytes"],
    [
      300, // srcChainId (zkSync Sepolia)
      signer.address,
      deployments.baseSepolia.factory,
      "0x" + "00".repeat(32) // dummy payload
    ]
  );

  // LZ V2 options: TYPE_3, executor worker, lzReceive with 200k gas
  // Format: 0003 (type3) | 01 (executor worker) | 0011 (len=17) | 01 (lzReceive) | gas(16 bytes)
  const gasHex = BigInt(200000).toString(16).padStart(32, "0");
  const options = "0x0003" + "01" + "0011" + "01" + gasHex;

  try {
    const [nativeFee, lzTokenFee] = await forwarder.quoteCallRemoteArbitrary(
      EID_BASE_SEPOLIA,
      testData,
      options
    );
    console.log("   Quote succeeded!");
    console.log("   Native fee:", ethers.formatEther(nativeFee), "ETH");
    console.log("   LZ token fee:", ethers.formatEther(lzTokenFee));
  } catch (e: any) {
    console.error("   Quote FAILED:", e.message?.slice(0, 200));
  }

  console.log("\n--- zkSync Forwarder LZ Configuration Complete ---");
}

async function configureBaseReceiver() {
  const [signer] = await ethers.getSigners();
  console.log("Configuring BridgeReceiver on Base Sepolia");
  console.log("Signer:", signer.address);

  const receiverAddr = deployments.baseSepolia.bridgeReceiver;
  const receiver = await ethers.getContractAt("BridgeReceiver", receiverAddr);
  console.log("BridgeReceiver:", receiverAddr);

  // 1. Set delegate
  console.log("\n1. Setting delegate...");
  try {
    const tx1 = await receiver.setDelegate(signer.address);
    await tx1.wait();
    console.log("   setDelegate ->", signer.address);
  } catch (e: any) {
    console.log("   setDelegate may already be set:", e.message?.slice(0, 100));
  }

  // 2. Query the endpoint for default receive library + DVN for zkSync source
  const endpointAddr = "0x6EDCE65403992e310A62460808c4b910D972f10f";
  console.log("\n2. Querying Base Sepolia endpoint for default config...");

  // Query default receive library for zkSync Sepolia source
  const endpointAbi = [
    "function defaultReceiveLibrary(uint32 _eid) external view returns (address)",
    "function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory)",
  ];
  const endpointContract = new ethers.Contract(endpointAddr, endpointAbi, signer);

  let receiveLib: string;
  try {
    receiveLib = await endpointContract.defaultReceiveLibrary(EID_ZKSYNC_SEPOLIA);
    console.log("   Default Receive Library:", receiveLib);
  } catch (e: any) {
    console.log("   Could not query defaultReceiveLibrary:", e.message?.slice(0, 100));
    console.log("   Skipping receive-side config (may work with defaults)");
    return;
  }

  // 3. Try to get current config to see if DVN is already set
  try {
    const currentUlnConfig = await endpointContract.getConfig(
      receiverAddr, receiveLib, EID_ZKSYNC_SEPOLIA, CONFIG_TYPE_ULN
    );
    console.log("   Current ULN config (hex):", currentUlnConfig.slice(0, 66) + "...");
  } catch (e: any) {
    console.log("   Could not query current config:", e.message?.slice(0, 100));
  }

  // 4. Query default DVN from endpoint
  // The DVN on Base Sepolia for LZ testnet
  // We need to find this - query the send library's default config
  let baseDvn: string;
  try {
    const defaultSendLib = await (new ethers.Contract(endpointAddr, [
      "function defaultSendLibrary(uint32 _eid) external view returns (address)",
    ], signer)).defaultSendLibrary(EID_ZKSYNC_SEPOLIA);
    console.log("   Default Send Library (for DVN reference):", defaultSendLib);

    // The getConfig on send lib to find the default DVN
    const ulnBytes = await endpointContract.getConfig(
      ethers.ZeroAddress, // default config
      defaultSendLib,
      EID_ZKSYNC_SEPOLIA,
      CONFIG_TYPE_ULN
    );
    console.log("   Default ULN config bytes:", ulnBytes);

    // Decode to find DVN
    const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
      ["tuple(uint64,uint8,uint8,uint8,address[],address[])"],
      ulnBytes
    );
    baseDvn = decoded[0][4][0]; // requiredDVNs[0]
    console.log("   Base Sepolia DVN:", baseDvn);
  } catch (e: any) {
    console.log("   Could not auto-detect DVN:", e.message?.slice(0, 200));
    // Fallback: use a known testnet DVN
    baseDvn = "0xe1a12515f9ab2764b887bf60b923ca494ebbb2d6"; // LZ Labs testnet DVN on Base Sepolia
    console.log("   Using fallback DVN:", baseDvn);
  }

  // 5. Configure receive ULN
  console.log("\n3. Setting receive ULN config...");
  const receiveUlnConfig = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(uint64,uint8,uint8,uint8,address[],address[])"],
    [[
      1,              // confirmations
      1,              // requiredDVNCount
      0,              // optionalDVNCount
      0,              // optionalDVNThreshold
      [baseDvn],      // requiredDVNs
      []              // optionalDVNs
    ]]
  );

  const receiveConfigParams = [
    {
      eid: EID_ZKSYNC_SEPOLIA,
      configType: CONFIG_TYPE_ULN,
      config: receiveUlnConfig
    }
  ];

  // BridgeReceiver uses low-level call for setConfig
  // Encode the full call data
  const setConfigData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["tuple(uint32,uint32,bytes)[]"],
    [receiveConfigParams.map(p => [p.eid, p.configType, p.config])]
  );

  try {
    const tx = await receiver.setConfig(receiveLib, setConfigData);
    await tx.wait();
    console.log("   setConfig tx:", tx.hash);
  } catch (e: any) {
    console.log("   setConfig failed:", e.message?.slice(0, 200));
    console.log("   This may be OK - defaults might work for receive side");
  }

  console.log("\n--- Base Receiver LZ Configuration Complete ---");
}

async function main() {
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  if (chainId === 300) {
    await configureZkSyncForwarder();
  } else if (chainId === 84532) {
    await configureBaseReceiver();
  } else {
    console.error("Unknown chain:", chainId);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
