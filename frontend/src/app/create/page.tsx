"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CreatePage() {
  const [form, setForm] = useState({
    partyB: "",
    statement: "",
    guidelines: "",
    evidenceTypesA: "text, json",
    evidenceMaxCharsA: "10000",
    evidenceConstraintsA: "",
    evidenceTypesB: "text, json",
    evidenceMaxCharsB: "10000",
    evidenceConstraintsB: "",
  });

  const [preview, setPreview] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) {
      setPreview(true);
      return;
    }
    alert(
      "Contract creation will be available when blockchain integration is connected. This is a preview."
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold">Create Contract</h1>

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
              <Input
                name="partyB"
                placeholder="0x..."
                value={form.partyB}
                onChange={handleChange}
                required
                disabled={preview}
              />
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

          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Evidence Definitions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Party A</h4>
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

        <div className="mt-6 flex gap-3">
          {preview && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreview(false)}
            >
              Edit
            </Button>
          )}
          <Button type="submit">
            {preview ? "Deploy Contract" : "Preview"}
          </Button>
        </div>
      </form>
    </div>
  );
}
