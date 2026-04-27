import type { ImportResponse, ParseResult } from "../../types/broker.js";
import { detectBroker } from "./detect-broker.js";

/**
 * Core service function: takes raw CSV text and returns a fully-structured ImportResponse.
 */
export function extractBrokerCSV(csvText: string): ImportResponse {
  const trimmed = csvText.trim();

  if (!trimmed) {
    throw new Error("Empty file: no CSV content provided.");
  }

  // Throws if format is unrecognized
  const broker = detectBroker(trimmed);

  const results: ParseResult[] = broker.parse(trimmed);

  const trades = results
    .filter((r): r is Extract<ParseResult, { ok: true }> => r.ok)
    .map((r) => r.trade);

  const errors = results
    .filter((r): r is Extract<ParseResult, { ok: false }> => !r.ok)
    .map((r) => ({ row: r.rowIndex, reason: r.reason }));

  return {
    broker: broker.name,
    summary: {
      total: results.length,
      valid: trades.length,
      skipped: errors.length,
    },
    trades,
    errors,
  };
}
