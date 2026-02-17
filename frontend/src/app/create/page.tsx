"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { BASE_CHAIN_ID, isValidAddress } from "@/lib/constants";

type DeployState =
  | { step: "idle" }
  | { step: "loading"; status: string }
  | { step: "success"; caseId: string }
  | { step: "error"; message: string };

export default function CreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    partyB: "",
    statement: "",
    guidelines: "",
    evidenceDeadlineHours: "24",
    escrowAmount: "0",
    joinDeadlineHours: "72",
    evidenceTypesA: "text, json",
    evidenceMaxCharsA: "10000",
    evidenceConstraintsA: "",
    evidenceTypesB: "text, json",
    evidenceMaxCharsB: "10000",
    evidenceConstraintsB: "",
  });

  const [preview, setPreview] = useState(false);
  const [deploy, setDeploy] = useState<DeployState>({ step: "idle" });
  const [addressError, setAddressError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (name === "partyB") {
      if (value && !isValidAddress(value)) {
        setAddressError("Address must start with 0x and be 42 characters");
      } else {
        setAddressError(null);
      }
    }
  }

  function buildEvidenceDefs(): string {
    return JSON.stringify({
      party_a: {
        allowed_types: form.evidenceTypesA
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        max_chars: parseInt(form.evidenceMaxCharsA, 10) || 10000,
        ...(form.evidenceConstraintsA
          ? { constraints: form.evidenceConstraintsA }
          : {}),
      },
      party_b: {
        allowed_types: form.evidenceTypesB
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        max_chars: parseInt(form.evidenceMaxCharsB, 10) || 10000,
        ...(form.evidenceConstraintsB
          ? { constraints: form.evidenceConstraintsB }
          : {}),
      },
    });
  }

  async function handleDeploy() {
    try {
      setDeploy({ step: "loading", status: "Preparing transactions..." });

      const deadlineSeconds =
        Math.round(parseFloat(form.evidenceDeadlineHours) * 3600) || 0;

      // Convert escrow amount to raw USDC units (6 decimals)
      const escrowRaw = Math.round(
        parseFloat(form.escrowAmount || "0") * 1e6
      ).toString();

      // Convert join deadline hours to Unix timestamp
      const joinDeadlineHours = parseFloat(form.joinDeadlineHours || "0");
      const joinDeadline =
        joinDeadlineHours > 0
          ? Math.round(Date.now() / 1000 + joinDeadlineHours * 3600).toString()
          : "0";

      const res = await fetch("/api/cases/prepare-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyB: form.partyB,
          statement: form.statement,
          guidelines: form.guidelines,
          evidenceDefs: buildEvidenceDefs(),
          escrowAmount: escrowRaw,
          joinDeadline,
          evidenceDeadlineSeconds: deadlineSeconds.toString(),
          maxEvidenceLength: "0",
          constraints: "",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to prepare transactions");
      }

      const { transactions, expectedCaseId } = data;

      // Connect wallet
      setDeploy({ step: "loading", status: "Connecting wallet..." });

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

      // Switch to Base Sepolia
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

      // Send each transaction sequentially
      for (const tx of transactions) {
        setDeploy({
          step: "loading",
          status: `Sending transaction ${tx.step}/${transactions.length}: ${tx.description}...`,
        });

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

        setDeploy({
          step: "loading",
          status: `Waiting for confirmation (${tx.description})...`,
        });

        // Poll for receipt
        let receipt = null;
        while (!receipt) {
          await new Promise((r) => setTimeout(r, 2000));
          receipt = await provider.request({
            method: "eth_getTransactionReceipt",
            params: [txHash],
          });
        }
      }

      setDeploy({ step: "success", caseId: expectedCaseId });
    } catch (err) {
      setDeploy({
        step: "error",
        message: err instanceof Error ? err.message : "Creation failed",
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidAddress(form.partyB)) {
      setAddressError("Address must start with 0x and be 42 characters");
      return;
    }
    if (!preview) {
      setPreview(true);
      return;
    }
    handleDeploy();
  }

  const initialForm = {
    partyB: "",
    statement: "",
    guidelines: "",
    evidenceDeadlineHours: "24",
    escrowAmount: "0",
    joinDeadlineHours: "72",
    evidenceTypesA: "text, json",
    evidenceMaxCharsA: "10000",
    evidenceConstraintsA: "",
    evidenceTypesB: "text, json",
    evidenceMaxCharsB: "10000",
    evidenceConstraintsB: "",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center gap-3 flex-wrap">
        <h1 className="font-heading text-4xl md:text-5xl tracking-[-0.96px] leading-[1.2]">Create Contract</h1>
        <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">Creates on Base Sepolia</span>
      </div>

      {/* Success state */}
      {deploy.step === "success" && (
        <Card className="border-green-500/30">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h2 className="text-xl font-bold">Case Created</h2>
            <p className="font-mono text-sm text-muted-foreground">
              Case ID: {deploy.caseId}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => router.push(`/cases/${deploy.caseId}`)}
              >
                View Case
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDeploy({ step: "idle" });
                  setPreview(false);
                  setForm(initialForm);
                }}
              >
                Create Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deploy form */}
      {deploy.step !== "success" && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Party B Address
                </label>
                <p className="mb-1 text-xs text-muted-foreground">
                  The counterparty&apos;s wallet address on Base
                </p>
                <Input
                  name="partyB"
                  placeholder="0x..."
                  value={form.partyB}
                  onChange={handleChange}
                  required
                  disabled={preview}
                  className={`font-mono ${addressError ? "border-red-400" : ""}`}
                />
                {addressError && (
                  <p className="mt-1 text-xs text-red-500">{addressError}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Statement
                </label>
                <p className="mb-1 text-xs text-muted-foreground">
                  A claim to evaluate as true/false
                </p>
                <Textarea
                  name="statement"
                  placeholder="Agent B delivered a complete security audit per the agreed scope."
                  value={form.statement}
                  onChange={handleChange}
                  required
                  rows={3}
                  disabled={preview}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Guidelines
                </label>
                <p className="mb-1 text-xs text-muted-foreground">
                  Rules for how the AI jury should evaluate the statement
                </p>
                <Textarea
                  name="guidelines"
                  placeholder="Evaluate whether the audit covers: OWASP Top 10, bypass vectors, and session management."
                  value={form.guidelines}
                  onChange={handleChange}
                  required
                  rows={3}
                  disabled={preview}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Escrow Amount (USDC)
                  </label>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Funds locked in escrow (0 = no escrow)
                  </p>
                  <Input
                    name="escrowAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.escrowAmount}
                    onChange={handleChange}
                    disabled={preview}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Join Deadline (hours)
                  </label>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Time for Party B to accept (0 = no deadline)
                  </p>
                  <Input
                    name="joinDeadlineHours"
                    type="number"
                    min="0"
                    step="1"
                    value={form.joinDeadlineHours}
                    onChange={handleChange}
                    disabled={preview}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Evidence Deadline (hours)
                  </label>
                  <p className="mb-1 text-xs text-muted-foreground">
                    After dispute for evidence (0 = no deadline)
                  </p>
                  <Input
                    name="evidenceDeadlineHours"
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.evidenceDeadlineHours}
                    onChange={handleChange}
                    disabled={preview}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Evidence Definitions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Party A (you)</h4>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Allowed types (comma-separated)
                    </label>
                    <Input
                      name="evidenceTypesA"
                      value={form.evidenceTypesA}
                      onChange={handleChange}
                      disabled={preview}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Max characters
                    </label>
                    <Input
                      name="evidenceMaxCharsA"
                      type="number"
                      value={form.evidenceMaxCharsA}
                      onChange={handleChange}
                      disabled={preview}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Constraints
                    </label>
                    <Input
                      name="evidenceConstraintsA"
                      placeholder="Must include the original task specification"
                      value={form.evidenceConstraintsA}
                      onChange={handleChange}
                      disabled={preview}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Party B</h4>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Allowed types (comma-separated)
                    </label>
                    <Input
                      name="evidenceTypesB"
                      value={form.evidenceTypesB}
                      onChange={handleChange}
                      disabled={preview}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Max characters
                    </label>
                    <Input
                      name="evidenceMaxCharsB"
                      type="number"
                      value={form.evidenceMaxCharsB}
                      onChange={handleChange}
                      disabled={preview}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Constraints
                    </label>
                    <Input
                      name="evidenceConstraintsB"
                      placeholder="Must include the actual deliverable"
                      value={form.evidenceConstraintsB}
                      onChange={handleChange}
                      disabled={preview}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error state */}
          {deploy.step === "error" && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Creation failed</p>
                <p className="mt-1 text-xs opacity-80">{deploy.message}</p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {deploy.step === "loading" && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              {deploy.status}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {preview && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPreview(false);
                  setDeploy({ step: "idle" });
                }}
                disabled={deploy.step === "loading"}
              >
                Edit
              </Button>
            )}
            <Button
              type="submit"
              disabled={deploy.step === "loading"}
            >
              {deploy.step === "loading" ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  Creating...
                </>
              ) : preview ? (
                "Create Case"
              ) : (
                "Preview"
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
