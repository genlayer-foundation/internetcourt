"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { BASE_CHAIN_ID } from "@/lib/constants";

type JoinState =
  | { step: "idle" }
  | { step: "loading"; status: string }
  | { step: "success"; address: string }
  | { step: "error"; message: string };

export default function JoinPage() {
  const router = useRouter();
  const [caseId, setCaseId] = useState("");
  const [joinState, setJoinState] = useState<JoinState>({ step: "idle" });

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();

    const id = parseInt(caseId, 10);
    if (isNaN(id) || id < 0) {
      setJoinState({ step: "error", message: "Please enter a valid case ID (non-negative integer)" });
      return;
    }

    try {
      setJoinState({ step: "loading", status: "Preparing transaction..." });

      const res = await fetch("/api/cases/prepare-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: id }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to prepare join transaction");
      }

      setJoinState({ step: "loading", status: "Connecting wallet..." });

      const provider =
        typeof window !== "undefined"
          ? (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
          : undefined;
      if (!provider) {
        throw new Error("No wallet found. Please install MetaMask.");
      }

      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (!accounts || accounts.length === 0) {
        throw new Error("No account connected");
      }

      // Verify chain
      const chainIdHex = (await provider.request({
        method: "eth_chainId",
      })) as string;
      const chainId = parseInt(chainIdHex, 16);
      if (chainId !== BASE_CHAIN_ID) {
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
          });
        } catch {
          throw new Error(
            `Please switch your wallet to Base Sepolia (chain ${BASE_CHAIN_ID})`
          );
        }
      }

      setJoinState({ step: "loading", status: "Sending transaction..." });

      const tx = data.transactions[0];
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: accounts[0],
            to: tx.to,
            data: tx.data,
            value: "0x0",
          },
        ],
      });

      setJoinState({ step: "loading", status: "Waiting for confirmation..." });

      // Wait for receipt
      let receipt = null;
      while (!receipt) {
        await new Promise((r) => setTimeout(r, 2000));
        receipt = await provider.request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
        });
      }

      setJoinState({ step: "success", address: tx.to as string });
    } catch (err) {
      setJoinState({
        step: "error",
        message: err instanceof Error ? err.message : "Join failed",
      });
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-8">
        <h1 className="font-heading text-4xl md:text-5xl tracking-[-0.96px] leading-[1.2]">
          Join Case
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Accept an agreement as Party B by entering the Case ID.
        </p>
      </div>

      {joinState.step === "success" && (
        <Card className="border-green-500/30">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h2 className="text-xl font-bold">Joined Successfully</h2>
            <p className="font-mono text-sm text-muted-foreground break-all">
              {joinState.address}
            </p>
            <Button onClick={() => router.push(`/cases/${joinState.address}`)}>
              View Case
            </Button>
          </CardContent>
        </Card>
      )}

      {joinState.step !== "success" && (
        <form onSubmit={handleJoin}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Case Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Case ID
                </label>
                <p className="mb-1 text-xs text-muted-foreground">
                  The numeric ID of the case you want to join
                </p>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  required
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {joinState.step === "error" && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Join failed</p>
                <p className="mt-1 text-xs opacity-80">{joinState.message}</p>
              </div>
            </div>
          )}

          {joinState.step === "loading" && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              {joinState.status}
            </div>
          )}

          <div className="mt-6">
            <Button type="submit" disabled={joinState.step === "loading"}>
              {joinState.step === "loading" ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Case"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
