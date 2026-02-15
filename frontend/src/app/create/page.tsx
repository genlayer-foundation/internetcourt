"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import {
  createBrowserClient,
  deployAndRegister,
} from "@/lib/genlayer-client";
import { addTrackedAddress } from "@/lib/contract-store";
import { isValidAddress } from "@/lib/constants";

type DeployState =
  | { step: "idle" }
  | { step: "loading"; status: string }
  | { step: "success"; address: string }
  | { step: "error"; message: string };

export default function CreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    partyB: "",
    statement: "",
    guidelines: "",
    evidenceDeadlineHours: "24",
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
      setDeploy({ step: "loading", status: "Connecting wallet..." });

      // Request MetaMask account
      const provider =
        typeof window !== "undefined"
          ? (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
          : undefined;
      if (!provider) {
        throw new Error(
          "No wallet found. Please install MetaMask and connect to GenLayer studionet (chain 61999)."
        );
      }

      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (!accounts || accounts.length === 0) {
        throw new Error("No account connected");
      }

      // Verify chain ID
      const chainIdHex = (await provider.request({
        method: "eth_chainId",
      })) as string;
      const chainId = parseInt(chainIdHex, 16);
      if (chainId !== 61999) {
        // Try to switch to GenLayer studionet
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xF21F" }],
          });
        } catch {
          // Chain not added, try to add it
          try {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0xF21F",
                  chainName: "GenLayer Studionet",
                  rpcUrls: ["https://studio.genlayer.com/api"],
                  nativeCurrency: {
                    name: "GEN Token",
                    symbol: "GEN",
                    decimals: 18,
                  },
                },
              ],
            });
          } catch {
            throw new Error(
              "Please switch your wallet to GenLayer studionet (chain 61999)"
            );
          }
        }
      }

      const account = accounts[0] as `0x${string}`;
      const client = createBrowserClient(account);

      setDeploy({ step: "loading", status: "Fetching contract code..." });

      const codeRes = await fetch("/api/contract-code");
      const codeData = await codeRes.json();
      if (!codeData.code) {
        throw new Error("Could not fetch contract code");
      }

      const deadlineSeconds =
        Math.round(parseFloat(form.evidenceDeadlineHours) * 3600) || 0;

      const result = await deployAndRegister(
        client,
        codeData.code,
        {
          partyB: form.partyB,
          statement: form.statement,
          guidelines: form.guidelines,
          evidenceDefs: buildEvidenceDefs(),
          evidenceDeadlineSeconds: deadlineSeconds,
        },
        (status) => setDeploy({ step: "loading", status }),
      );

      // Track the newly deployed contract
      addTrackedAddress(result.contractAddress);

      setDeploy({ step: "success", address: result.contractAddress });
    } catch (err) {
      setDeploy({
        step: "error",
        message: err instanceof Error ? err.message : "Deployment failed",
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center gap-3 flex-wrap">
        <h1 className="font-heading text-4xl md:text-5xl tracking-[-0.96px] leading-[1.2]">Create Contract</h1>
        <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">Deploys to GenLayer Studionet</span>
      </div>

      {/* Success state */}
      {deploy.step === "success" && (
        <Card className="border-green-500/30">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <h2 className="text-xl font-bold">Contract Deployed</h2>
            <p className="font-mono text-sm text-muted-foreground break-all">
              {deploy.address}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => router.push(`/cases/${deploy.address}`)}
              >
                View Case
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDeploy({ step: "idle" });
                  setPreview(false);
                  setForm({
                    partyB: "",
                    statement: "",
                    guidelines: "",
                    evidenceDeadlineHours: "24",
                    evidenceTypesA: "text, json",
                    evidenceMaxCharsA: "10000",
                    evidenceConstraintsA: "",
                    evidenceTypesB: "text, json",
                    evidenceMaxCharsB: "10000",
                    evidenceConstraintsB: "",
                  });
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
                  The counterparty&apos;s GenLayer address
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

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Evidence Deadline
                </label>
                <p className="mb-1 text-xs text-muted-foreground">
                  Hours after dispute for evidence submission (0 = no deadline)
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
                <p className="font-medium">Deployment failed</p>
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
                  Deploying...
                </>
              ) : preview ? (
                "Deploy Contract"
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
