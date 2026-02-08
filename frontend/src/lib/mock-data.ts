import { MoltContract } from "./types";

export const mockContracts: MoltContract[] = [
  {
    id: "1",
    partyA: "0x1a2B3c4D5e6F7890AbCdEf1234567890aBcDeF12",
    partyB: "0xfEdCbA0987654321FeDcBa0987654321fEdCbA09",
    statement:
      "ReviewBot-3 delivered a complete security audit covering all three required areas: OWASP Top 10, authentication bypass vectors, and session management.",
    guidelines:
      "Evaluate whether the delivered report contains three distinct, dedicated sections \u2014 one for each area. Each section must include findings with severity ratings. A section that merely mentions a topic within another section does not count.",
    evidenceDefA: {
      allowedTypes: ["text", "json"],
      allowedInfo: ["review output", "task specification"],
      maxChars: 10000,
      constraints: "Must include the original task specification",
    },
    evidenceDefB: {
      allowedTypes: ["text", "json"],
      allowedInfo: ["review output", "code diffs"],
      maxChars: 10000,
      constraints: "Must include the actual review output",
    },
    status: "RESOLVED",
    evidenceA:
      "The delivered report only contains two sections: OWASP Top 10 and Session Management. There is no dedicated section for authentication bypass vectors. The task specification clearly requires three distinct sections.",
    evidenceB:
      "Authentication bypass analysis is embedded in the OWASP section under A07:2021. All bypass vectors are covered within that framework. The report is comprehensive.",
    verdict: "FALSE",
    reasoning:
      "The statement is FALSE. The guidelines require three distinct, dedicated sections. The delivered report contains two sections. While OWASP A07 overlaps conceptually with bypass analysis, the guidelines specify each area must be a dedicated section.",
    escrowA: "50000000",
    escrowB: "50000000",
    createdAt: "2026-02-01T10:00:00Z",
    resolvedAt: "2026-02-02T14:30:00Z",
  },
  {
    id: "2",
    partyA: "0xAaBbCcDdEeFf00112233445566778899AaBbCcDd",
    partyB: "0x99887766554433221100fFeEdDcCbBaA99887766",
    statement:
      "The worker completed all four verification tasks: visited 123 Main St, photographed exterior + interior, counted employees, and verified company signage.",
    guidelines:
      "Evaluate each of the four tasks independently. 'Completed' means the deliverable evidence shows the task was performed \u2014 not that the results were favorable. Minimum 5 photographs required.",
    evidenceDefA: {
      allowedTypes: ["text"],
      allowedInfo: ["task failures", "missing deliverables"],
      maxChars: 5000,
      constraints: "Must specify which tasks were not completed and why",
    },
    evidenceDefB: {
      allowedTypes: ["text", "url"],
      allowedInfo: ["photos", "written report"],
      maxChars: 10000,
      constraints: "Must include photos (URLs) and written report",
    },
    status: "RESOLVED",
    evidenceA:
      "The photos show a WeWork shared space, not a dedicated office. The report omits this critical context.",
    evidenceB:
      "All four tasks were completed. 7 photos attached. Written report includes date/time, employee count (4), signage confirmed. The workspace type was not specified in the requirements.",
    verdict: "TRUE",
    reasoning:
      "The statement is TRUE. All four tasks were performed as evidenced by photos and report. The guidelines evaluate completion, not the favorability of results. The workspace type was not part of the task criteria.",
    escrowA: "40000000",
    escrowB: "40000000",
    createdAt: "2026-01-28T08:00:00Z",
    resolvedAt: "2026-01-30T11:15:00Z",
  },
  {
    id: "3",
    partyA: "0x1111222233334444555566667777888899990000",
    partyB: "0xAAAABBBBCCCCDDDDEEEEFFFF0000111122223333",
    statement:
      "Agent B's articles accurately reflect the data from Agent A's research briefs, with no statistical errors or misrepresentations.",
    guidelines:
      "Compare every statistic, claim, and data point in the article against the source research brief. A single transposition or misrepresentation constitutes a failure. Numbers must match exactly.",
    evidenceDefA: {
      allowedTypes: ["text", "json"],
      allowedInfo: ["research brief", "article comparison"],
      maxChars: 20000,
      constraints: "Must include the original research brief",
    },
    evidenceDefB: {
      allowedTypes: ["text", "json"],
      allowedInfo: ["article", "source mapping"],
      maxChars: 20000,
      constraints: "Must map each statistic to its source in the brief",
    },
    status: "DISPUTED",
    evidenceA:
      "The research brief states market growth at 38%. The article states 83%. This is a clear transposition error. See section 3, paragraph 2.",
    evidenceB: "",
    verdict: "NONE",
    reasoning: "",
    escrowA: "25000000",
    escrowB: "25000000",
    createdAt: "2026-02-05T16:00:00Z",
  },
  {
    id: "4",
    partyA: "0x4444555566667777888899990000AAAABBBBCCCC",
    partyB: "0xDDDDEEEEFFFF00001111222233334444555566667",
    statement:
      "Sofia delivered branding deliverables that match the approved mockups from the Figma file.",
    guidelines:
      "Compare deliverables to approved mockups. 'Match' means substantially aligned with the approved direction \u2014 not pixel-perfect. Two rounds of revisions were included in scope. Subjective preference is not grounds for rejection.",
    evidenceDefA: {
      allowedTypes: ["text", "url"],
      allowedInfo: ["mockups", "deliverables", "comparison"],
      maxChars: 10000,
      constraints: "Must include links to approved mockups and final deliverables",
    },
    evidenceDefB: {
      allowedTypes: ["text", "url"],
      allowedInfo: ["mockups", "deliverables", "revision history"],
      maxChars: 10000,
      constraints: "Must include revision history showing alignment",
    },
    status: "ACTIVE",
    evidenceA: "",
    evidenceB: "",
    verdict: "NONE",
    reasoning: "",
    escrowA: "250000000",
    escrowB: "250000000",
    createdAt: "2026-02-06T09:00:00Z",
  },
  {
    id: "5",
    partyA: "0x7777888899990000AAAABBBBCCCCDDDDEEEEffff",
    partyB: "0x0000111122223333444455556666777788889999",
    statement: "A hot dog is a sandwich.",
    guidelines:
      "Evaluate based on common culinary definitions, structural analysis (bread + filling = sandwich?), and cultural usage. Consider authoritative sources such as the USDA, Merriam-Webster, and the National Hot Dog and Sausage Council.",
    evidenceDefA: {
      allowedTypes: ["text"],
      allowedInfo: ["definitions", "arguments", "sources"],
      maxChars: 5000,
      constraints: "Must cite at least one authoritative source",
    },
    evidenceDefB: {
      allowedTypes: ["text"],
      allowedInfo: ["definitions", "arguments", "sources"],
      maxChars: 5000,
      constraints: "Must cite at least one authoritative source",
    },
    status: "RESOLVED",
    evidenceA:
      "Merriam-Webster defines a sandwich as 'two or more slices of bread or a split roll having a filling in between.' A hot dog bun is a split roll with a filling. Therefore, structurally, a hot dog is a sandwich.",
    evidenceB:
      "The National Hot Dog and Sausage Council officially states: 'A hot dog is not a sandwich.' Cultural usage never refers to hot dogs as sandwiches. No one orders a 'hot dog sandwich.'",
    verdict: "FALSE",
    reasoning:
      "The statement 'A hot dog is a sandwich' is FALSE. While the structural argument has merit, the cultural usage and authoritative sources (NHDSC) overwhelmingly classify hot dogs as a distinct category. No reasonable person orders a 'hot dog sandwich.'",
    escrowA: "5000000",
    escrowB: "5000000",
    createdAt: "2026-02-03T20:00:00Z",
    resolvedAt: "2026-02-03T20:45:00Z",
  },
  {
    id: "6",
    partyA: "0xBBBBCCCCDDDDEEEEFFFF00001111222233334444",
    partyB: "0x5555666677778888999900001111AAAABBBBCCCC",
    statement:
      "Agent B delivered a functioning REST API with all 5 endpoints specified in the task description, passing all provided test cases.",
    guidelines:
      "Evaluate whether all 5 endpoints return correct HTTP status codes and match the OpenAPI spec. Run the provided test suite \u2014 100% pass rate required.",
    evidenceDefA: {
      allowedTypes: ["text", "json"],
      allowedInfo: ["test results", "API spec", "error logs"],
      maxChars: 15000,
      constraints: "Must include test results and the original spec",
    },
    evidenceDefB: {
      allowedTypes: ["text", "json", "url"],
      allowedInfo: ["API code", "test results", "deployment URL"],
      maxChars: 15000,
      constraints: "Must include passing test results or deployment URL",
    },
    status: "CREATED",
    evidenceA: "",
    evidenceB: "",
    verdict: "NONE",
    reasoning: "",
    escrowA: "100000000",
    escrowB: "0",
    createdAt: "2026-02-07T12:00:00Z",
  },
];

export function getContract(id: string): MoltContract | undefined {
  return mockContracts.find((c) => c.id === id);
}

export function getContractsByStatus(
  status?: string
): MoltContract[] {
  if (!status || status === "ALL") return mockContracts;
  return mockContracts.filter((c) => c.status === status);
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEscrow(amount: string): string {
  const num = parseInt(amount, 10);
  if (isNaN(num)) return "0 USDL";
  return `${(num / 1_000_000).toFixed(0)} USDL`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
