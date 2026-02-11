"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { GenLayerClient, GenLayerChain } from "genlayer-js/types";
import { TransactionStatus } from "genlayer-js/types";

const FACTORY_ADDRESS =
  process.env.NEXT_PUBLIC_COURT_FACTORY_ADDRESS || "";

const SUCCESS_RESULTS = ["SUCCESS", "MAJORITY_AGREE", "AGREE"];

// GenLayer receipt has extra fields not in the TS types
interface GLReceipt {
  result?: number;
  result_name?: string;
  to_address?: string;
  data?: { contract_address?: string };
}

/**
 * Create a GenLayer client using the browser wallet (MetaMask) as provider.
 * The wallet must be connected to GenLayer studionet (chain 61999).
 */
export function createBrowserClient(
  account: `0x${string}`
): GenLayerClient<GenLayerChain> {
  return createClient({
    chain: studionet,
    account,
  });
}

export interface DeployAndRegisterResult {
  contractAddress: string;
  deployTxHash: string;
  registerTxHash: string;
}

async function waitReceipt(
  client: GenLayerClient<GenLayerChain>,
  hash: string,
  retries = 120,
): Promise<GLReceipt> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const receipt = await (client as any).waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries,
    interval: 3000,
  });
  return receipt as GLReceipt;
}

function isSuccess(receipt: GLReceipt): boolean {
  return (
    receipt.result === 0 ||
    SUCCESS_RESULTS.includes(receipt.result_name || "")
  );
}

/**
 * Deploy an InternetCourt contract and register it in the factory.
 * Requires the user's wallet to be on GenLayer studionet.
 */
export async function deployAndRegister(
  client: GenLayerClient<GenLayerChain>,
  contractCode: string,
  constructorArgs: {
    partyB: string;
    statement: string;
    guidelines: string;
    evidenceDefs: string;
    evidenceDeadlineSeconds: number;
  },
  onStatus?: (status: string) => void,
): Promise<DeployAndRegisterResult> {
  onStatus?.("Deploying contract...");

  const deployHash = await client.deployContract({
    code: contractCode,
    args: [
      constructorArgs.partyB,
      constructorArgs.statement,
      constructorArgs.guidelines,
      constructorArgs.evidenceDefs,
      constructorArgs.evidenceDeadlineSeconds,
    ],
    leaderOnly: false,
  });

  onStatus?.("Waiting for deployment confirmation...");

  const deployReceipt = await waitReceipt(client, deployHash);

  if (!isSuccess(deployReceipt)) {
    throw new Error(
      `Deploy failed: ${deployReceipt.result_name || deployReceipt.result}`
    );
  }

  const contractAddress =
    deployReceipt.data?.contract_address || deployReceipt.to_address;
  if (!contractAddress) {
    throw new Error("No contract address in deploy receipt");
  }

  // Register in factory
  let registerTxHash = "";
  if (FACTORY_ADDRESS) {
    onStatus?.("Registering in factory...");

    const params = JSON.stringify({
      statement: constructorArgs.statement,
      party_b: constructorArgs.partyB,
    });

    registerTxHash = await client.writeContract({
      address: FACTORY_ADDRESS as `0x${string}`,
      functionName: "register_contract",
      args: [contractAddress, "internetcourt", params],
      value: BigInt(0),
      leaderOnly: false,
    });

    onStatus?.("Waiting for registration confirmation...");

    const registerReceipt = await waitReceipt(client, registerTxHash, 60);

    if (!isSuccess(registerReceipt)) {
      console.warn(
        "Factory registration failed:",
        registerReceipt.result_name || registerReceipt.result
      );
    }
  }

  return {
    contractAddress,
    deployTxHash: deployHash,
    registerTxHash,
  };
}
