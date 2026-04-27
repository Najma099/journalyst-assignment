import { TradeSchema, type Trade } from "../../schema/broker-trade.js";
import { Broker, type ParseResult } from "../../types/broker.js";
import { parseCsvRows } from "../../utils/csv-utils.js";

const BROKER_NAME = Broker.IBKR;

/**
 * IBKR uses two date formats:
 *   - ISO 8601 with timezone:  2026-04-01T14:30:00Z   → use as-is
 *   - MM/DD/YYYY (no time):    04/03/2026             → treat as UTC midnight
 */
function parseIbkrDate(raw: string): string {
  const trimmed = raw.trim();

  // Already ISO 8601 with timezone
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) throw new Error(`Invalid ISO date: '${raw}'`);
    return d.toISOString();
  }

  // MM/DD/YYYY fallback
  const mdyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, mm, dd, yyyy] = mdyMatch;
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    if (isNaN(d.getTime())) throw new Error(`Invalid date: '${raw}'`);
    return d.toISOString();
  }

  throw new Error(`Unrecognized date format: '${raw}'`);
}

/**
 * IBKR uses BOT (bought) and SLD (sold).
 */
function normalizeSide(raw: string): "BUY" | "SELL" {
  const upper = raw.trim().toUpperCase();
  if (upper === "BOT") return "BUY";
  if (upper === "SLD") return "SELL";
  throw new Error(`Unrecognized Buy/Sell value: '${raw}'`);
}

/**
 * IBKR represents forex pairs with a dot: EUR.USD → EUR/USD
 */
function normalizeSymbol(raw: string): string {
  return raw.trim().replace(".", "/");
}

export function parseIbkrRow(
  raw: Record<string, string>,
  rowIndex: number
): ParseResult {
  try {
    const symbol = normalizeSymbol(raw["Symbol"] ?? "");
    if (!symbol) throw new Error("Missing Symbol");

    const side = normalizeSide(raw["Buy/ Sell"] ?? raw["Buy/Sell"] ?? "");

    const quantity = parseFloat(raw["Quantity"] ?? "");
    if (!isFinite(quantity)) throw new Error("Missing or invalid Quantity");
    if (quantity <= 0) throw new Error(`Quantity must be positive, got ${quantity}`);

    const price = parseFloat(raw["TradePrice"] ?? "");
    if (!isFinite(price) || price <= 0) throw new Error("Missing or invalid TradePrice");

    const currency = raw["Currency"]?.trim();
    if (!currency || currency.length !== 3) throw new Error(`Invalid currency: '${currency}'`);

    const executedAt = parseIbkrDate(raw["DateTime"] ?? "");

    // For sells the total flows out, so we negate
    const totalAmount = side === "SELL" ? -(quantity * price) : quantity * price;

    const trade = TradeSchema.parse({
      symbol,
      side,
      quantity,
      price,
      totalAmount,
      currency,
      executedAt,
      broker: BROKER_NAME,
      rawData: raw,
    } satisfies Trade);

    return { ok: true, trade, rowIndex };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { ok: false, rowIndex, reason };
  }
}

export function parseIbkr(csvText: string): ParseResult[] {
  const rows = parseCsvRows(csvText);
  return rows.map((raw, idx) => parseIbkrRow(raw, idx + 2)); // +2: 1-based + header row
}
