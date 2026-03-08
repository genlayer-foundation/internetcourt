/**
 * Static GenLayer oracle metadata for known TradeFx and Agreement cases.
 *
 * This file serves as a fallback when RELAY_BASE_URL is not configured in
 * the Vercel environment. It contains real on-chain oracle data fetched
 * from GenLayer studionet via eth_getTransactionByHash + gen_call.
 *
 * To add future cases: either configure RELAY_BASE_URL (preferred) or
 * append entries here.
 *
 * Sources:
 *   - Oracle verdicts: gen_call → error.data.receipt.contract_state (base64 decoded)
 *   - Tx hashes: EvmToGenLayer relay data/genlayer.json
 *   - Explorer: https://explorer-studio.genlayer.com/transactions/<oracleTxHash>
 */

export interface GlOracleMeta {
  /** GenLayer deploy tx hash for the oracle contract */
  oracleTxHash: string;
  /** Oracle contract address on GenLayer studionet */
  oracleAddress: string;
  /** Verdict string: "TIMELY" | "LATE" | "UNDETERMINED" | null */
  verdict: string | null;
  /** AI jury reasoning */
  reasoning: string | null;
  /** Unix timestamp when oracle was finalized */
  timestamp: number;
  /** Validator votes summary */
  validators?: {
    agree: number;
    disagree: number;
  };
}

/**
 * Map from lowercase agreement/settlement contract address → GL oracle metadata.
 */
const GL_ORACLE_META: Record<string, GlOracleMeta> = {
  // ── TradeFx Scenario A — TIMELY (settled to exporter) ─────────────────────
  // icCaseId = 3 | TradeFxSettlement: 0xb4700D67d6cBeF18011021A2A20389ea88753234
  "0xb4700d67d6cbef18011021a2a20389ea88753234": {
    oracleTxHash:  "0x96fd014f7d806ce228525524987575cb8b136ccf323c79d15bd5c1e23ba3be2b",
    oracleAddress: "0x2293B52CdA2940CBD9EFB60d29B88C5Da53FbedE",
    verdict:       "TIMELY",
    reasoning:
      "Both documents show crossing on 2026-04-05 before the deadline of " +
      "23:59:59 -04:00: ANB customs exit at 22:41:00 -04:00 and SUNAT border " +
      "gate event at 23:12:00 -04:00, both matching truck plate 3456-BP.",
    timestamp: 1772924907,
    validators: { agree: 4, disagree: 1 },
  },

  // ── TradeFx Scenario B — LATE (cancelled, importer refunded) ──────────────
  // icCaseId = 4 | TradeFxSettlement: 0xbd0dB046A913817522B595CFEb922D5E2aad4268
  "0xbd0db046a913817522b595cfeb922d5e2aad4268": {
    oracleTxHash:  "0xc7302e49a80e1997e43fffa7fb2d8b3c2ca9d93e1a8e61d5b73da25d63e5d3aa",
    oracleAddress: "0x435b82AE459Cae242B1C2097034D9d98d3bB5E29",
    verdict:       "LATE",
    reasoning:
      "For contract ISPA-2025-BOL-PER-0047 with a deadline of 2026-04-05 23:59 -04:00, " +
      "both customs records in the court sheet images show the truck and containers " +
      "crossing Bolivian export customs at Desaguadero on 2026-04-06 " +
      "(ANB record: 02:15 -04:00; SUNAT record: 02:47 -04:00), " +
      "which is after the contractual deadline.",
    timestamp: 1772924988,
    validators: { agree: 4, disagree: 1 },
  },

  // ── TradeFx Scenario C — UNDETERMINED (manual review) ─────────────────────
  // icCaseId = 5 | TradeFxSettlement: 0xe50A8F382B3B751dBd7053963EbaBB59916f3788
  "0xe50a8f382b3b751dbd7053963ebabb59916f3788": {
    oracleTxHash:  "0x9bcb2b9855eaf90d34175796c0a18569fb9e4bf81869dce98044d27f35846aab",
    oracleAddress: "0xb7CC51a5A0D931B04eB07285224e7D52Ee295E48",
    verdict:       "UNDETERMINED",
    reasoning:
      "The truck plate numbers do not match between documents (2291-AKL vs 8834-FMX) " +
      "and the importer's timestamp is unreadable due to ink degradation.",
    timestamp: 1772925100,
    validators: { agree: 4, disagree: 1 },
  },

  // ── Agent-dispute cases (v2 factory, no shipment verdict) ─────────────────
  "0x778e3528940849432619142a8d7ac172486353bf": {
    oracleTxHash:  "0x1b21b3e20174bb368fdb99987ac73f2f655135c1c450fb2c07fec1765d6e68bf",
    oracleAddress: "0x642868AA85d97A17ab50453EA00198F342099aB5",
    verdict:       null,
    reasoning:     null,
    timestamp:     1772922365,
  },
  "0xab772bb1d873ed851b6f1150100f085b36a1ca02": {
    oracleTxHash:  "0xb8770b9c3fe2a47b70168a61b3f6ceb3dc6ecfcb489f1e1900d40c176a692662",
    oracleAddress: "0x8E0F0FB7C3F30f973a85676Ff8cEea3deeAC22Ae",
    verdict:       null,
    reasoning:     null,
    timestamp:     1772922431,
  },
  "0x43fcbf7fa4a1c8d6ca648fad163636b20bcee233": {
    oracleTxHash:  "0xefa4d5eb8bc737991e37b2ef4e4f54bf8a1b22105509b11407ce6026a29cc1de",
    oracleAddress: "0xb3C932a291D195D9221E3A7A2F9255e8312a3B1D",
    verdict:       null,
    reasoning:     null,
    timestamp:     1772922702,
  },
};

/**
 * Look up static GL oracle metadata for a case/settlement contract address.
 * Returns null if no entry found.
 */
export function getGlOracleMeta(agreementAddress: string): GlOracleMeta | null {
  return GL_ORACLE_META[agreementAddress.toLowerCase()] ?? null;
}
